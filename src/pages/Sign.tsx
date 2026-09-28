import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { FileText, ShieldCheck, ExternalLink, CheckCircle2 } from "lucide-react";
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
/** A stored `data:application/pdf;base64,…` URL as a Blob. A data: URL can't be
 *  navigated to as a top-level page in Chromium, but a blob: URL can. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64 = ""] = dataUrl.split(",", 2);
  const mime = /^data:([^;,]+)/.exec(head)?.[1] ?? "application/pdf";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** A plain message in the review tab. Built with the DOM API rather than
 *  innerHTML: project_name is set by the drafter and shown to the signer, so a
 *  template string would be a stored-XSS sink; textContent escapes it. */
function writeNote(doc: Document, projectName: string, message: string) {
  doc.body.replaceChildren();
  const wrap = doc.createElement("div");
  wrap.setAttribute("style", "font-family: system-ui, sans-serif; padding: 40px; max-width: 720px; margin: 40px auto;");
  const h1 = doc.createElement("h1");
  h1.setAttribute("style", "font-size: 22px; margin-bottom: 8px;");
  h1.textContent = "Export Agreement";
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
  const [record, setRecord] = useState<AgreementSignature | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    let active = true;
    getSignatureToken(token).then((r) => {
      if (!active) return;
      setRecord(r);
      setLoading(false);
    });
    return () => { active = false };
  }, [token]);

  const handleOpenDocument = async () => {
    // Pop the new tab synchronously inside the click handler so popup blockers
    // don't trip, then point it at the PDF once it has loaded.
    const pdfWindow = window.open("about:blank", "_blank");
    const projectName = record?.project_name ?? "Export Agreement";
    if (pdfWindow) {
      pdfWindow.document.title = `Export Agreement — ${projectName}`;
      writeNote(pdfWindow.document, projectName, "Loading the agreement…");
    }

    // The real agreement: the newest PDF the drafter generated or signed for
    // this project, as stored for its QR view (platform migration 0193).
    const pdf = await getSignaturePdf(token);
    if (!pdf) {
      // Nothing to review, so nothing is unlocked: signing a document you were
      // never shown is exactly what the "open it first" gate exists to stop.
      if (pdfWindow) {
        writeNote(
          pdfWindow.document,
          projectName,
          "The sender hasn't generated the Export Agreement PDF yet, so there is nothing to review. " +
            "Ask them to generate it, then open your signing link again.",
        );
      }
      toast.error("The agreement isn't ready to review yet — ask the sender to generate it.");
      return;
    }

    const url = URL.createObjectURL(dataUrlToBlob(pdf.pdfData));
    if (pdfWindow) pdfWindow.location.href = url;
    else window.location.assign(url); // popup blocked: open it in this tab instead
    // Long enough for the viewer to have read the blob; it holds no secret.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);

    const ok = await markPdfViewed(token);
    if (ok) {
      setRecord((r) => (r ? { ...r, viewed_pdf_at: new Date().toISOString() } : r));
    } else {
      toast.error("Could not record that you viewed the document. Please refresh and try again.");
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !signature) {
      toast.error("Please enter your name and sign before submitting.");
      return;
    }
    setSubmitting(true);
    const ok = await submitCounterSignature({ token, name: name.trim(), signature });
    setSubmitting(false);
    if (ok) {
      setRecord((r) => (
        r ? {
          ...r,
          status: "signed",
          counter_signer_name: name.trim(),
          counter_signer_signature: signature,
          counter_signed_at: new Date().toISOString(),
        } : r
      ));
      toast.success("Signature submitted — thank you.");
    } else {
      toast.error("Could not save your signature. Please try again.");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Link not found</h1>
          <p className="text-sm text-muted-foreground">
            This counter-sign link is invalid or has been revoked. Please ask the sender for a fresh link.
          </p>
        </div>
      </main>
    );
  }

  const alreadySigned = record.status === "signed";
  const hasViewed = !!record.viewed_pdf_at;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Counter-sign request
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {record.project_name || "Export Agreement"}
        </h1>
        <p className="text-sm text-muted-foreground">
          You've been asked to counter-sign this Export Agreement. Please open and review
          the document before signing below.
        </p>
      </header>

      {alreadySigned ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            Signed — thank you
          </div>
          <p className="text-sm text-emerald-800">
            Counter-signed by <strong>{record.counter_signer_name}</strong> on{" "}
            {record.counter_signed_at
              ? format(new Date(record.counter_signed_at), "PPP")
              : "today"}.
          </p>
          {record.counter_signer_signature && (
            <div className="rounded-md border border-emerald-200 bg-white p-2 inline-block">
              <img
                src={record.counter_signer_signature}
                alt="Counter-signature"
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
              <FileText className="mr-2 h-4 w-4" />
              {hasViewed ? "Open document again" : "Open document"}
              <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
            </Button>
            {hasViewed && (
              <p className="text-xs text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Document opened — you can now sign below.
              </p>
            )}
          </section>

          {/* Sign panel — blocker until viewed */}
          <section className="relative rounded-xl border border-border bg-card p-5 space-y-4">
            {!hasViewed && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/85 backdrop-blur-sm p-4 text-center">
                <p className="text-sm font-medium text-foreground max-w-xs">
                  Please open and review the Export Agreement before signing.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
              <Input
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!hasViewed}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input value={today} readOnly className="bg-secondary/50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Signature</label>
              <SignaturePad value={signature} onChange={setSignature} />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!hasViewed || !name.trim() || !signature || submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? "Submitting…" : "Submit signature"}
            </Button>
          </section>
        </>
      )}
    </main>
  );
};

export default Sign;
