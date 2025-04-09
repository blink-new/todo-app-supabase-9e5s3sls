
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AuthForm } from '@/components/auth/AuthForm'
import { TodoLayout } from '@/components/todo/TodoLayout'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function AuthLayout() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setError(error.message)
          toast.error(`Authentication error: ${error.message}`)
        } else {
          setSession(data.session)
        }
      } catch (err: any) {
        console.error('Unexpected error during authentication:', err)
        setError(err.message || 'Authentication failed')
        toast.error(`Authentication error: ${err.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event)
        setSession(session)
        
        if (event === 'SIGNED_IN') {
          toast.success('Signed in successfully!')
        } else if (event === 'SIGNED_OUT') {
          toast.success('Signed out successfully!')
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-red-600">Authentication Error</h1>
            <p className="text-sm text-muted-foreground">
              There was a problem connecting to the authentication service. Please try again.
            </p>
          </div>
          <div className="mt-6">
            <AuthForm />
          </div>
        </div>
      </div>
    )
  }

  return session ? (
    <TodoLayout />
  ) : (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        <AuthForm />
      </div>
    </div>
  )
}