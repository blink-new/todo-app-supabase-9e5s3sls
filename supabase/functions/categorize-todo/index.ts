
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader || '' 
          } 
        } 
      }
    )
    
    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    // If JWT verification is enabled but no user was found, return 401
    if (!user && Deno.env.get('SUPABASE_FUNCTION_VERIFY_JWT') === 'true') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'User is not authenticated' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    // Parse the request body
    const { title } = await req.json()

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    // Define valid categories
    const categories = ['personal', 'work', 'shopping', 'health', 'other']

    // Call OpenAI to categorize the todo
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a task categorization assistant. Categorize tasks into exactly one of these categories: ${categories.join(', ')}. Respond with only the category name, lowercase, no explanation.`
        },
        {
          role: "user",
          content: `Categorize this task: "${title}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 10,
    })

    // Extract the category from the response
    let category = response.choices[0]?.message?.content?.trim().toLowerCase() || 'other'
    
    // Ensure the category is one of our valid categories
    if (!categories.includes(category)) {
      category = 'other'
    }

    return new Response(
      JSON.stringify({ category }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error(error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})