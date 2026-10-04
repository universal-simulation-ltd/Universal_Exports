import { supabase } from './supabase'
import { isUuid } from './signatureStore'
import type { AgreementViewSnapshot } from './agreementViewStore'

// The signing audit trail (platform migration 0244 + the exports-sign Edge
// Function). The other party's opening and signing go through the function,
// because that is where the request's real IP is visible; everything else is a
// token-gated RPC. See the migration header for what is recorded and why.

/** The agreement as the signer is shown it: the newest PDF the drafter generated. */
export interface SignerDocument {
  viewId: string
  pdfData: string
  sha256: string
  snapshot: AgreementViewSnapshot | null
  createdAt: string
}

export async function getSignerDocument(token: string): Promise<SignerDocument | null> {
  if (!isUuid(token)) return null
  const { data, error } = await supabase.rpc('exports_get_agreement_signature_document', { sig_token: token })
  if (error) {
    console.error('[exports] getSignerDocument failed:', error)
    throw new Error(error.message || 'getSignerDocument failed')
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { view_id: string; pdf_data: string; pdf_sha256: string; snapshot: AgreementViewSnapshot | null; created_at: string }
    | null
    | undefined
  if (!row?.view_id || !row.pdf_data) return null
  return { viewId: row.view_id, pdfData: row.pdf_data, sha256: row.pdf_sha256, snapshot: row.snapshot, createdAt: row.created_at }
}

/** Codes the function answers with. `ok` false + a code is an expected refusal. */
export type SignCode =
  | 'viewed' | 'signed' | 'not_found' | 'not_pending' | 'not_viewed' | 'document_changed'
  | 'no_document' | 'invalid' | 'too_large' | 'server_error' | 'network'

interface SignResult { ok: boolean; code: SignCode; finalised?: boolean; finalSha256?: string | null }

async function callSign(body: Record<string, unknown>): Promise<SignResult> {
  const { data, error } = await supabase.functions.invoke('exports-sign', { body })
  if (!error) return data as SignResult
  // A 4xx carries a JSON reason; read it rather than calling it a network fault.
  const ctx = (error as { context?: Response }).context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = (await ctx.json()) as SignResult
      if (body && typeof body.code === 'string') return { ...body, ok: false }
    } catch { /* not JSON */ }
  }
  console.error('[exports] exports-sign failed:', error)
  return { ok: false, code: 'network' }
}

/** Record that the signer opened stored PDF `viewId` (time, IP, browser). */
export function recordDocumentViewed(token: string, viewId: string): Promise<SignResult> {
  return callSign({ action: 'view', token, viewId })
}

/** Sign the opened document; the server then builds the signed copy. */
export function submitSignature(args: { token: string; viewId: string; name: string; signature: string }): Promise<SignResult> {
  return callSign({ action: 'submit', ...args })
}

/** Build the signed copy for a signed link that has none yet. Idempotent. */
export function finaliseSignature(token: string): Promise<SignResult> {
  return callSign({ action: 'finalise', token })
}

export interface AgreementAudit {
  audit_id: string
  project_name: string
  status: 'pending' | 'signed'
  created_at: string
  sent_at: string | null
  sent_via: 'email' | 'link' | 'mailto' | null
  viewed_pdf_at: string | null
  viewed_ip: string | null
  viewed_user_agent: string | null
  viewed_country: string | null
  counter_signer_name: string
  counter_signed_at: string | null
  signer_ip: string | null
  signer_user_agent: string | null
  signer_country: string | null
  document_sha256: string | null
  final_sha256: string | null
  finalised_at: string | null
}

/** The audit record, for whoever holds the link (the two parties). */
export async function getAudit(token: string): Promise<AgreementAudit | null> {
  if (!isUuid(token)) return null
  const { data, error } = await supabase.rpc('exports_get_agreement_audit', { sig_token: token })
  if (error) {
    console.error('[exports] getAudit failed:', error)
    return null
  }
  return ((Array.isArray(data) ? data[0] : data) as AgreementAudit | undefined) ?? null
}

/** The signed copy with its audit page, or null when it has not been built. */
export async function getFinalPdf(token: string): Promise<{ pdfData: string; sha256: string } | null> {
  if (!isUuid(token)) return null
  const { data, error } = await supabase.rpc('exports_get_agreement_final_pdf', { sig_token: token })
  if (error) {
    console.error('[exports] getFinalPdf failed:', error)
    return null
  }
  const row = (Array.isArray(data) ? data[0] : data) as { pdf_data?: string; pdf_sha256?: string } | undefined
  return row?.pdf_data ? { pdfData: row.pdf_data, sha256: row.pdf_sha256 ?? '' } : null
}

/** Drafter only: the link went out (first time wins). Best effort. */
export async function markSent(token: string, via: 'email' | 'link' | 'mailto'): Promise<void> {
  if (!isUuid(token)) return
  const { error } = await supabase.rpc('exports_mark_agreement_sent', { sig_token: token, via })
  if (error) console.error('[exports] markSent failed:', error)
}

// ── Public verify ──────────────────────────────────────────────────────────

export interface VerifiedAgreement {
  audit_id: string
  project_name: string
  status: 'pending' | 'signed'
  created_at: string
  sent_at: string | null
  viewed_pdf_at: string | null
  counter_signer_name: string
  counter_signed_at: string | null
  drafter_signed_by: string | null
  document_sha256: string | null
  final_sha256: string | null
  finalised_at: string | null
}

export async function verifyAgreement(auditId: string): Promise<VerifiedAgreement | null> {
  if (!isUuid(auditId)) return null
  const { data, error } = await supabase.rpc('exports_verify_agreement', { p_audit_id: auditId })
  if (error) throw new Error(error.message || 'verifyAgreement failed')
  return ((Array.isArray(data) ? data[0] : data) as VerifiedAgreement | undefined) ?? null
}

export interface HashMatch {
  match: 'final' | 'signed_document' | 'generated'
  audit_id: string | null
  project_name: string
  at: string | null
}

export async function verifyPdfHash(sha256: string): Promise<HashMatch[]> {
  if (!/^[0-9a-f]{64}$/i.test(sha256)) return []
  const { data, error } = await supabase.rpc('exports_verify_pdf_hash', { p_sha256: sha256.toLowerCase() })
  if (error) throw new Error(error.message || 'verifyPdfHash failed')
  return (data ?? []) as HashMatch[]
}

/** SHA-256 of a file, in the browser — the file is never uploaded. */
export async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** "e185…4cbd" — enough to compare by eye, short enough to read. */
export function shortHash(sha: string | null | undefined): string {
  return sha && sha.length > 16 ? `${sha.slice(0, 8)}…${sha.slice(-8)}` : sha ?? ''
}
