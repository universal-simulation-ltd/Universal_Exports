import {
  storeHostedFile,
  deleteHostedUpload,
  downloadHostedObject,
  type HostedUpload,
} from "@unisim/sdk";
import { hostedExportPath, hostedExportPathCandidates, newObjectId } from "./hostedPaths";

// "Hosted by UNI·SIM" cloud storage for Universal Exports. The export agreement
// PDF is generated on-device; hosting keeps a copy online against the user's
// Universal ID for one token (subscriptions.credits), refunded on delete.
// Backend: migration 0041 + the @unisim/sdk hosted helpers (mirrors Universal PDF).
//
// Where the bytes live is the ROW's call, not this app's (migration 0226):
// new saves offer Cloudflare R2 and the server picks, and every row says which
// in `storage_backend`. Older rows — and anything an older native build saves
// — are on Supabase Storage and stay there, so every read and delete goes
// through the SDK helpers with the row's own backend.

type Supabase = Parameters<typeof storeHostedFile>[0];

export interface StoreResult {
  ok: boolean;
  error?: string;
  creditsRemaining?: number;
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
  // ⚠️ NAME THE OBJECT FIRST. This used to reserve the row with a placeholder
  // `storagePath: "pending"`, upload, then UPDATE the row with the real path —
  // and that update silently did nothing on every account that isn't the
  // platform admin, because `hosted_uploads` grants members SELECT and nothing
  // else (0041). So the ledger kept saying `pending`, the dialog listed a
  // backup, and opening it asked storage for an object named `pending`:
  // "Object not found", for a file that had uploaded perfectly. See
  // `hostedPaths.ts` for the full write-up and the legacy recovery.
  //
  // A client-side object id removes the round trip the RLS was blocking: the
  // path is known before the token is reserved, so the RPC records the truth
  // at insert time and there is no second write to fail.
  const path = hostedExportPath(orgId, newObjectId(), fileName);

  // Reserve the token, then upload to whichever backend the server chose;
  // storeHostedFile refunds the token itself if the upload fails.
  const stored = await storeHostedFile(supabase, {
    product: "exports",
    storagePath: path,
    fileName,
    body: blob,
    contentType: "application/pdf",
  });
  if (!stored.ok || !stored.upload_id) {
    return { ok: false, error: stored.error ?? "Could not save right now." };
  }

  return { ok: true, creditsRemaining: stored.credits };
}

/** Delete a hosted export (storage object first, then refund the token).
 *
 *  Removes EVERY path the bytes could be under, not just the one the ledger
 *  names: a legacy row says `pending`, so deleting only that would refund the
 *  token and leave the real PDF orphaned in the bucket forever, with the row
 *  that pointed at it gone. */
export async function deleteHostedExport(supabase: Supabase, upload: HostedUpload): Promise<StoreResult> {
  // An R2 row is removed and refunded in one call to the hosted-files
  // function; the candidates only matter on Supabase.
  const res = await deleteHostedUpload(supabase, upload, hostedExportPathCandidates(upload));
  if (!res.ok) return { ok: false, error: res.error ?? "Could not delete right now." };
  return { ok: true, creditsRemaining: res.credits };
}

/**
 * Thrown when a listed backup has no object behind it anywhere we know to look.
 *
 * A distinct type so the dialog can answer honestly — name the file, say the
 * upload never completed, and offer to clear the entry (which refunds the token)
 * — instead of surfacing storage's bare "Object not found", which reads like
 * the app has lost the user's agreement.
 */
export class HostedObjectMissingError extends Error {
  readonly fileName: string;
  constructor(fileName: string) {
    super(`"${fileName}" is listed as backed up, but there is no file behind it.`);
    this.name = "HostedObjectMissingError";
    this.fileName = fileName;
  }
}

/**
 * Open a hosted export PDF in a new tab (download → object URL).
 *
 * Tries every candidate path in turn (see `hostedExportPathCandidates`), so the
 * backups the old three-step store flow filed as `pending` still open: their
 * bytes are in the bucket under the name the uploader used, which is fully
 * recoverable from the row itself. Only when nothing is there does this throw
 * — as `HostedObjectMissingError`, so the caller can offer the cleanup.
 */
export async function openHostedExport(supabase: Supabase, upload: HostedUpload): Promise<void> {
  let lastError: string | null = null;

  for (const path of hostedExportPathCandidates(upload)) {
    const { data, error } = await downloadHostedObject(supabase, { backend: upload.storage_backend, path });
    if (data && !error) {
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
    lastError = error?.message ?? null;
  }

  // Every candidate missed. Distinguish "not there" from "could not ask" — a
  // dropped connection or an expired session must NOT be reported as a dead
  // backup, or the user is invited to delete an agreement that is perfectly
  // fine.
  if (lastError && !/not.?found|does not exist|404/i.test(lastError)) {
    throw new Error(lastError);
  }
  throw new HostedObjectMissingError(upload.file_name || "export-agreement.pdf");
}
