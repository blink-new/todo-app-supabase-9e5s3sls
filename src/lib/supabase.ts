
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Todo = {
  id: string
  user_id: string
  title: string
  is_complete: boolean
  category: 'personal' | 'work' | 'shopping' | 'health' | 'other'
  due_date: string | null
  created_at: string
  updated_at: string
}