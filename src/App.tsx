
import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthForm } from '@/components/auth/AuthForm'
import { TodoList } from '@/components/todo/TodoList'
import { supabase } from '@/lib/supabase'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
    })
  }, [])

  if (isAuthenticated === null) {
    return null // Initial loading state
  }

  return (
    <>
      {isAuthenticated ? <TodoList /> : <AuthForm />}
      <Toaster />
    </>
  )
}

export default App