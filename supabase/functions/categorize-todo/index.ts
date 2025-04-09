
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

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
    const { title } = await req.json()

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })
    const openai = new OpenAIApi(configuration)

    // Call OpenAI to categorize the todo
    const categories = ['personal', 'work', 'shopping', 'health', 'other']
    const prompt = `Categorize the following todo item into one of these categories: ${categories.join(', ')}.\n\nTodo: "${title}"\n\nCategory:`

    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo-instruct",
      prompt,
      max_tokens: 10,
      temperature: 0.3,
    })

    let category = completion.data.choices[0].text?.trim().toLowerCase() || 'other'
    
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