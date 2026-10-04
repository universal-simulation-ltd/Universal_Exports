import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download, Eye, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgreementView, type AgreementViewRow } from "@/lib/agreementViewStore";
import { pdfBlobFromDataUrl } from "@/lib/safeDataUrl";
import { useI18n } from "@/lib/i18n";
import { fill, formatLongDate } from "@/lib/i18n/format";

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
  // Whoever scans the QR — often the buyer abroad, or a customs officer —
  // reads the page chrome in their own language. The agreement's own field
  // labels and values stay as the drafter wrote them.
  const { t, lang } = useI18n();
  const [view, setView] = useState<AgreementViewRow | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setStatus("loading");
    getAgreementView(token).then(
      (r) => {
        if (!active) return;
        setView(r);
        setStatus("ready");
      },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false; };
  }, [token]);

  useEffect(() => load(), [load]);

  // The PDF is stored as a data URL; iframes and downloads behave better with
  // a blob URL (Safari refuses top-level data: navigation entirely).
  // ⚠️ Built as application/pdf whatever the row claims: the row is written by
  // the drafter, and a blob: URL of another type (text/html) would run as a
  // page of THIS origin inside the iframe. See safeDataUrl.ts.
  useEffect(() => {
    const blob = pdfBlobFromDataUrl(view?.pdf_data);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [view]);

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

  if (!view) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">{t("view.notFoundTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("view.notFoundBody")}</p>
        </div>
      </main>
    );
  }

  const snap = view.snapshot ?? ({} as AgreementViewRow["snapshot"]);
  const downloadName = `${(view.project_name || "export-agreement").replace(/\s+/g, "-")}.pdf`;

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          {t("view.kicker")}
        </div>
        <h1 className="text-2xl font-semibold text-foreground wrap-break-word">
          {view.project_name || t("public.agreement")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {snap.role ? `${fill(t("view.preparedAs"), { role: snap.role })} · ` : ""}
          {fill(t("view.generated"), { date: formatLongDate(lang, new Date(view.created_at)) })}
        </p>
      </header>

      {/* The document itself */}
      {pdfUrl && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {snap.signedBy ? t("view.signedCopy") : t("view.unsignedCopy")}
            </span>
            <Button asChild variant="outline" size="sm">
              <a href={pdfUrl} download={downloadName}>
                <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {t("view.download")}
              </a>
            </Button>
          </div>
          <iframe
            title={t("public.agreement")}
            src={pdfUrl}
            className="w-full h-[60vh] min-h-[360px] sm:h-[560px] rounded-md border border-input bg-muted"
          />
        </section>
      )}

      {/* Transaction overview */}
      {snap.fields && snap.fields.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("view.overview")}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-4 gap-y-1.5 text-sm">
            {snap.fields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted-foreground">{f.label}</dt>
                <dd className="text-foreground wrap-break-word">{f.value || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Products */}
      {snap.products && snap.products.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("view.products")}</h2>
          <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-1.5 font-medium">{t("view.colDescription")}</th>
                <th className="py-1.5 font-medium">{t("view.colUnits")}</th>
                <th className="py-1.5 font-medium text-right">{t("view.colUnitPrice")}</th>
                <th className="py-1.5 font-medium text-right">{t("view.colTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {snap.products.map((p, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5">{p.name || "—"}</td>
                  <td className="py-1.5">{p.units || "—"}</td>
                  <td className="py-1.5 text-right">{p.unitPrice || "—"}</td>
                  <td className="py-1.5 text-right">{p.total || "—"}</td>
                </tr>
              ))}
            </tbody>
            {snap.totals && (
              <tfoot>
                <tr className="font-semibold">
                  <td className="pt-2" colSpan={3}>{t("view.colTotal")}</td>
                  <td className="pt-2 text-right">
                    {`${snap.totals.currency} ${snap.totals.amount}`.trim()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
          </div>
        </section>
      )}

      {/* Documents provided */}
      {snap.documents && snap.documents.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("view.documents")}</h2>
          <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-1.5 font-medium">{t("view.colDocument")}</th>
                <th className="py-1.5 font-medium">{t("view.colReference")}</th>
                <th className="py-1.5 font-medium">{t("doc.date")}</th>
                <th className="py-1.5 font-medium text-right">{t("view.colValue")}</th>
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
          </div>
        </section>
      )}

      {/* Expected tariffs */}
      {snap.tariffs && snap.tariffs.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("view.tariffs")}</h2>
          <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-1.5 font-medium">{t("view.colProduct")}</th>
                <th className="py-1.5 font-medium">{t("view.colHsCode")}</th>
                <th className="py-1.5 font-medium">{t("view.colDuty")}</th>
                <th className="py-1.5 font-medium text-right">{t("view.colVat")}</th>
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
          </div>
        </section>
      )}

      {/* Signature status */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h2 className="text-sm font-semibold text-foreground">{t("view.signedBy")}</h2>
        {snap.signedBy ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {snap.signedBy.name} — {snap.signedBy.date}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("view.awaiting")}</p>
        )}
      </section>
    </main>
  );
};

export default AgreementView;
