import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Chip, SignInDialog, useUniversal, useUser, useOrg, useCredits, useFileDrop, useHostedUploads, useAppFreeToken, type HostedUpload } from "@unisim/sdk";
import { storeExportPdf, deleteHostedExport, openHostedExport, HostedObjectMissingError } from "../lib/hostedStore";
import { BackupError, downloadBackup, readBackupFile } from "../lib/projectBackup";
import { fillNodes } from "../lib/i18n/format";
import { useDrafterI18n } from "../lib/i18n/drafter/useDrafterI18n";
import { type ProjectData } from "../lib/projectStore";
import { useFreeAllowance, nearFreeLimit } from "../lib/useFreeAllowance";

// Only its origin is used, by the in-app sign-in's "manage your account" link.
// Sign-in itself happens in <SignInDialog /> on top of this one: linking to the
// hub's /login navigated away from the agreement being worked on, and the hub
// then sent a newcomer on to the Assess portal, not back here.
const SIGNIN_URL = "https://app.unisim.co.uk/login";
// Nothing is for sale for the everyday apps (2026-10-03): at the free limit the
// note says how to make room, and one quiet link asks people who need more to
// tell us — that is the signal for when a paid tier is worth building.
const NEED_MORE_URL = "https://www.unisim.co.uk/support";
// Where a signed-in Universal ID with no company sets one up. Opened in a new
// tab so the agreement being worked on here is not navigated away from.
const SET_UP_COMPANY_URL = "https://app.unisim.co.uk/branding";

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
  const { t, tf, tp, shortDate } = useDrafterI18n();
  // Online copies are kept with a company, so a signed-in ID that belongs to
  // none has nowhere to store one. Only a SUCCESSFUL empty read counts as "no
  // company" — a failed read is unknown, and never a reason to offer one.
  const { orgs, loading: orgsLoading, error: orgsError } = useOrg();
  const noCompany = !orgsLoading && !orgsError && orgs.length === 0;
  const { user } = useUser();
  const { credits, refresh: refreshCredits } = useCredits();
  // Every org gets one free returnable Exports token (migration 0045) — the RPC
  // spends it before the purchased wallet, so the button gates on either.
  const { status: freeToken, refresh: refreshFreeToken } = useAppFreeToken("exports");
  const { uploads, loading: listLoading, refresh: refreshList } = useHostedUploads("exports");
  // The shared free "files" pool's numbers — only for the near-the-limit line.
  const { status: allowance, refresh: refreshAllowance } = useFreeAllowance("exports", open);

  const [busy, setBusy] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
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
  const near = signedIn && !noCompany && freeToken === "available" ? nearFreeLimit(allowance) : null;
  // What we say once the free allowance is used up and nothing was bought.
  // 'held' can be freed by deleting a backup; 'spent' cannot.
  const limitMessage = (status: typeof freeToken) =>
    status === "spent" ? t("hosted.limitSpent") : t("hosted.limitHeld");
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
      setImportErr(err instanceof BackupError ? t(err.key) : (err as Error).message);
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
            : res.error ?? t("hosted.storeFailed"),
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
      if (!res.ok) setError(res.error ?? t("hosted.deleteFailed"));
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
      className="fixed inset-0 z-1100 flex items-center justify-center bg-slate-900/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      {/* One box that scrolls would take the title and the Close button with
          it — this dialog is far taller than a 390x844 screen. It is a flex
          column capped at the viewport instead, with the title row pinned
          OUTSIDE the scrolling body. */}
      <div className="flex max-h-[min(100%,100dvh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{t("hosted.title")}</h2>
          <button onClick={close} aria-label={t("common.close")} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {/* Tier 1 — Download the finished PDF (free, on-device). */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{t("hosted.download")}</span>
              <Chip size="sm">{t("hosted.free")}</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t("hosted.downloadDesc")}
            </p>
          </div>

          {/* Tier 2 — Save to desktop: a re-importable backup of the whole project. */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{t("hosted.desktop")}</span>
              <Chip size="sm">{t("hosted.reimport")}</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t("hosted.desktopDesc")}
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
                {t("hosted.downloadBackup")}
              </button>
              <button
                type="button"
                onClick={importPicker.open}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 17V7m0 0L6.5 10.5M10 7l3.5 3.5M4 4h12" />
                </svg>
                {t("hosted.importBackup")}
              </button>
              <input {...importPicker.inputProps} className="hidden" />
            </div>
            {!hasProject && <p className="mt-2 text-xs text-slate-400">{t("hosted.fillFirst")}</p>}
            {importErr && <p className="mt-2 text-sm text-rose-600">{importErr}</p>}
          </div>

          {/* Tier 3 — Universal subscription: paid "Hosted by UNI·SIM" cloud (the PDF). */}
          <div className="rounded-xl border border-orange-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">{t("hosted.hostedTitle")}</span>
              <Chip size="sm">{t("hosted.freeWithId")}</Chip>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {t("hosted.hostedDesc")}
            </p>

            {!signedIn ? (
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-sm text-slate-700">{fillNodes(t("hosted.createId"), { id: <strong>Universal ID</strong> })}</p>
                <button type="button" onClick={() => setSignInOpen(true)} className="mt-2 inline-flex rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800">
                  {t("hosted.signIn")}
                </button>
                <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} hubLoginHref={SIGNIN_URL} initialMode="signup" />
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-between rounded-lg bg-orange-50/60 px-3 py-2 text-sm">
                  <span className="text-slate-600">{user?.email}</span>
                  {tokens > 0 && (
                    <span className="font-semibold text-orange-700">
                      {tp("hosted.tokens", tokens)}
                    </span>
                  )}
                </div>

                {noCompany ? (
                  <div className="mt-3" data-testid="hosted-no-company">
                    <p className="text-sm text-slate-600">
                      {t("hosted.noCompany")}
                    </p>
                    <a href={SET_UP_COMPANY_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800">
                      {t("hosted.setUpCompany")}
                    </a>
                  </div>
                ) : blob ? (
                  canStore ? (
                    <button
                      onClick={onStore}
                      disabled={busy}
                      className="mt-3 w-full rounded-lg bg-orange-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-800 disabled:opacity-50"
                    >
                      {busy ? t("hosted.backingUp") : justStored ? `✓ ${t("hosted.backedUp")}` : t("hosted.backUpOnline")}
                    </button>
                  ) : freeToken === null ? null : (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm text-amber-800">
                        {limitMessage(freeToken)}
                      </p>
                      <a href={NEED_MORE_URL} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-amber-800 underline underline-offset-2 hover:text-amber-950">
                        {t("hosted.needMore")}
                      </a>
                    </div>
                  )
                ) : (
                  <p className="mt-3 text-xs text-slate-500">{t("hosted.generateFirst")}</p>
                )}

                {near && (
                  <p className="mt-2 text-xs text-slate-500" data-testid="free-storage-near-limit">
                    {tf("hosted.near", { used: near.usedMb, limit: near.limitMb })}
                  </p>
                )}

                {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

                {/* The user's hosted agreements */}
                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("hosted.yourBackups")}</p>
                  {listLoading ? (
                    <p className="text-xs text-slate-400">{t("hosted.loading")}</p>
                  ) : uploads.length === 0 ? (
                    <p className="text-xs text-slate-400">{t("hosted.noneYet")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {uploads.map((u) => (
                        <li key={u.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-slate-700">{u.file_name || "export-agreement.pdf"}</span>
                              <span className="block text-[10px] text-slate-400">{shortDate(u.created_at)}</span>
                            </span>
                            <button onClick={() => onOpen(u)} disabled={busy} className="shrink-0 rounded-md bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-800 disabled:opacity-50">{t("hosted.open")}</button>
                            <button onClick={() => onDelete(u)} disabled={busy} className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-600 disabled:opacity-50" title={t("hosted.deleteTitle")}>{t("common.delete")}</button>
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
                                {fillNodes(t("hosted.missing"), {
                                  file: <strong className="font-semibold">{u.file_name || "export-agreement.pdf"}</strong>,
                                })}
                              </p>
                              <button
                                type="button"
                                onClick={() => onDelete(u)}
                                disabled={busy}
                                className="mt-2 inline-flex rounded-md bg-amber-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                              >
                                {t("hosted.removeEntry")}
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
