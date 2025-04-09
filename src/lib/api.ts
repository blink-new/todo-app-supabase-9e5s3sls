
import { supabase } from './supabase'

export async function categorizeTodo(title: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('categorize-todo', {
      body: { title },
    })

    if (error) throw error
    return data.category || 'other'
  } catch (error) {
    console.error('Error categorizing todo:', error)
    return 'other' // Default fallback
  }
}