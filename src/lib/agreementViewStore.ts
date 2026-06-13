import { supabase } from './supabase'
import type { AgreementPdfInput } from './exportAgreementPdf'

// Read-only agreement views — back the QR code stamped on every generated
// Export Agreement PDF. See supabase/schema.sql → public.agreement_views.
//
// Each generate / sign mints one immutable row: a JSON snapshot of the
// agreement data plus the PDF itself, keyed by the uuid token in the public
// /view/:token URL. The token is client-minted (crypto.randomUUID) because
// the QR has to be baked into the PDF before the row can be written.

/** AgreementPdfInput minus the bulky signature image and the QR itself. */
export type AgreementViewSnapshot = Omit<AgreementPdfInput, 'signature' | 'qr'> & {
  signedBy?: { name: string; date: string } | null
}

export interface AgreementViewRow {
  id: string
  project_id: string
  user_id: string | null
  project_name: string
  snapshot: AgreementViewSnapshot
  pdf_data: string // data:application/pdf;base64,...
  created_at: string
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/**
 * Persist the snapshot + PDF under the pre-minted token. Returns false on
 * failure so the caller can rebuild the PDF without the QR — a printed code
 * must never point at a row that doesn't exist.
 */
export async function saveAgreementView(args: {
  id: string
  projectId: string
  projectName: string
  input: AgreementPdfInput
  pdfBlob: Blob
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()

  const { signature, qr: _qr, ...rest } = args.input
  const snapshot: AgreementViewSnapshot = {
    ...rest,
    signedBy: signature ? { name: signature.name, date: signature.date } : null,
  }

  const pdf_data = await blobToDataUrl(args.pdfBlob)

  const { error } = await supabase.from('exports_agreement_views').insert({
    id: args.id,
    project_id: args.projectId,
    user_id: user?.id ?? null,
    project_name: args.projectName,
    snapshot,
    pdf_data,
  })

  if (error) {
    console.error('[exports] saveAgreementView failed:', error)
    return false
  }
  return true
}

/**
 * Public lookup by token — used by the /view/:token page. No auth required;
 * reads go through the token-gated get_agreement_view RPC (the table has no
 * public select policy, so knowing the uuid is the only way in).
 */
export async function getAgreementView(token: string): Promise<AgreementViewRow | null> {
  const { data, error } = await supabase.rpc('exports_get_agreement_view', { view_token: token })
  if (error) {
    // Includes malformed (non-uuid) tokens — surface as "not found".
    console.error('[exports] getAgreementView failed:', error)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  return (row as AgreementViewRow) ?? null
}
