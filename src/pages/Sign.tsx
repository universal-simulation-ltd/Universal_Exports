import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, ShieldCheck, ExternalLink, CheckCircle2, RotateCcw, Download, Fingerprint, Loader2, Radio, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignaturePad from "@/components/SignaturePad";
import { toast } from "sonner";
import {
  getSignatureToken,
  markPdfViewed,
  submitCounterSignature,
  type AgreementSignature,
} from "@/lib/signatureStore";
import {
  finaliseSignature,
  getFinalPdf,
  getSignerDocument,
  recordDocumentViewed,
  shortHash,
  submitSignature,
  type SignerDocument,
} from "@/lib/auditStore";
import { isImageDataUrl, pdfBlobFromDataUrl } from "@/lib/safeDataUrl";
import { useI18n } from "@/lib/i18n";
import { useSignTogether, type TogetherField } from "@/lib/together";
import { getTranslation, type AgreementTranslation } from "@/lib/translation";
import AgreementSideBySide from "@/components/AgreementSideBySide";
import { cn } from "@/lib/utils";
import { fill, fillNodes, formatLongDate } from "@/lib/i18n/format";

/**
 * Counter-sign landing page — the QR / link the drafter sends opens here.
 *
 * Flow:
 *   1. Load the token row and the agreement (the drafter's newest generated
 *      PDF, with its SHA-256).
 *   2. "Open document" opens that PDF in a new tab and records the opening
 *      (exports-sign 'view': time, IP, browser — bound to that exact PDF).
 *   3. The name + signature pad unlock. The page says what is recorded before
 *      the button that records it.
 *   4. Submit signs THAT document (refused if the sender replaced it since),
 *      and the server builds the signed copy with an audit page, which the
 *      signer can download straight away.
 *
 * No auth required — the token uuid in the URL is the bearer credential.
 * If the Edge Function is unreachable, opening and signing fall back to the
 * older RPCs (no IP / browser recorded; the server can still build the copy).
 */
/** A plain message in the review tab. Built with the DOM API rather than
 *  innerHTML: project_name is set by the drafter and shown to the signer, so a
 *  template string would be a stored-XSS sink; textContent escapes it. */
function writeNote(doc: Document, heading: string, projectName: string, message: string) {
  doc.body.replaceChildren();
  const wrap = doc.createElement("div");
  wrap.setAttribute("style", "font-family: system-ui, sans-serif; padding: 40px; max-width: 720px; margin: 40px auto;");
  const h1 = doc.createElement("h1");
  h1.setAttribute("style", "font-size: 22px; margin-bottom: 8px;");
  h1.textContent = heading;
  const name = doc.createElement("p");
  name.setAttribute("style", "color: #475569;");
  name.textContent = projectName;
  const note = doc.createElement("p");
  note.setAttribute("style", "color: #64748b; font-size: 14px; margin-top: 32px;");
  note.textContent = message;
  wrap.append(h1, name, note);
  doc.body.append(wrap);
}

/** Save a stored PDF data URL as a download (always as application/pdf). */
function downloadPdf(dataUrl: string, fileName: string): boolean {
  const blob = pdfBlobFromDataUrl(dataUrl);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** The small "the sender is pointing here" tag over a highlighted part. */
function PointedHere({ label }: { label: string }) {
  return (
    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-sky-700 dark:text-sky-300">
      <Hand className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </p>
  );
}

const Sign = () => {
  const { token = "" } = useParams<{ token: string }>();
  // The signer is usually the OTHER side of the trade, often abroad: every
  // string here follows their language (the SDK's: browser, unless they chose).
  const { t, lang } = useI18n();
  const [record, setRecord] = useState<AgreementSignature | null>(null);
  const [doc, setDoc] = useState<SignerDocument | null>(null);
  const [supplied, setSupplied] = useState<AgreementTranslation | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // The document opened in THIS page load (a reload asks again: the binding
  // is to the copy you were actually shown).
  const [openedViewId, setOpenedViewId] = useState<string | null>(null);
  // Set when the Edge Function could not be reached and the older RPCs were used.
  const [legacyPath, setLegacyPath] = useState(false);
  const [downloading, setDownloading] = useState(false);
  // Live with the sender ("Sign together"): on for a pending link unless the
  // signer switches it off. What they type and draw is only sent while the
  // sender is actually here, and the banner says so.
  const [shareLive, setShareLive] = useState(true);
  const live = useSignTogether({
    token,
    role: "signer",
    // The signer's name travels only as they type it, while the sender is here.
    name: "",
    enabled: shareLive && record?.status === "pending",
  });
  const senderHere = live.peer.present;
  const pointedAt = (field: TogetherField) => senderHere && live.peer.focus === field;
  const today = formatLongDate(lang, new Date());

  const load = useCallback(() => {
    let active = true;
    setStatus("loading");
    Promise.all([
      getSignatureToken(token),
      getSignerDocument(token).catch(() => null),
      getTranslation(token).catch(() => null),
    ]).then(
      ([r, d, tr]) => {
        if (!active) return;
        setRecord(r);
        setDoc(d);
        setSupplied(tr);
        setStatus("ready");
      },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false };
  }, [token]);

  useEffect(() => load(), [load]);

  const fileBase = (record?.project_name || "export-agreement").replace(/\s+/g, "-");

  const handleOpenDocument = async () => {
    const heading = t("public.agreement");
    // Pop the new tab synchronously inside the click handler so popup blockers
    // don't trip, then point it at the PDF once it has loaded.
    const pdfWindow = window.open("about:blank", "_blank");
    const projectName = record?.project_name || heading;
    if (pdfWindow) {
      pdfWindow.document.title = `${heading} — ${projectName}`;
      pdfWindow.document.documentElement.lang = lang;
      writeNote(pdfWindow.document, heading, projectName, t("sign.tabLoading"));
    }

    // Always the newest copy: the sender may have regenerated since this page loaded.
    let current = doc;
    try { current = await getSignerDocument(token); } catch { /* keep what we have */ }
    setDoc(current);
    // Always an application/pdf Blob, whatever the stored string claims — a
    // blob: URL of another type would open in this origin (see safeDataUrl.ts).
    const pdfBlob = pdfBlobFromDataUrl(current?.pdfData);
    if (!current || !pdfBlob) {
      // Nothing to review, so nothing is unlocked: signing a document you were
      // never shown is exactly what the "open it first" gate exists to stop.
      if (pdfWindow) writeNote(pdfWindow.document, heading, projectName, t("sign.tabNotReady"));
      toast.error(t("sign.toastNotReady"));
      return;
    }

    const url = URL.createObjectURL(pdfBlob);
    if (pdfWindow) pdfWindow.location.href = url;
    else window.location.assign(url); // popup blocked: open it in this tab instead
    // Long enough for the viewer to have read the blob; it holds no secret.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    live.focus("document");
    const res = await recordDocumentViewed(token, current.viewId);
    if (res.ok) {
      setOpenedViewId(current.viewId);
      live.opened();
      setLegacyPath(false);
      setRecord((r) => (r ? { ...r, viewed_pdf_at: new Date().toISOString() } : r));
    } else if (res.code === "document_changed") {
      toast.error(t("audit.toastChanged"));
      load();
    } else if (res.code === "network" || res.code === "server_error") {
      // The function is unreachable: the older RPC still records the opening.
      const ok = await markPdfViewed(token);
      if (ok) {
        setOpenedViewId(current.viewId);
        setLegacyPath(true);
        live.opened();
        setRecord((r) => (r ? { ...r, viewed_pdf_at: new Date().toISOString() } : r));
      } else {
        toast.error(t("sign.toastViewFailed"));
      }
    } else {
      toast.error(t("sign.toastViewFailed"));
    }
  };

  const handleSubmit = async () => {
    const signer = name.trim();
    if (!signer || !signature) {
      toast.error(t("sign.toastMissing"));
      return;
    }
    if (!openedViewId) {
      toast.error(t("sign.gate"));
      return;
    }
    setSubmitting(true);
    live.focus("submit");
    let signedOk = false;
    if (legacyPath) {
      signedOk = await submitCounterSignature({ token, name: signer, signature });
    } else {
      const res = await submitSignature({ token, viewId: openedViewId, name: signer, signature });
      if (res.code === "document_changed") {
        setSubmitting(false);
        setOpenedViewId(null);
        toast.error(t("audit.toastChanged"));
        load();
        return;
      }
      if (res.code === "not_viewed") {
        setSubmitting(false);
        setOpenedViewId(null);
        toast.error(t("sign.gate"));
        return;
      }
      signedOk = res.ok;
    }
    // Read the row back rather than thanking someone whose signature was
    // never stored (the link may have been used or revoked meanwhile).
    let stored: AgreementSignature | null = null;
    if (signedOk) {
      try { stored = await getSignatureToken(token); } catch { stored = null; }
    }
    setSubmitting(false);
    if (stored?.status === "signed" && stored.counter_signer_name === signer) {
      setRecord(stored);
      live.signed();
      toast.success(t("sign.toastSigned"));
    } else if (stored) {
      setRecord(stored);
      toast.error(t("sign.toastSaveFailed"));
    } else {
      toast.error(t("sign.toastSaveFailed"));
    }
  };

  const handleDownloadSigned = async () => {
    setDownloading(true);
    try {
      let final = await getFinalPdf(token);
      if (!final) {
        await finaliseSignature(token);
        final = await getFinalPdf(token);
      }
      if (!final || !downloadPdf(final.pdfData, `signed-${fileBase}.pdf`)) {
        toast.error(t("audit.toastCopyFailed"));
      } else {
        // Reflect the new fingerprint without a reload.
        setRecord((r) => (r ? { ...r, final_sha256: final!.sha256 } : r));
      }
    } finally {
      setDownloading(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6" aria-busy="true">
        <p className="text-sm text-muted-foreground" role="status">{t("public.loading")}</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3" role="alert">
          <h1 className="text-xl font-semibold">{t("public.loadErrorTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("public.loadErrorBody")}</p>
          <Button variant="outline" onClick={load}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("public.retry")}
          </Button>
        </div>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">{t("sign.notFoundTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("sign.notFoundBody")}</p>
        </div>
      </main>
    );
  }

  const alreadySigned = record.status === "signed";
  const hasViewed = !!openedViewId;

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("sign.kicker")}
        </div>
        <h1 className="text-2xl font-semibold text-foreground wrap-break-word">
          {record.project_name || t("public.agreement")}
        </h1>
        {!alreadySigned && <p className="text-sm text-muted-foreground">{t("sign.intro")}</p>}
      </header>

      {!alreadySigned && senderHere && (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-2 dark:border-sky-900 dark:bg-sky-950/40" role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-semibold text-sky-800 dark:text-sky-300">
            <Radio className="h-4 w-4 animate-pulse" aria-hidden="true" />
            {live.peer.name ? fill(t("together.senderHereNamed"), { name: live.peer.name }) : t("together.senderHere")}
          </div>
          <p className="text-xs text-sky-800/90 dark:text-sky-300/90">{t("together.signerNote")}</p>
          {live.peer.ink && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-sky-800/90 dark:text-sky-300/90">{t("together.senderSignature")}</span>
              <span className="rounded-md border border-sky-200 bg-white p-1 inline-block">
                <img src={live.peer.ink} alt={t("together.senderSignature")} className="max-h-[48px] object-contain" />
              </span>
            </div>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setShareLive(false)}>
            {t("together.leave")}
          </Button>
        </section>
      )}
      {!alreadySigned && !shareLive && (
        <p className="text-xs text-muted-foreground">
          {t("together.left")}{" "}
          <button type="button" className="underline" onClick={() => setShareLive(true)}>{t("together.rejoin")}</button>
        </p>
      )}

      {alreadySigned ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-3 dark:border-emerald-900 dark:bg-emerald-950/40" role="status">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            {t("sign.signedTitle")}
          </div>
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            {fillNodes(t("sign.signedBy"), {
              name: <strong>{record.counter_signer_name}</strong>,
              date: formatLongDate(lang, record.counter_signed_at ? new Date(record.counter_signed_at) : new Date()),
            })}
          </p>
          {isImageDataUrl(record.counter_signer_signature) && (
            <div className="rounded-md border border-emerald-200 bg-white p-2 inline-block">
              <img
                src={record.counter_signer_signature}
                alt={t("sign.signatureAlt")}
                className="max-h-[80px] object-contain"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={handleDownloadSigned} disabled={downloading}>
              {downloading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
              {t("audit.downloadSigned")}
            </Button>
            {record.audit_id && (
              <Button asChild variant="outline">
                <Link to={`/verify/${record.audit_id}`}>
                  <Fingerprint className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t("audit.checkLink")}
                </Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">{t("audit.signedNote")}</p>
        </section>
      ) : (
        <>
          {/* Open-document gate */}
          <section className={cn("space-y-2 rounded-xl transition-shadow", pointedAt("document") && "ring-2 ring-sky-400 ring-offset-4 ring-offset-background")}>
            {pointedAt("document") && <PointedHere label={t("together.pointedHere")} />}
            <Button
              variant={hasViewed ? "outline" : "default"}
              onClick={handleOpenDocument}
              className="w-full sm:w-auto"
            >
              <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
              {hasViewed ? t("sign.openAgain") : t("sign.open")}
              <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </Button>
            <div aria-live="polite">
              {hasViewed && (
                <div className="space-y-0.5">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("sign.opened")}
                  </p>
                  {doc?.sha256 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{t("audit.fingerprint")}</span>
                      <code className="font-mono" title={doc.sha256}>{shortHash(doc.sha256)}</code>
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* The agreement beside a translation in the signer's language. */}
          <AgreementSideBySide snapshot={doc?.snapshot ?? null} supplied={supplied} />

          {/* Sign panel — blocker until viewed. The fieldset disables every
              control behind the overlay, so the keyboard can't reach them
              either (the overlay only stops the mouse). */}
          <section className="relative rounded-xl border border-border bg-card p-5">
            {!hasViewed && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85 backdrop-blur-xs p-4 text-center">
                <p className="text-sm font-medium text-foreground max-w-xs">{t("sign.gate")}</p>
              </div>
            )}

            <fieldset disabled={!hasViewed} aria-hidden={!hasViewed || undefined} className="space-y-4 min-w-0">
              <div className={cn("rounded-md transition-shadow", pointedAt("name") && "ring-2 ring-sky-400 ring-offset-4 ring-offset-card")}>
                {pointedAt("name") && <PointedHere label={t("together.pointedHere")} />}
                <label htmlFor="sign-name" className="text-xs text-muted-foreground mb-1 block">{t("sign.fullName")}</label>
                <Input
                  id="sign-name"
                  autoComplete="name"
                  maxLength={200}
                  placeholder={t("sign.fullNamePlaceholder")}
                  value={name}
                  onFocus={() => live.focus("name")}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (senderHere) live.draft(e.target.value);
                  }}
                />
              </div>
              <div>
                <label htmlFor="sign-date" className="text-xs text-muted-foreground mb-1 block">{t("sign.date")}</label>
                <Input id="sign-date" value={today} readOnly className="bg-secondary/50" />
              </div>
              <div
                role="group"
                aria-labelledby="sign-signature-label"
                className={cn("rounded-md transition-shadow", pointedAt("signature") && "ring-2 ring-sky-400 ring-offset-4 ring-offset-card")}
                onPointerDown={() => live.focus("signature")}
              >
                {pointedAt("signature") && <PointedHere label={t("together.pointedHere")} />}
                <span id="sign-signature-label" className="text-xs text-muted-foreground mb-1 block">{t("sign.signature")}</span>
                <SignaturePad
                  value={signature}
                  onChange={(v) => {
                    setSignature(v);
                    if (senderHere) live.ink(v);
                  }}
                />
              </div>

              {/* Said BEFORE the button that records it (UK GDPR Art 13). */}
              <p className="text-xs text-muted-foreground" id="sign-audit-notice">{t("audit.notice")}</p>

              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !signature || submitting}
                className="w-full sm:w-auto"
                aria-describedby="sign-audit-notice"
              >
                {submitting ? t("sign.submitting") : t("sign.submit")}
              </Button>
            </fieldset>
          </section>
        </>
      )}
    </main>
  );
};

export default Sign;
