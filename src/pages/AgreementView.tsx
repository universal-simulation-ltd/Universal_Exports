import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { Download, Eye, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgreementView, type AgreementViewRow } from "@/lib/agreementViewStore";

/**
 * Public read-only agreement page — the QR stamped on every generated Export
 * Agreement PDF opens here. Renders the snapshot of the agreement data plus
 * the stored PDF (embedded + downloadable).
 *
 * No auth required — the uuid token in the URL is the bearer credential;
 * reads go through the token-gated get_agreement_view RPC.
 */
const AgreementView = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [view, setView] = useState<AgreementViewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAgreementView(token).then((r) => {
      if (!active) return;
      setView(r);
      setLoading(false);
    });
    return () => { active = false; };
  }, [token]);

  // The PDF is stored as a data URL; iframes and downloads behave better with
  // a blob URL (Safari refuses top-level data: navigation entirely).
  useEffect(() => {
    if (!view?.pdf_data.startsWith("data:")) return;
    let url: string | null = null;
    let active = true;
    fetch(view.pdf_data)
      .then((r) => r.blob())
      .then((b) => {
        if (!active) return;
        url = URL.createObjectURL(b);
        setPdfUrl(url);
      })
      .catch(() => { /* leave pdfUrl null — the snapshot still renders */ });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [view]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!view) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Agreement not found</h1>
          <p className="text-sm text-muted-foreground">
            This view link is invalid or has been removed. Please ask the sender
            for a fresh copy of the agreement.
          </p>
        </div>
      </main>
    );
  }

  const snap = view.snapshot ?? ({} as AgreementViewRow["snapshot"]);
  const downloadName = `${(view.project_name || "export-agreement").replace(/\s+/g, "-")}.pdf`;

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Read-only agreement
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {view.project_name || "Export Agreement"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {snap.role ? `Prepared as ${snap.role} · ` : ""}
          Generated {format(new Date(view.created_at), "PPP")}. This is a
          read-only copy shared via the QR code on the document.
        </p>
      </header>

      {/* The document itself */}
      {pdfUrl && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {snap.signedBy ? "Signed copy" : "Overview (unsigned)"}
            </span>
            <a href={pdfUrl} download={downloadName}>
              <Button type="button" variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PDF
              </Button>
            </a>
          </div>
          <iframe
            title="Export Agreement"
            src={pdfUrl}
            className="w-full h-[560px] rounded-md border border-input bg-muted"
          />
        </section>
      )}

      {/* Transaction overview */}
      {snap.fields && snap.fields.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Transaction Overview</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1.5 text-sm">
            {snap.fields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="text-foreground break-words">{f.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Products */}
      {snap.products && snap.products.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Products</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-1.5 font-medium">Description</th>
                <th className="py-1.5 font-medium">Units</th>
                <th className="py-1.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {snap.products.map((p, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{p.name || "—"}</td>
                  <td className="py-1.5">{p.units || "—"}</td>
                  <td className="py-1.5 text-right">{p.total || "—"}</td>
                </tr>
              ))}
            </tbody>
            {snap.totals && (
              <tfoot>
                <tr className="font-semibold">
                  <td className="pt-2" colSpan={2}>Total</td>
                  <td className="pt-2 text-right">
                    {`${snap.totals.currency} ${snap.totals.amount}`.trim()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      )}

      {/* Documents provided */}
      {snap.documents && snap.documents.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Documents Provided</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-1.5 font-medium">Document</th>
                <th className="py-1.5 font-medium">Reference</th>
                <th className="py-1.5 font-medium">Date</th>
                <th className="py-1.5 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {snap.documents.map((d, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{d.label || "—"}</td>
                  <td className="py-1.5">{d.reference || "—"}</td>
                  <td className="py-1.5">{d.date || "—"}</td>
                  <td className="py-1.5 text-right">{d.value || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Expected tariffs */}
      {snap.tariffs && snap.tariffs.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Expected Tariffs</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-1.5 font-medium">Product</th>
                <th className="py-1.5 font-medium">HS code</th>
                <th className="py-1.5 font-medium">Duty</th>
                <th className="py-1.5 font-medium text-right">VAT</th>
              </tr>
            </thead>
            <tbody>
              {snap.tariffs.map((t, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{t.product || "—"}</td>
                  <td className="py-1.5">{t.hsCode || "—"}</td>
                  <td className="py-1.5">{t.duty || "—"}</td>
                  <td className="py-1.5 text-right">{t.vat || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Signature status */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Signed by</h2>
        {snap.signedBy ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {snap.signedBy.name} — {snap.signedBy.date}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Awaiting signature.</p>
        )}
      </section>
    </main>
  );
};

export default AgreementView;
