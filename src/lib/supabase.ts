import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ONE Supabase client: the suite's.
//
// ⚠️ Until 2026-10-04 this file created a second client of its own, beside the
// one <UniversalProvider> creates. Two clients meant two sessions: signing in
// on /auth signed you in to this app but not to the navbar (so the profile
// menu, hosted backups and the free-allowance counter all said "signed out"),
// and signing in from the navbar did not get you past the /app gate. Both
// clients also read sign-in results out of the URL, and the first to look
// consumes them — the race Date Polling hit on 2026-09-17 (9205d16).
//
// Exports has no reason for a session of its own (Polling's guest host does;
// a drafter here always holds a Universal ID), so instead of refereeing two
// clients as Polling does, every query now goes through the SDK's client.
// `<SuiteClientBridge />` in main.tsx hands it over during the provider's first
// render, before any page can run an effect. `supabase` below forwards to it,
// so the stores keep their one import.
//
// The platform-prefixed vars are canonical (they also feed the provider in
// main.tsx); the unprefixed names are a fallback for older self-host .env files.
const supabaseUrl = (import.meta.env.VITE_PLATFORM_SUPABASE_URL ??
  import.meta.env.VITE_SUPABASE_URL) as string
const supabaseAnonKey = (import.meta.env.VITE_PLATFORM_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string

let suiteClient: SupabaseClient | null = null
let detached: SupabaseClient | null = null

/** Hand this module the provider's client. Called by `<SuiteClientBridge />`. */
export function bindSuiteClient(client: SupabaseClient): void {
  suiteClient = client
}

/** True once the provider's client is bound (for tests and diagnostics). */
export function isSuiteClientBound(): boolean {
  return suiteClient !== null
}

function current(): SupabaseClient {
  if (suiteClient) return suiteClient
  // Only reachable outside <UniversalProvider> (a unit test, a script). It keeps
  // no session and never reads the URL, so it cannot become a second sign-in.
  detached ??= createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'anon', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return detached
}

/** The suite client, by forwarding: `supabase.from(…)`, `supabase.rpc(…)`, `supabase.auth`. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = current()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

/**
 * The storage key the old, app-only client kept its session under
 * (supabase-js's default, `sb-<project ref>-auth-token`).
 */
export function legacySessionKey(url: string = supabaseUrl): string | null {
  try {
    const ref = new URL(url).hostname.split('.')[0]
    return ref ? `sb-${ref}-auth-token` : null
  } catch {
    return null
  }
}

/** The tokens in a stored legacy session, or null when there is nothing usable. */
export function parseLegacySession(raw: string | null): { access_token: string; refresh_token: string } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null
    // supabase-js v2 stores the session itself; very old builds wrapped it.
    const s = (parsed && typeof parsed === 'object' && 'currentSession' in parsed
      ? (parsed.currentSession as Record<string, unknown> | null)
      : parsed) ?? null
    const access = typeof s?.access_token === 'string' ? s.access_token : ''
    const refresh = typeof s?.refresh_token === 'string' ? s.refresh_token : ''
    return access && refresh ? { access_token: access, refresh_token: refresh } : null
  } catch {
    return null
  }
}

/**
 * Carry a session from the old app-only client across to the suite client,
 * once, so people already signed in to Exports are not signed out by the move.
 * Only when the suite client has no session of its own (a suite session is the
 * newer, wider sign-in and wins). The old copy is removed either way: it is
 * MOVED, never shared — two clients refreshing one token sign each other out.
 */
export async function adoptLegacySession(client: SupabaseClient, hasSuiteSession: boolean): Promise<boolean> {
  const key = legacySessionKey()
  if (!key || typeof localStorage === 'undefined') return false
  let raw: string | null = null
  try { raw = localStorage.getItem(key) } catch { return false }
  if (!raw) return false
  try { localStorage.removeItem(key) } catch { /* private mode: nothing to clear */ }
  if (hasSuiteSession) return false
  const tokens = parseLegacySession(raw)
  if (!tokens) return false
  const { error } = await client.auth.setSession(tokens)
  return !error
}
