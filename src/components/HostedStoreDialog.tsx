import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Chip, useUniversal, useUser, useCredits, useFileDrop, useHostedUploads, useAppFreeToken, type HostedUpload } from "@unisim/sdk";
import { storeExportPdf, deleteHostedExport, openHostedExport, HostedObjectMissingError } from "../lib/hostedStore";
import { downloadBackup, readBackupFile } from "../lib/projectBackup";
import { type ProjectData } from "../lib/projectStore";
import { useFreeAllowance, nearFreeLimit } from "../lib/useFreeAllowance";

const SIGNIN_URL = "https://app.unisim.co.uk/login";
// Was /subscription.html until 2026-09-07, when the marketing site split its
// one pricing page in two. The token card moved to /everyday; /subscription is
// now the Assess Suite's seats and licences and sells no tokens at all — so a
// link left pointing there sends someone who wants one upload to a £5,000/year
// enterprise plan. Not a 404: it renders fine, which is why it needed finding.
const GET_TOKENS_URL = "https://www.unisim.co.uk/everyday";

// "Back up this agreement" — the export PDF is generated on-device; the paid
// "Hosted by UNI·SIM" cloud option (one token per upload, refunded on delete) is
// gated behind a Universal ID. Backend: 0041 + the SDK hosted helpers. The blob +
// filename are passed in (Exports holds the PDF in local component state).
//
// Copy rule (2026-09-30): the allowance is never put in front of anyone before
// they reach it. Signed out, the card only invites them to create a Universal
// ID for FREE; signed in, there is no token talk at all (a purchased-token
// count is the one exception). The limit is explained only once it is hit.
// Near it (80%+ of the shared free "files" pool, migration 0199) one neutral
// line gives the MB used — numbers read from free_allowance_status, never
// hardcoded, and never shown below 80% or signed out.
export default function HostedStoreDialog({
  open,
  onClose,
  blob,
  fileName,
  project,
  onImportProject,
}: {
  open: boolean;
  onClose: () => void;
  blob: Blob | null;
  fileName: string;
  project: ProjectData;
  onImportProject: (project: ProjectData) => void;
}) {
  const { supabase, session, activeOrgId } = useUniversal();
  const { user } = useUser();
  const { credits, refresh: refreshCredits } = useCredits();
  // Every org gets one free returnable Exports token (migration 0045) — the RPC
  // spends it before the purchased wallet, so the button gates on either.
  const { status: freeToken, refresh: refreshFreeToken } = useAppFreeToken("exports");
  const { uploads, loading: listLoading, refresh: refreshList } = useHostedUploads("exports");
  // The shared free "files" pool's numbers — only for the near-the-limit line.
  const { status: allowance, refresh: refreshAllowance } = useFreeAllowance("exports", open);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justStored, setJustStored] = useState(false);
  // The one listed backup that turned out to have no file behind it, if any.
  const [missingId, setMissingId] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  // Declared above the `if (!open)` bail-out — hooks must run on every render.
  const importPicker = useFileDrop({
    onFiles: (files) => { void onImportFile(files[0]); },
    accept: ".json,application/json",
    multiple: false,
    clickToBrowse: false,
  });

  if (!open) return null;

  const signedIn = !!session?.user && session.user.is_anonymous !== true;
  const tokens = credits ?? 0;
  const canStore = freeToken === "available" || tokens > 0;
  // Talk about the limit only once it is close: 80%+ used and still room. At
  // the limit the existing at-limit message takes over instead.
  const near = signedIn && freeToken === "available" ? nearFreeLimit(allowance) : null;
  // What we say once the free allowance is used up and nothing was bought.
  // 'held' can be freed by deleting a backup; 'spent' cannot.
  const limitMessage = (status: typeof freeToken) =>
    status === "spent"
      ? "You've used your free online storage for agreements. Get more to keep backing up agreements online."
      : "You've used your free online storage for agreements. Delete a stored agreement to make room, or get more.";
  const hasProject = Object.keys(project.forms ?? {}).length > 0;

  function close() {
    onClose();
    setError(null);
    setMissingId(null);
    setJustStored(false);
    setImportErr(null);
  }

  function onDownloadBackup() {
    if (!hasProject) return;
    downloadBackup(project);
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return;
    setImportErr(null);
    try {
      const restored = await readBackupFile(file);
      close(); // loading the project replaces this agreement view
      onImportProject(restored);
    } catch (err) {
      setImportErr((err as Error).message);
    }
  }

  async function onStore() {
    if (!blob || !activeOrgId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await storeExportPdf(supabase, activeOrgId, blob, fileName);
      if (!res.ok) {
        setError(
          res.error === "no_credits" || res.error === "token_in_use"
            ? limitMessage(freeToken === "spent" ? "spent" : "held")
            : res.error ?? "Could not store this agreement.",
        );
      } else {
        setJustStored(true);
        refreshCredits();
        refreshFreeToken();
        refreshAllowance();
        refreshList();
        window.setTimeout(() => setJustStored(false), 2200);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onOpen(upload: HostedUpload) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMissingId(null);
    try {
      await openHostedExport(supabase, upload);
    } catch (e) {
      // A genuinely absent file is not an error to shrug at the user — it is a
      // dead entry, and the only useful thing to say is which one and what to
      // do about it. Anything else (offline, session expired) still surfaces as
      // an ordinary message, because deleting the backup would be the wrong
      // advice.
      if (e instanceof HostedObjectMissingError) setMissingId(upload.id);
      else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(upload: HostedUpload) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await deleteHostedExport(supabase, upload);
      if (!res.ok) setError(res.error ?? "Could not delete this agreement.");
      else {
        setMissingId((id) => (id === upload.id ? null : id));
        refreshCredits();
        refreshFreeToken();
        refreshAllowance();
        refreshList();
      }
    } finally {
      setBusy(false);
    }
  }

  // ⚠️ The backdrop is z-[1100], not z-[80]. UniversalAppsNavBar sets an inline
  // `zIndex: 1000`, so every value below it — including the old one — put the
  // nav bar on top of the backdrop and, on a short screen, over this dialog's
  // own Close button.
  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* One box that scrolls would take the title and the Close button with
          it — this dialog is far taller than a 390x844 screen. It is a flex
          column capped at the viewport instead, with the title row pinned
          OUTSIDE the scrolling body. */}
      <div className="flex max-h-[min(100%,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">Back up this agreement</h2>
          <button onClick={close} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {/* Tier 1 — Download the finished PDF (free, on-device). */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Download</span>
              <Chip size="sm">Free</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              The agreement PDF is built in this browser. Use Download PDF to save it to your device — free.
            </p>
          </div>

          {/* Tier 2 — Save to desktop: a re-importable backup of the whole project. */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Save to desktop</span>
              <Chip size="sm">Re-import later</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Download a backup of this whole project — all your form data — as one file. Import it any time, on any device, to carry on editing and regenerate the agreement. (Signatures aren't included — sign again after importing.)
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onDownloadBackup}
                disabled={!hasProject}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M4 16h12" />
                </svg>
                Download backup
              </button>
              <button
                type="button"
                onClick={importPicker.open}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 17V7m0 0L6.5 10.5M10 7l3.5 3.5M4 4h12" />
                </svg>
                Import a backup
              </button>
              <input {...importPicker.inputProps} className="hidden" />
            </div>
            {!hasProject && <p className="mt-2 text-xs text-slate-400">Fill in the agreement to back it up — or import a backup to restore a project.</p>}
            {importErr && <p className="mt-2 text-sm text-rose-600">{importErr}</p>}
          </div>

          {/* Tier 3 — Universal subscription: paid "Hosted by UNI·SIM" cloud (the PDF). */}
          <div className="rounded-xl border border-orange-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Hosted by UNI SIM</span>
              <Chip size="sm">Free with Universal ID</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Keep this agreement PDF online against your Universal ID, so you can get it back on any device.
            </p>

            {!signedIn ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-700">Create a <strong>Universal ID</strong> to keep export agreements online for FREE.</p>
                <a href={SIGNIN_URL} className="mt-2 inline-flex rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800">
                  Create / sign in with Universal ID →
                </a>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between rounded-lg bg-orange-50/60 px-3 py-2 text-sm">
                  <span className="text-slate-600">{user?.email}</span>
                  {tokens > 0 && (
                    <span className="font-semibold text-orange-700">
                      {`${tokens} purchased token${tokens === 1 ? "" : "s"}`}
                    </span>
                  )}
                </div>

                {blob ? (
                  canStore ? (
                    <button
                      onClick={onStore}
                      disabled={busy}
                      className="mt-3 w-full rounded-lg bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-50"
                    >
                      {busy ? "Backing up…" : justStored ? "✓ Backed up" : "Back up this agreement online"}
                    </button>
                  ) : freeToken === null ? null : (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm text-amber-800">
                        {limitMessage(freeToken)}
                      </p>
                      <a href={GET_TOKENS_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-orange-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-800">
                        Get more →
                      </a>
                    </div>
                  )
                ) : (
                  <p className="mt-3 text-xs text-slate-500">Generate the agreement PDF to back it up.</p>
                )}

                {near && (
                  <p className="mt-2 text-xs text-slate-500" data-testid="free-storage-near-limit">
                    {`You've used ${near.usedMb} MB of your ${near.limitMb} MB of free online storage. It's shared by Universal PDF, Images, Exports and Recorder.`}
                  </p>
                )}

                {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

                {/* The user's hosted agreements */}
                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Your backups</p>
                  {listLoading ? (
                    <p className="text-xs text-slate-400">Loading…</p>
                  ) : uploads.length === 0 ? (
                    <p className="text-xs text-slate-400">None yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {uploads.map((u) => (
                        <li key={u.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-slate-700">{u.file_name || "export-agreement.pdf"}</span>
                              <span className="block text-[10px] text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>
                            </span>
                            <button onClick={() => onOpen(u)} disabled={busy} className="shrink-0 rounded-md bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-800 disabled:opacity-50">Open</button>
                            <button onClick={() => onDelete(u)} disabled={busy} className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 disabled:opacity-50" title="Delete this backup">Delete</button>
                          </div>

                          {/* A backup with nothing behind it. Say which file,
                              say plainly that the upload never finished, and
                              make clearing it up one click (the token comes
                              back with it, though the copy no longer says so —
                              no token talk below the limit). This replaces storage's bare "Object not
                              found", which read like the app had mislaid the
                              user's agreement. */}
                          {missingId === u.id && (
                            <div
                              role="alert"
                              data-testid="hosted-missing"
                              className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2"
                            >
                              <p className="text-[11px] leading-snug text-amber-900">
                                <strong className="font-semibold">{u.file_name || "export-agreement.pdf"}</strong> is listed here,
                                but there is no file behind it — this upload never finished, so nothing was ever stored.
                              </p>
                              <button
                                type="button"
                                onClick={() => onDelete(u)}
                                disabled={busy}
                                className="mt-2 inline-flex rounded-md bg-amber-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                              >
                                Remove this entry
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
