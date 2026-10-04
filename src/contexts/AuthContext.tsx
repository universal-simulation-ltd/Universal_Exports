import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useUniversal } from '@unisim/sdk'
import { adoptLegacySession } from '@/lib/supabase'
import { BASE_PATH } from '@/lib/basePath'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: Error | null }>
  resendConfirmation: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// The confirmation link should bring users back to THIS app on THIS host
// (e.g. .../exports/app, or universalexports.app/app); shared by signUp and
// resendConfirmation. Falls back to the Supabase project Site URL if the
// target isn't in the redirect allowlist.
function appConfirmRedirect() {
  return `${window.location.origin}${BASE_PATH}/app`
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * The signed-in account, as the SUITE sees it. Since 2026-10-04 this reads the
 * provider's session instead of keeping one of its own, so /auth, the /app gate
 * and the navbar always agree (see src/lib/supabase.ts for the bug it fixes).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { supabase, session, loading: providerLoading } = useUniversal()
  // 'pending' → 'done' once an old app-only session has been carried across
  // (or found absent). Until then the /app gate waits, rather than bouncing a
  // signed-in drafter to /auth for the instant before the session lands.
  const [adoption, setAdoption] = useState<'pending' | 'done'>('pending')
  const started = useRef(false)
  const loading = providerLoading || adoption !== 'done'

  useEffect(() => {
    if (providerLoading || started.current) return
    started.current = true
    adoptLegacySession(supabase, !!session)
      .catch(() => false)
      .finally(() => setAdoption('done'))
  }, [providerLoading, supabase, session])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    // metadata lands in auth.users.raw_user_meta_data — the sign-up gate uses
    // it to record the verified Companies House number on the Universal ID.
    //
    // emailRedirectTo brings the confirmation link back to THIS app instead of
    // the shared hub Site URL (allowlisted target; safe Site-URL fallback).
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: appConfirmRedirect() },
    })
    return { error }
  }

  // Re-send the signup confirmation email — for when the first one never
  // arrived (spam, delivery lag, or before custom SMTP was live). No-op for
  // an already-confirmed address, and Supabase rate-limits repeats.
  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: appConfirmRedirect() },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signIn,
        signUp,
        resendConfirmation,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
