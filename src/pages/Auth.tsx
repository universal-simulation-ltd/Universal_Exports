import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Chip } from '@unisim/sdk'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import logo from '@/assets/universal-exports-logo.svg'
import iconWhite from '@/assets/universal-exports-icon-white.svg'
import BrandFooter from '@/components/BrandFooter'
import { fillNodes } from '@/lib/i18n/format'
import { useDrafterI18n } from '@/lib/i18n/drafter/useDrafterI18n'

export default function Auth() {
  const { t, tf } = useDrafterI18n()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // No Companies House number at sign-up (2026-10-10): a Universal ID is free
  // for anyone, and so is starting a deal. The number — with the live lookup
  // that used to sit here — is asked for in Your details, and the Export
  // Agreement checklist requires it before the agreement can be generated,
  // because the agreements are for a UK importer or exporter.

  // Shown after a sign-in attempt fails because the email isn't confirmed yet,
  // or after a sign-up — lets the user re-trigger the confirmation email.
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)

  const { signIn, signUp, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // ProtectedRoute stashes the navigation state it intercepted (e.g. the
  // project name typed on the landing page) so we can restore it after sign-in.
  const appState = (location.state as { appState?: unknown } | null)?.appState

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) {
        toast.error(error.message)
        // Supabase reports an unconfirmed address as "Email not confirmed" —
        // surface the resend option so the user isn't stuck.
        if (/confirm/i.test(error.message)) setShowResend(true)
      } else {
        navigate('/app', { state: appState })
      }
    } else {
      const { error } = await signUp(email, password, {
        signup_product: 'exports',
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success(tf('auth.created', { email }), { duration: 8000 })
        setMode('signin')
        setShowResend(true)
      }
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error(t('auth.enterEmailFirst'))
      return
    }
    setResending(true)
    const { error } = await resendConfirmation(email.trim())
    setResending(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(tf('auth.resent', { email }), { duration: 8000 })
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setShowResend(false)
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <img src={iconWhite} alt={t('auth.iconAlt')} className="h-9 w-9 object-contain" />
          </div>
          <img src={logo} alt="Universal Exports" className="h-10 object-contain" />
        </div>

        {/* Free-for-UK-businesses badge — shown in both modes so it's the
            first thing anyone sees on the sign-in page. */}
        <div className="flex justify-center">
          <Chip icon={<span>🇬🇧</span>}>{t('auth.freeBadge')}</Chip>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card shadow-xs p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mode === 'signin' ? t('auth.signIn') : t('auth.createTitle')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signin' ? t('auth.signInIntro') : t('auth.signUpIntro')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="text-sm font-medium text-foreground block mb-1">{t('field.email')}</label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="text-sm font-medium text-foreground block mb-1">{t('auth.password')}</label>
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading
                ? mode === 'signin' ? t('auth.signingIn') : t('auth.creating')
                : mode === 'signin' ? t('auth.signIn') : t('auth.createId')}
            </Button>
          </form>

          {mode === 'signin' && (
            <div className={showResend ? 'rounded-md border border-border bg-secondary/40 p-3' : ''}>
              <p className="text-xs text-muted-foreground">
                {showResend ? t('auth.notConfirmed') : t('auth.didntGet')}{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary underline-offset-4 hover:underline font-medium disabled:opacity-60"
                >
                  {resending ? t('auth.sending') : t('auth.resend')}
                </button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground">
              {fillNodes(t('auth.signUpNote'), {
                link: (
                  <a
                    href="https://www.gov.uk/limited-company-formation/register-your-company"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {t('auth.register')}
                  </a>
                ),
              })}
            </p>
          )}

          <p className="text-sm text-center text-muted-foreground">
            {mode === 'signin' ? t('auth.noId') : t('auth.haveId')}{' '}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline font-medium"
              onClick={switchMode}
            >
              {mode === 'signin' ? t('auth.createFree') : t('auth.signIn')}
            </button>
          </p>
        </div>

        <BrandFooter variant="auth" className="pt-2" />
      </div>
    </div>
  )
}
