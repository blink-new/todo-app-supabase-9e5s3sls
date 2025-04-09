
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Valid time estimates - using the exact ranges specified
const TIME_ESTIMATES = [
  '5min', '10min', '15min', '20min', '30min', '45min', 
  '1hr', '1.5hrs', '2hrs', '2.5hrs', '3hrs', '4hrs', '5hrs', 
  '6hrs', '8hrs', '1day', '2days', '3days', '1week'
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, description } = await req.json()

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
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    // Prepare the content for analysis
    const taskContent = description 
      ? `Title: ${title}\nDescription: ${description}` 
      : `Task: ${title}`

    // Call OpenAI to estimate time
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a task time estimation assistant. Your job is to estimate how long a task will take based on its description.
          
You MUST choose ONLY ONE of these specific time ranges:
- 5min, 10min, 15min, 20min, 30min, 45min (for short tasks)
- 1hr, 1.5hrs, 2hrs, 2.5hrs, 3hrs, 4hrs, 5hrs (for medium tasks)
- 6hrs, 8hrs, 1day, 2days, 3days, 1week (for long tasks)

Respond with ONLY the time estimate, no explanation or additional text.`
        },
        {
          role: "user",
          content: `Estimate how long this task will take: "${taskContent}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 10,
    })

    // Extract the time estimate from the response
    let timeEstimate = response.choices[0]?.message?.content?.trim().toLowerCase() || '30min'
    
    // Normalize the response to match our valid time estimates
    if (!TIME_ESTIMATES.includes(timeEstimate)) {
      // Try to match with some common variations
      if (timeEstimate.includes('hour') || timeEstimate.includes('hr')) {
        if (timeEstimate.includes('1') && !timeEstimate.includes('1.5')) timeEstimate = '1hr'
        else if (timeEstimate.includes('1.5') || timeEstimate.includes('1 and a half')) timeEstimate = '1.5hrs'
        else if (timeEstimate.includes('2') && !timeEstimate.includes('2.5')) timeEstimate = '2hrs'
        else if (timeEstimate.includes('2.5') || timeEstimate.includes('2 and a half')) timeEstimate = '2.5hrs'
        else if (timeEstimate.includes('3')) timeEstimate = '3hrs'
        else if (timeEstimate.includes('4')) timeEstimate = '4hrs'
        else if (timeEstimate.includes('5')) timeEstimate = '5hrs'
        else if (timeEstimate.includes('6')) timeEstimate = '6hrs'
        else if (timeEstimate.includes('8')) timeEstimate = '8hrs'
        else timeEstimate = '1hr'
      } else if (timeEstimate.includes('min')) {
        if (timeEstimate.includes('5') && !timeEstimate.includes('15') && !timeEstimate.includes('45')) timeEstimate = '5min'
        else if (timeEstimate.includes('10')) timeEstimate = '10min'
        else if (timeEstimate.includes('15')) timeEstimate = '15min'
        else if (timeEstimate.includes('20')) timeEstimate = '20min'
        else if (timeEstimate.includes('30')) timeEstimate = '30min'
        else if (timeEstimate.includes('45')) timeEstimate = '45min'
        else timeEstimate = '30min'
      } else if (timeEstimate.includes('day')) {
        if (timeEstimate.includes('1') && !timeEstimate.includes('2') && !timeEstimate.includes('3')) timeEstimate = '1day'
        else if (timeEstimate.includes('2')) timeEstimate = '2days'
        else if (timeEstimate.includes('3')) timeEstimate = '3days'
        else timeEstimate = '1day'
      } else if (timeEstimate.includes('week')) {
        timeEstimate = '1week'
      } else {
        // Default fallback
        timeEstimate = '30min'
      }
    }

    return new Response(
      JSON.stringify({ timeEstimate }),
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