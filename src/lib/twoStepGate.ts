import type { TwoStepDue } from '@unisim/sdk'

// The account's own rows wait for the two-step code (2026-11-23).
//
// Since platform 0343 every exports_* table refuses a person's own rows to a
// session that has an authenticator app but has not entered its code yet (a
// password or an emailed code is aal1). A refused SELECT comes back EMPTY,
// not as an error, so Exports used to show an account with no projects, no
// details and no bank accounts behind the SDK's code dialog — and kept
// showing that after the code until a reload. Worse, the first-sign-in moves
// ("your details only fill an account that has none") read that empty answer
// as "none" and wrote.
//
// So the stores ask `accountReady(userId)` before any read or write of the
// account's rows. It resolves at once for an account that owes nothing, and
// for one that owes the code it resolves the moment the code is entered —
// <TwoStepGateBridge /> reports the SDK's `useTwoStepDue`, which re-asks on
// `unisim:two-step-verified` — so the pages' loads, which were simply
// waiting, finish without a reload.

let bridged = false
let current: { uid: string | null; state: TwoStepDue } | null = null
const waiters = new Set<() => void>()

/**
 * Called during <TwoStepGateBridge />'s render, before any page can run an
 * effect: from here on the stores wait for its answer. Never called outside
 * <UniversalProvider> (a unit test, a script), where there is no SDK to ask
 * and nothing waits — the server still refuses what needs the code.
 */
export function markBridged(): void {
  bridged = true
}

/** Called by <TwoStepGateBridge />: what the SDK says about the signed-in account. */
export function reportTwoStep(uid: string | null, state: TwoStepDue | null): void {
  current = state === null ? null : { uid, state }
  for (const wake of [...waiters]) wake()
}

/** True when `uid`'s session owes no code right now (for synchronous guards). */
export function accountClear(uid: string): boolean {
  if (!bridged) return true
  return current !== null && current.uid === uid && current.state === 'clear'
}

/**
 * Resolves once `uid`'s session owes no two-step code. Never rejects. While the
 * provider has not yet caught up with the session (a different or no account
 * reported) it keeps waiting rather than guessing.
 */
export function accountReady(uid: string): Promise<void> {
  if (accountClear(uid)) return Promise.resolve()
  return new Promise((resolve) => {
    const wake = () => {
      if (!accountClear(uid)) return
      waiters.delete(wake)
      resolve()
    }
    waiters.add(wake)
  })
}
