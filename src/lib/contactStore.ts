import { supabase } from './supabase'
import { GUEST_KEYS, clearGuest, readGuest, signedInUserId, writeGuest } from './guestStore'

export interface CompanyDetails {
  id?: string
  registeredName: string
  tradingName: string
  companyNumber: string
  vatNumber: string
  eoriNumber: string
  address: string
  country: string
  contactName: string
  telephone: string
  email: string
}

export function emptyDetails(): CompanyDetails {
  return {
    registeredName: '', tradingName: '', companyNumber: '', vatNumber: '',
    eoriNumber: '', address: '', country: '', contactName: '', telephone: '', email: '',
  }
}

function rowToDetails(row: Record<string, string>): CompanyDetails {
  return {
    id: row.id,
    registeredName: row.registered_name ?? '',
    tradingName: row.trading_name ?? '',
    companyNumber: row.company_number ?? '',
    vatNumber: row.vat_number ?? '',
    eoriNumber: row.eori_number ?? '',
    address: row.address ?? '',
    country: row.country ?? '',
    contactName: row.contact_name ?? '',
    telephone: row.telephone ?? '',
    email: row.email ?? '',
  }
}

function detailsToRow(details: CompanyDetails) {
  return {
    registered_name: details.registeredName,
    trading_name: details.tradingName,
    company_number: details.companyNumber,
    vat_number: details.vatNumber,
    eori_number: details.eoriNumber,
    address: details.address,
    country: details.country,
    contact_name: details.contactName,
    telephone: details.telephone,
    email: details.email,
  }
}

const ukDefault = (): CompanyDetails => ({ ...emptyDetails(), country: 'United Kingdom' })

/**
 * Your details and contacts kept signed out in this browser move into the
 * account the first time it is signed in. Your details only fill an account
 * that has none, so a browser can never overwrite what the account holds.
 */
async function moveGuestDetails(userId: string): Promise<void> {
  const mine = readGuest<CompanyDetails | null>(GUEST_KEYS.yourDetails, null)
  if (mine) {
    const { data } = await supabase.from('exports_your_details').select('user_id').eq('user_id', userId).maybeSingle()
    const { error } = data ? { error: null } : await supabase.from('exports_your_details').upsert({ user_id: userId, ...detailsToRow(mine), updated_at: new Date().toISOString() })
    if (!error) clearGuest(GUEST_KEYS.yourDetails)
  }
  const contacts = readGuest<CompanyDetails[]>(GUEST_KEYS.contacts, [])
  if (contacts.length) {
    const { error } = await supabase.from('exports_contacts').insert(contacts.map((c) => ({ user_id: userId, ...detailsToRow(c) })))
    if (error) console.error('Error moving this browser\'s contacts to the account:', error)
    else clearGuest(GUEST_KEYS.contacts)
  }
}

export async function loadYourDetails(): Promise<CompanyDetails> {
  const userId = await signedInUserId()
  if (!userId) return readGuest<CompanyDetails | null>(GUEST_KEYS.yourDetails, null) ?? ukDefault()
  await moveGuestDetails(userId)

  const { data, error } = await supabase
    .from('exports_your_details')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return ukDefault()
  return rowToDetails(data)
}

export async function saveYourDetails(details: CompanyDetails): Promise<void> {
  const userId = await signedInUserId()
  if (!userId) {
    writeGuest(GUEST_KEYS.yourDetails, details)
    return
  }

  const { error } = await supabase.from('exports_your_details').upsert({
    user_id: userId,
    ...detailsToRow(details),
    updated_at: new Date().toISOString(),
  })

  if (error) console.error('Error saving your details:', error)
}

const localContacts = () => readGuest<CompanyDetails[]>(GUEST_KEYS.contacts, [])

export async function loadContacts(): Promise<CompanyDetails[]> {
  const userId = await signedInUserId()
  if (!userId) return localContacts()
  await moveGuestDetails(userId)

  const { data, error } = await supabase
    .from('exports_contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading contacts:', error)
    return []
  }

  return data.map(rowToDetails)
}

export async function saveContact(contact: CompanyDetails): Promise<void> {
  const userId = await signedInUserId()
  if (!userId) {
    const list = localContacts()
    if (contact.id) writeGuest(GUEST_KEYS.contacts, list.map((c) => (c.id === contact.id ? contact : c)))
    else writeGuest(GUEST_KEYS.contacts, [{ ...contact, id: `local-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` }, ...list])
    return
  }

  if (contact.id) {
    const { error } = await supabase
      .from('exports_contacts')
      .update(detailsToRow(contact))
      .eq('id', contact.id)
    if (error) console.error('Error updating contact:', error)
  } else {
    const { error } = await supabase
      .from('exports_contacts')
      .insert({ user_id: userId, ...detailsToRow(contact) })
    if (error) console.error('Error saving contact:', error)
  }
}

export async function deleteContact(id: string): Promise<void> {
  if (!(await signedInUserId())) {
    writeGuest(GUEST_KEYS.contacts, localContacts().filter((c) => c.id !== id))
    return
  }
  const { error } = await supabase.from('exports_contacts').delete().eq('id', id)
  if (error) console.error('Error deleting contact:', error)
}
