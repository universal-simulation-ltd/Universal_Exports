import { supabase } from './supabase'
import { accountReady } from './twoStepGate'

// Drafting needs no account (James, 2026-11-10: "make drafting local"). Signed
// out, projects, your details, contacts and bank details are kept in this
// browser under these keys; the first time the same browser is signed in,
// they move into that account (and leave the browser), so nothing typed
// before signing in is lost. Only sending an agreement for signing online,
// and the online copies, need the account.

export const GUEST_KEYS = {
  projects: 'exports.guest.projects.v1',
  yourDetails: 'exports.guest.yourDetails.v1',
  contacts: 'exports.guest.contacts.v1',
} as const

/**
 * The signed-in user's id, or null when signed out (or an anonymous session).
 *
 * Signed in, it resolves only once the session owes no two-step code
 * (twoStepGate.ts): every store asks this before touching the account's rows,
 * which platform 0343 refuses — as an EMPTY answer — until the code is in.
 */
export async function signedInUserId(): Promise<string | null> {
  let id: string | null = null
  try {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user
    id = user && user.is_anonymous !== true ? user.id : null
  } catch {
    return null
  }
  if (id) await accountReady(id)
  return id
}

export function readGuest<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeGuest(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: kept in memory for this visit */
  }
}

export function clearGuest(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* nothing to clear */
  }
}
