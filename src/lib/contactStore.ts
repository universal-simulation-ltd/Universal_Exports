import { supabase } from './supabase'

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

export async function loadYourDetails(): Promise<CompanyDetails> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...emptyDetails(), country: 'United Kingdom' }

  const { data, error } = await supabase
    .from('exports_your_details')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return { ...emptyDetails(), country: 'United Kingdom' }
  return rowToDetails(data)
}

export async function saveYourDetails(details: CompanyDetails): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase.from('exports_your_details').upsert({
    user_id: user.id,
    ...detailsToRow(details),
    updated_at: new Date().toISOString(),
  })

  if (error) console.error('Error saving your details:', error)
}

export async function loadContacts(): Promise<CompanyDetails[]> {
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (contact.id) {
    const { error } = await supabase
      .from('exports_contacts')
      .update(detailsToRow(contact))
      .eq('id', contact.id)
    if (error) console.error('Error updating contact:', error)
  } else {
    const { error } = await supabase
      .from('exports_contacts')
      .insert({ user_id: user.id, ...detailsToRow(contact) })
    if (error) console.error('Error saving contact:', error)
  }
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from('exports_contacts').delete().eq('id', id)
  if (error) console.error('Error deleting contact:', error)
}
