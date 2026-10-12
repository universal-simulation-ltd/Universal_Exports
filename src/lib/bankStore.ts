import { supabase } from './supabase'

// Bank details (sort code, account number, IBAN…) for you and the other party,
// one account per currency.
//
// They live in this browser on this device (localStorage, under the signed-in
// account's id) unless you tick "Save bank details to my account". Ticked, they
// are also saved to exports_bank_accounts under your Universal ID, so they
// follow you to another computer.
//
// Accounts that saved bank details before the choice existed already have a
// copy in exports_bank_accounts. On a device with no choice recorded, that copy
// counts as having ticked the box, so those details keep loading. Unticking
// stops syncing; the copy in your account is only removed when you ask
// (removeCloudBanks). Nothing on the server is ever deleted automatically.
//
// Signed out (the /demo walkthrough) nothing is kept at all.

export interface BankAccount {
  accountName: string
  bankName: string
  sortCode: string
  accountNumber: string
  iban: string
  bicSwift: string
  currency: string
}

export type BankType = 'your' | 'party'
export type BankBook = Record<string, BankAccount>
export interface BankBooks { your: BankBook; party: BankBook }

export function emptyBankAccount(currency = ''): BankAccount {
  return { accountName: '', bankName: '', sortCode: '', accountNumber: '', iban: '', bicSwift: '', currency }
}

const LOCAL_PREFIX = 'exports.banks.v1.'
const CHOICE_PREFIX = 'exports.banks.cloud.v1.'

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.user?.id ?? null
  } catch {
    return null
  }
}

// ── This device ─────────────────────────────────────────────────────────────

function readLocal(userId: string): BankBooks {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_PREFIX + userId) || '{}')
    return { your: raw.your ?? {}, party: raw.party ?? {} }
  } catch {
    return { your: {}, party: {} }
  }
}

function writeLocal(userId: string, books: BankBooks): void {
  try {
    localStorage.setItem(LOCAL_PREFIX + userId, JSON.stringify(books))
  } catch {
    /* storage full or blocked: the details stay in memory for this visit */
  }
}

/** '1' ticked, '0' unticked, null never chosen on this device. */
function readChoice(userId: string): '1' | '0' | null {
  try {
    const v = localStorage.getItem(CHOICE_PREFIX + userId)
    return v === '1' || v === '0' ? v : null
  } catch {
    return null
  }
}

function writeChoice(userId: string, on: boolean): void {
  try {
    localStorage.setItem(CHOICE_PREFIX + userId, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

// ── Your account (exports_bank_accounts) ────────────────────────────────────

function rowToBankAccount(row: Record<string, string>): BankAccount {
  return {
    accountName: row.account_name ?? '',
    bankName: row.bank_name ?? '',
    sortCode: row.sort_code ?? '',
    accountNumber: row.account_number ?? '',
    iban: row.iban ?? '',
    bicSwift: row.bic_swift ?? '',
    currency: row.currency ?? '',
  }
}

/** Null when the read failed (offline, server error) — not the same as "none". */
async function readCloud(): Promise<BankBooks | null> {
  const { data, error } = await supabase.from('exports_bank_accounts').select('*')
  if (error) {
    console.error('Error loading bank details:', error)
    return null
  }
  const books: BankBooks = { your: {}, party: {} }
  for (const row of data ?? []) {
    if (row.type === 'your' || row.type === 'party') books[row.type as BankType][row.key] = rowToBankAccount(row)
  }
  return books
}

async function writeCloud(userId: string, type: BankType, banks: BankBook): Promise<void> {
  // Replace this type's rows with the current set.
  await supabase.from('exports_bank_accounts').delete().eq('user_id', userId).eq('type', type)

  const rows = Object.entries(banks).map(([key, bank]) => ({
    user_id: userId,
    type,
    key,
    account_name: bank.accountName,
    bank_name: bank.bankName,
    sort_code: bank.sortCode,
    account_number: bank.accountNumber,
    iban: bank.iban,
    bic_swift: bank.bicSwift,
    currency: bank.currency,
  }))

  if (rows.length > 0) {
    const { error } = await supabase.from('exports_bank_accounts').insert(rows)
    if (error) console.error(`Error saving ${type} bank details:`, error)
  }
}

const hasAny = (books: BankBooks) => Object.keys(books.your).length + Object.keys(books.party).length > 0

// ── Public API ──────────────────────────────────────────────────────────────

export interface LoadedBanks extends BankBooks {
  /** "Save bank details to my account" is ticked. */
  cloudSync: boolean
  /** A copy exists in your account (so unticking can offer to remove it). */
  cloudCopy: boolean
  /** Signed in — anything to keep at all. */
  signedIn: boolean
}

export async function loadBanks(): Promise<LoadedBanks> {
  const userId = await currentUserId()
  if (!userId) return { your: {}, party: {}, cloudSync: false, cloudCopy: false, signedIn: false }

  const local = readLocal(userId)
  const choice = readChoice(userId)
  // Unticked on this device: the details come from this device only. The
  // account is read just to learn whether an old copy is there to offer removing.
  if (choice === '0') {
    const cloud = await readCloud()
    return { ...local, cloudSync: false, cloudCopy: !!cloud && hasAny(cloud), signedIn: true }
  }

  const cloud = await readCloud()
  if (!cloud) {
    // Couldn't reach the account: show what this device has.
    return { ...local, cloudSync: choice === '1', cloudCopy: false, signedIn: true }
  }
  if (choice === null && !hasAny(cloud)) {
    // Never chosen and nothing saved online: device-only, the default.
    return { ...local, cloudSync: false, cloudCopy: false, signedIn: true }
  }
  // Ticked, or details saved to the account before the choice existed (which
  // counts as having ticked it). The account copy is the one that follows you
  // between devices, so it wins.
  if (choice === null) writeChoice(userId, true)
  writeLocal(userId, cloud)
  return { ...cloud, cloudSync: true, cloudCopy: hasAny(cloud), signedIn: true }
}

/** Save one side's details: always to this device, and to the account when ticked. */
export async function saveBanks(type: BankType, banks: BankBook): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return
  const local = readLocal(userId)
  writeLocal(userId, { ...local, [type]: banks })
  if (readChoice(userId) === '1') await writeCloud(userId, type, banks)
}

/**
 * Tick or untick "Save bank details to my account". Ticking saves what this
 * device has to the account (both sides). Unticking only stops syncing; the
 * copy already in the account stays until removeCloudBanks.
 */
export async function setBankCloudSync(on: boolean, books: BankBooks): Promise<boolean> {
  const userId = await currentUserId()
  if (!userId) return false
  writeLocal(userId, books)
  writeChoice(userId, on)
  if (on) {
    await writeCloud(userId, 'your', books.your)
    await writeCloud(userId, 'party', books.party)
  }
  return true
}

/** Remove the copy saved to the account. Only ever called from an explicit button. */
export async function removeCloudBanks(): Promise<boolean> {
  const userId = await currentUserId()
  if (!userId) return false
  const { error } = await supabase.from('exports_bank_accounts').delete().eq('user_id', userId)
  if (error) {
    console.error('Error removing bank details from the account:', error)
    return false
  }
  return true
}
