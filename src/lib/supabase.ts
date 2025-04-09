
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)

export type Todo = {
  id: string
  user_id: string
  title: string
  is_complete: boolean
  category: 'personal' | 'work' | 'shopping' | 'health' | 'other'
  time_estimate?: '5min' | '10min' | '15min' | '20min' | '30min' | '45min' | 
                  '1hr' | '1.5hrs' | '2hrs' | '2.5hrs' | '3hrs' | '4hrs' | '5hrs' | 
                  '6hrs' | '8hrs' | '1day' | '2days' | '3days' | '1week'
  due_date: string | null
  created_at: string
  updated_at?: string
}