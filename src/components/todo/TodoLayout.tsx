
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TodoList } from '@/components/todo/TodoList'
import { TodoForm } from '@/components/todo/TodoForm'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function TodoLayout() {
  const [todos, setTodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    getUser()
  }, [])

  useEffect(() => {
    async function fetchTodos() {
      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        setTodos(data || [])
      } catch (error: any) {
        toast.error(`Error fetching todos: ${error.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchTodos()

    // Set up real-time subscription
    const channel = supabase
      .channel('todos-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          console.log('Change received!', payload)
          if (payload.eventType === 'INSERT') {
            setTodos((prev) => [payload.new as any, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTodos((prev) =>
              prev.map((todo) =>
                todo.id === payload.new.id ? (payload.new as any) : todo
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setTodos((prev) =>
              prev.filter((todo) => todo.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const addTodo = async (title: string) => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title, completed: false }])
        .select()

      if (error) {
        throw error
      }

      toast.success('Todo added successfully!')
    } catch (error: any) {
      toast.error(`Error adding todo: ${error.message}`)
    }
  }

  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed })
        .eq('id', id)

      if (error) {
        throw error
      }
    } catch (error: any) {
      toast.error(`Error updating todo: ${error.message}`)
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from('todos').delete().eq('id', id)

      if (error) {
        throw error
      }

      toast.success('Todo deleted successfully!')
    } catch (error: any) {
      toast.error(`Error deleting todo: ${error.message}`)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error: any) {
      toast.error(`Error signing out: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your todos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Todo App</h1>
          <div className="flex items-center gap-4">
            {user && (
              <p className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </p>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <TodoForm onAddTodo={addTodo} />
          <div className="mt-6">
            <TodoList
              todos={todos}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          </div>
        </div>
      </main>
    </div>
  )
}