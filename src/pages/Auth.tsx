import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import logo from '@/assets/universal-exports-logo.svg'
import iconWhite from '@/assets/universal-exports-icon-white.svg'
import BrandFooter from '@/components/BrandFooter'

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) {
        toast.error(error.message)
      } else {
        navigate('/app')
      }
    } else {
      const { error } = await signUp(email, password)
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Account created! Please check your email to confirm your account.')
        setMode('signin')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <img src={iconWhite} alt="Universal Exports icon" className="h-9 w-9 object-contain" />
          </div>
          <img src={logo} alt="Universal Exports" className="h-10 object-contain" />
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signin'
                ? 'Welcome back to Universal Exports'
                : 'Start managing your Export Agreement documents'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                : mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline font-medium"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <BrandFooter variant="auth" className="pt-2" />
      </div>
    </div>
  )
}
