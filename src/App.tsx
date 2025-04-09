
import { useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { AuthForm } from '@/components/auth/AuthForm'
import { TodoList } from '@/components/todo/TodoList'
import { supabase } from '@/lib/supabase'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
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