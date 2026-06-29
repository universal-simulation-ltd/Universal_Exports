import {
  consumeHostedUpload,
  refundHostedUpload,
  HOSTED_BUCKET,
  type HostedUpload,
} from "@unisim/sdk";

// "Hosted by UNI·SIM" cloud storage for Universal Exports. The export agreement
// PDF is generated on-device; hosting keeps a copy online against the user's
// Universal ID for one token (subscriptions.credits), refunded on delete.
// Backend: migration 0041 + the @unisim/sdk hosted helpers (mirrors Universal PDF).

type Supabase = Parameters<typeof consumeHostedUpload>[0];

export interface StoreResult {
  ok: boolean;
  error?: string;
  creditsRemaining?: number;
}

/** Keep the object name to a safe slug + a .pdf extension. */
function safeName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, "");
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${slug || "export-agreement"}.pdf`;
}

/** Spend one token and store an export-agreement PDF in the cloud. Reserves the
 *  token first, then uploads; a failed upload refunds it so the user is never
 *  charged for a file that isn't there. */
export async function storeExportPdf(
  supabase: Supabase,
  orgId: string,
  blob: Blob,
  fileName: string,
): Promise<StoreResult> {
  const consumed = await consumeHostedUpload(supabase, {
    product: "exports",
    storagePath: "pending",
    fileName,
    sizeBytes: blob.size,
  });
  if (!consumed.ok || !consumed.upload_id) {
    return { ok: false, error: consumed.error ?? "Could not reserve a token." };
  }

  const path = `${orgId}/exports/${consumed.upload_id}-${safeName(fileName)}`;
  const { error: upErr } = await supabase.storage
    .from(HOSTED_BUCKET)
    .upload(path, blob, { contentType: "application/pdf", upsert: true });

  if (upErr) {
    await refundHostedUpload(supabase, consumed.upload_id);
    return { ok: false, error: upErr.message };
  }

  await supabase.from("hosted_uploads").update({ storage_path: path }).eq("id", consumed.upload_id);
  return { ok: true, creditsRemaining: consumed.credits };
}

/** Delete a hosted export (storage object first, then refund the token). */
export async function deleteHostedExport(supabase: Supabase, upload: HostedUpload): Promise<StoreResult> {
  await supabase.storage.from(HOSTED_BUCKET).remove([upload.storage_path]);
  const res = await refundHostedUpload(supabase, upload.id);
  if (!res.ok) return { ok: false, error: res.error ?? "Could not refund the token." };
  return { ok: true, creditsRemaining: res.credits };
}

/** Open a hosted export PDF in a new tab (download → object URL). */
export async function openHostedExport(supabase: Supabase, upload: HostedUpload): Promise<void> {
  const { data, error } = await supabase.storage.from(HOSTED_BUCKET).download(upload.storage_path);
  if (error || !data) throw new Error(error?.message ?? "Could not download the PDF.");
  const url = URL.createObjectURL(data);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
