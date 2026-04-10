import { supabase } from './supabase'

export interface BankAccount {
  accountName: string
  bankName: string
  sortCode: string
  accountNumber: string
  iban: string
  bicSwift: string
  currency: string
}

export function emptyBankAccount(currency = ''): BankAccount {
  return { accountName: '', bankName: '', sortCode: '', accountNumber: '', iban: '', bicSwift: '', currency }
}

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

async function loadBanks(type: 'your' | 'party'): Promise<Record<string, BankAccount>> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('type', type)

  if (error) {
    console.error(`Error loading ${type} banks:`, error)
    return {}
  }

  const result: Record<string, BankAccount> = {}
  data.forEach((row) => { result[row.key] = rowToBankAccount(row) })
  return result
}

async function saveBanks(type: 'your' | 'party', banks: Record<string, BankAccount>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Delete all existing rows for this type then re-insert
  await supabase.from('bank_accounts').delete().eq('user_id', user.id).eq('type', type)

  const rows = Object.entries(banks).map(([key, bank]) => ({
    user_id: user.id,
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
    const { error } = await supabase.from('bank_accounts').insert(rows)
    if (error) console.error(`Error saving ${type} banks:`, error)
  }
}

export async function loadYourBanks(): Promise<Record<string, BankAccount>> {
  return loadBanks('your')
}

export async function saveYourBanks(banks: Record<string, BankAccount>): Promise<void> {
  return saveBanks('your', banks)
}

export async function loadPartyBanks(): Promise<Record<string, BankAccount>> {
  return loadBanks('party')
}

export async function savePartyBanks(banks: Record<string, BankAccount>): Promise<void> {
  return saveBanks('party', banks)
}
