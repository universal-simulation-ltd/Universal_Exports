import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  lookupCompany,
  normalizeCompanyNumber,
  isValidCompanyNumber,
  formatCompanyAddress,
  type CompanyProfile,
} from '@/lib/companiesHouse'
import logo from '@/assets/universal-exports-logo.svg'
import iconWhite from '@/assets/universal-exports-icon-white.svg'
import BrandFooter from '@/components/BrandFooter'

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Sign-up gate: a UK Companies House number is required to create a
  // Universal ID. We look the number up live and ask the user to confirm
  // the company; if the lookup service is down we let them proceed with
  // just the number (verified = false in the metadata).
  const [companyNumber, setCompanyNumber] = useState('')
  const [company, setCompany] = useState<CompanyProfile | null>(null)
  const [lookupUnavailable, setLookupUnavailable] = useState(false)
  const [companyConfirmed, setCompanyConfirmed] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)

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

  const resetCompanyStep = () => {
    setCompany(null)
    setCompanyConfirmed(false)
    setLookupUnavailable(false)
  }

  const handleLookup = async () => {
    if (!isValidCompanyNumber(companyNumber)) {
      toast.error('Enter a valid Companies House number — 8 characters, e.g. 01234567 or SC123456.')
      return
    }
    setLookingUp(true)
    resetCompanyStep()
    const result = await lookupCompany(companyNumber)
    setLookingUp(false)

    if (result.ok) {
      setCompany(result.company)
    } else if (result.reason === 'not_found') {
      toast.error('No company found with that number. Check it on find-and-update.company-information.service.gov.uk.')
    } else if (result.reason === 'invalid_number') {
      toast.error('That doesn’t look like a valid company number.')
    } else {
      // Lookup service down (or API key not configured yet) — don't block
      // sign-up on it, fall back to taking the number on trust.
      setLookupUnavailable(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (mode === 'signup' && !companyConfirmed) {
      toast.error('Please confirm your company details first.')
      return
    }

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
        company_number: company?.company_number ?? normalizeCompanyNumber(companyNumber),
        company_name: company?.company_name ?? null,
        company_verified: !!company,
        signup_product: 'exports',
      })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success(`Universal ID created! Check ${email} for a confirmation link (it can take a minute — check spam too), then sign in.`, { duration: 8000 })
        setMode('signin')
        setShowResend(true)
      }
    }
    setLoading(false)
  }

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Enter your email above first, then resend.')
      return
    }
    setResending(true)
    const { error } = await resendConfirmation(email.trim())
    setResending(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Confirmation email re-sent to ${email}. Check your inbox (and spam).`, { duration: 8000 })
    }
  }

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    resetCompanyStep()
    setShowResend(false)
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

        {/* Free-for-UK-businesses badge — shown in both modes so it's the
            first thing anyone sees on the sign-in page. */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-[#E54E0F] text-primary-foreground px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] shadow-[0_2px_8px_rgba(247,106,31,0.35)] ring-1 ring-primary/40">
            <span aria-hidden="true">🇬🇧</span> 100% free for UK businesses
          </span>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {mode === 'signin' ? 'Sign in' : 'Create your Universal ID'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'signin'
                ? 'Free for UK businesses — sign in, or create your Universal ID free.'
                : 'Free for UK businesses — just confirm your Companies House number.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Companies House number
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. 01234567"
                      value={companyNumber}
                      onChange={(e) => {
                        setCompanyNumber(e.target.value)
                        resetCompanyStep()
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleLookup()
                        }
                      }}
                      autoComplete="off"
                      required
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleLookup}
                      disabled={lookingUp || !companyNumber.trim()}
                      className="shrink-0"
                    >
                      <Search className="h-4 w-4 mr-1.5" />
                      {lookingUp ? 'Looking up…' : 'Look up'}
                    </Button>
                  </div>
                </div>

                {company && !companyConfirmed && (
                  <div className="rounded-md border border-border bg-secondary/40 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-foreground">{company.company_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          No. {company.company_number}
                          {company.company_status ? ` · ${company.company_status}` : ''}
                          {company.date_of_creation ? ` · incorporated ${company.date_of_creation}` : ''}
                        </p>
                        {formatCompanyAddress(company) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCompanyAddress(company)}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-foreground">Is this your company?</p>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => setCompanyConfirmed(true)}>
                        Yes, that's us
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCompanyNumber('')
                          resetCompanyStep()
                        }}
                      >
                        No, try again
                      </Button>
                    </div>
                  </div>
                )}

                {companyConfirmed && (
                  <div className="flex items-start gap-2 rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {company ? company.company_name : `Company No. ${normalizeCompanyNumber(companyNumber)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company ? `No. ${company.company_number} — confirmed` : 'Taken on trust — lookup unavailable'}
                      </p>
                    </div>
                  </div>
                )}

                {lookupUnavailable && !companyConfirmed && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 text-sm">
                    <p className="text-foreground">
                      We couldn't reach the Companies House lookup right now. Double-check your
                      number and continue — we'll verify it later.
                    </p>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCompanyConfirmed(true)}>
                      Continue with No. {normalizeCompanyNumber(companyNumber)}
                    </Button>
                  </div>
                )}
              </div>
            )}

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
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (mode === 'signup' && !companyConfirmed)}
            >
              {loading
                ? mode === 'signin' ? 'Signing in…' : 'Creating your Universal ID…'
                : mode === 'signin' ? 'Sign in' : 'Create Universal ID'}
            </Button>
          </form>

          {mode === 'signin' && (
            <div className={showResend ? 'rounded-md border border-border bg-secondary/40 p-3' : ''}>
              <p className="text-xs text-muted-foreground">
                {showResend
                  ? 'Not confirmed yet? We can send the confirmation link again.'
                  : "Didn't get the confirmation email? "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary underline-offset-4 hover:underline font-medium disabled:opacity-60"
                >
                  {resending ? 'Sending…' : 'Resend confirmation email'}
                </button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <p className="text-xs text-muted-foreground">
              Universal Exports is free for UK businesses. Your Universal ID works across the whole
              Universal Apps suite. Not registered yet?{' '}
              <a
                href="https://www.gov.uk/limited-company-formation/register-your-company"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Register at Companies House
              </a>
              .
            </p>
          )}

          <p className="text-sm text-center text-muted-foreground">
            {mode === 'signin' ? "Don't have a Universal ID? " : 'Already have a Universal ID? '}
            <button
              type="button"
              className="text-primary underline-offset-4 hover:underline font-medium"
              onClick={switchMode}
            >
              {mode === 'signin' ? 'Create one free' : 'Sign in'}
            </button>
          </p>
        </div>

        <BrandFooter variant="auth" className="pt-2" />
      </div>
    </div>
  )
}
