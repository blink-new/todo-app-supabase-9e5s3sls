
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.user?.identities?.length === 0) {
          toast.error('This email is already registered. Please sign in instead.')
          setIsSignUp(false)
          return
        }

        toast.success('Check your email to confirm your signup!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            toast.error('Please confirm your email first')
          } else if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password')
          } else {
            throw error
          }
          return
        }

        toast.success('Successfully logged in!')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      toast.error(error.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-sm text-gray-500">
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-white"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-white"
              minLength={6}
            />
          </div>

          <Button 
            className="w-full" 
            type="submit" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? 'Signing up...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Sign Up' : 'Sign In'
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setEmail('')
              setPassword('')
            }}
            className="text-sm text-blue-600 hover:underline"
            disabled={loading}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </Card>
    </div>
  )
}