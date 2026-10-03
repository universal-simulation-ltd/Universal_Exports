import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, ShieldCheck, ExternalLink, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SignaturePad from "@/components/SignaturePad";
import { toast } from "sonner";
import {
  getSignaturePdf,
  getSignatureToken,
  markPdfViewed,
  submitCounterSignature,
  type AgreementSignature,
} from "@/lib/signatureStore";
import { isImageDataUrl, pdfBlobFromDataUrl } from "@/lib/safeDataUrl";
import { useI18n } from "@/lib/i18n";
import { fillNodes, formatLongDate } from "@/lib/i18n/format";

/**
 * Counter-sign landing page — the QR / link the drafter sends opens here.
 *
 * Flow:
 *   1. Load the token row from Supabase.
 *   2. Show a blocker until they click "Open document", which opens the real
 *      agreement PDF (the drafter's newest generated copy) in a new tab and
 *      records `viewed_pdf_at`. No PDF stored yet ⇒ nothing is unlocked.
 *   3. After viewing, the name input + signature pad unlock. Date is auto-
 *      filled to today.
 *   4. Submit flips the row to status='signed' and shows a success state.
 *
 * No auth required — the token uuid in the URL is the bearer credential.
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

const Sign = () => {
  const { token = "" } = useParams<{ token: string }>();
  // The signer is usually the OTHER side of the trade, often abroad: every
  // string here follows their language (the SDK's: browser, unless they chose).
  const { t, lang } = useI18n();
  const [record, setRecord] = useState<AgreementSignature | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = formatLongDate(lang, new Date());

  const load = useCallback(() => {
    let active = true;
    setStatus("loading");
    getSignatureToken(token).then(
      (r) => {
        if (!active) return;
        setRecord(r);
        setStatus("ready");
      },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false };
  }, [token]);

  useEffect(() => load(), [load]);

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

    // The real agreement: the newest PDF the drafter generated or signed for
    // this project, as stored for its QR view (platform migration 0193).
    const pdf = await getSignaturePdf(token);
    // Always an application/pdf Blob, whatever the stored string claims — a
    // blob: URL of another type would open in this origin (see safeDataUrl.ts).
    const pdfBlob = pdfBlobFromDataUrl(pdf?.pdfData);
    if (!pdfBlob) {
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

    const ok = await markPdfViewed(token);
    if (ok) {
      setRecord((r) => (r ? { ...r, viewed_pdf_at: new Date().toISOString() } : r));
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
    setSubmitting(true);
    const ok = await submitCounterSignature({ token, name: signer, signature });
    // The RPC succeeds silently when it changes nothing (the link was already
    // used, or revoked meanwhile), so read the row back rather than thanking
    // someone whose signature was never stored.
    let stored: AgreementSignature | null = null;
    if (ok) {
      try { stored = await getSignatureToken(token); } catch { stored = null; }
    }
    setSubmitting(false);
    if (stored?.status === "signed" && stored.counter_signer_name === signer) {
      setRecord(stored);
      toast.success(t("sign.toastSigned"));
    } else if (stored) {
      // Someone else's signature (or none) is on record: show the row as it is.
      setRecord(stored);
      toast.error(t("sign.toastSaveFailed"));
    } else {
      toast.error(t("sign.toastSaveFailed"));
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
  const hasViewed = !!record.viewed_pdf_at;

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("sign.kicker")}
        </div>
        <h1 className="text-2xl font-semibold text-foreground break-words">
          {record.project_name || t("public.agreement")}
        </h1>
        {!alreadySigned && <p className="text-sm text-muted-foreground">{t("sign.intro")}</p>}
      </header>

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
        </section>
      ) : (
        <>
          {/* Open-document gate */}
          <section className="space-y-2">
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
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("sign.opened")}
                </p>
              )}
            </div>
          </section>

          {/* Sign panel — blocker until viewed. The fieldset disables every
              control behind the overlay, so the keyboard can't reach them
              either (the overlay only stops the mouse). */}
          <section className="relative rounded-xl border border-border bg-card p-5">
            {!hasViewed && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85 backdrop-blur-sm p-4 text-center">
                <p className="text-sm font-medium text-foreground max-w-xs">{t("sign.gate")}</p>
              </div>
            )}

            <fieldset disabled={!hasViewed} aria-hidden={!hasViewed || undefined} className="space-y-4 min-w-0">
              <div>
                <label htmlFor="sign-name" className="text-xs text-muted-foreground mb-1 block">{t("sign.fullName")}</label>
                <Input
                  id="sign-name"
                  autoComplete="name"
                  placeholder={t("sign.fullNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="sign-date" className="text-xs text-muted-foreground mb-1 block">{t("sign.date")}</label>
                <Input id="sign-date" value={today} readOnly className="bg-secondary/50" />
              </div>
              <div role="group" aria-labelledby="sign-signature-label">
                <span id="sign-signature-label" className="text-xs text-muted-foreground mb-1 block">{t("sign.signature")}</span>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !signature || submitting}
                className="w-full sm:w-auto"
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
