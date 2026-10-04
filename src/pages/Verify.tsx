import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useFileDrop } from "@unisim/sdk";
import { CheckCircle2, FileSearch, Fingerprint, RotateCcw, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  sha256Hex,
  verifyAgreement,
  verifyPdfHash,
  type HashMatch,
  type VerifiedAgreement,
} from "@/lib/auditStore";
import { useI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";

/**
 * Public verify page — the address and QR printed on every signed copy's
 * audit page open here (/verify/<audit id>); /verify on its own checks any file.
 *
 * Drop a PDF and its SHA-256 is computed in this browser (the file is never
 * uploaded), then looked up. With an audit id, the record's own timeline is
 * shown and the file is compared with the two fingerprints it holds: the
 * signed copy, and the agreement as the other party opened and signed it.
 * No IP addresses or browsers here — those are for the two parties only.
 */

type Outcome =
  | { kind: "final"; match?: HashMatch }
  | { kind: "signed_document"; match?: HashMatch }
  | { kind: "generated"; match: HashMatch }
  | { kind: "other_record"; match: HashMatch }
  | { kind: "none" };

function formatDateTime(lang: string, iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: "long", timeStyle: "medium", timeZone: "UTC" }).format(new Date(iso)) + " UTC";
  } catch {
    return iso;
  }
}

const Verify = () => {
  const { auditId = "" } = useParams<{ auditId: string }>();
  const { t, lang } = useI18n();
  const [record, setRecord] = useState<VerifiedAgreement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(auditId ? "loading" : "ready");
  const [checking, setChecking] = useState(false);
  const [file, setFile] = useState<{ name: string; sha: string } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const load = useCallback(() => {
    if (!auditId) return;
    let active = true;
    setStatus("loading");
    verifyAgreement(auditId).then(
      (r) => { if (active) { setRecord(r); setStatus("ready"); } },
      () => { if (active) setStatus("error"); },
    );
    return () => { active = false; };
  }, [auditId]);
  useEffect(() => load(), [load]);

  const check = async (f: File | undefined) => {
    if (!f) return;
    setChecking(true);
    setOutcome(null);
    try {
      const sha = await sha256Hex(await f.arrayBuffer());
      setFile({ name: f.name, sha });
      if (record?.final_sha256 === sha) { setOutcome({ kind: "final" }); return; }
      if (record?.document_sha256 === sha && record.status === "signed") { setOutcome({ kind: "signed_document" }); return; }
      const matches = await verifyPdfHash(sha);
      const best = matches.find((m) => m.match === "final")
        ?? matches.find((m) => m.match === "signed_document")
        ?? matches.find((m) => m.match === "generated");
      if (!best) setOutcome({ kind: "none" });
      else if (record && best.audit_id && best.audit_id !== record.audit_id) setOutcome({ kind: "other_record", match: best });
      else if (best.match === "generated") setOutcome({ kind: "generated", match: best });
      else setOutcome({ kind: best.match, match: best });
    } catch {
      setOutcome(null);
      setFile(null);
      setStatus("error");
    } finally {
      setChecking(false);
    }
  };

  const drop = useFileDrop({
    onFiles: (files) => { void check(files[0]); },
    accept: "application/pdf",
    multiple: false,
    // The button below opens the picker; the whole box stays a drop target.
    clickToBrowse: false,
  });

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
          <Button variant="outline" onClick={() => { setStatus(auditId ? "loading" : "ready"); load(); }}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("public.retry")}
          </Button>
        </div>
      </main>
    );
  }

  const events: { label: string; at: string | null | undefined; who?: string }[] = record
    ? [
        { label: t("verify.evCreated"), at: record.created_at },
        { label: t("verify.evSent"), at: record.sent_at },
        { label: t("verify.evOpened"), at: record.viewed_pdf_at },
        { label: t("verify.evSigned"), at: record.counter_signed_at, who: record.counter_signer_name || undefined },
        { label: t("verify.evSealed"), at: record.finalised_at },
      ]
    : [];

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Fingerprint className="h-3.5 w-3.5" aria-hidden="true" />
          {t("verify.kicker")}
        </div>
        <h1 className="text-2xl font-semibold text-foreground break-words">
          {record ? record.project_name || t("public.agreement") : t("verify.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("verify.intro")}</p>
      </header>

      {auditId && !record && (
        <section className="rounded-xl border border-border bg-card p-5" role="status">
          <h2 className="text-sm font-semibold">{t("verify.notFoundTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("verify.notFoundBody")}</p>
        </section>
      )}

      {record && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("verify.timeline")}</h2>
          <ol className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.label} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-4">
                <span className="text-muted-foreground">{e.label}</span>
                <span className="text-foreground break-words">
                  {e.at ? formatDateTime(lang, e.at) : t("verify.notRecorded")}
                  {e.who && e.at ? ` — ${e.who}` : ""}
                </span>
              </li>
            ))}
          </ol>
          {record.drafter_signed_by && (
            <p className="text-xs text-muted-foreground">{fill(t("verify.senderSigned"), { name: record.drafter_signed_by })}</p>
          )}
          {record.status !== "signed" && <p className="text-sm text-amber-700 dark:text-amber-400">{t("verify.notSignedYet")}</p>}
        </section>
      )}

      <section
        {...drop.dropzoneProps}
        className={`rounded-xl border-2 border-dashed p-6 text-center space-y-3 transition-colors ${drop.over ? "border-primary bg-primary/5" : "border-border bg-card"}`}
      >
        <input {...drop.inputProps} aria-label={t("verify.choose")} className="hidden" />
        <FileSearch className="h-8 w-8 mx-auto text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">{t("verify.dropTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("verify.dropBody")}</p>
        <Button type="button" variant="outline" onClick={drop.open} disabled={checking}>
          <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
          {checking ? t("verify.checking") : t("verify.choose")}
        </Button>
      </section>

      <div aria-live="polite">
        {file && outcome && (
          <section
            className={`rounded-xl border p-5 space-y-2 ${
              outcome.kind === "final" || outcome.kind === "signed_document"
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                : outcome.kind === "none"
                  ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                  : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {outcome.kind === "final" || outcome.kind === "signed_document"
                ? <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                : outcome.kind === "none"
                  ? <ShieldAlert className="h-5 w-5 text-red-700 dark:text-red-400" aria-hidden="true" />
                  : <CheckCircle2 className="h-5 w-5 text-amber-700 dark:text-amber-400" aria-hidden="true" />}
              <span>
                {outcome.kind === "final" && t("verify.resFinal")}
                {outcome.kind === "signed_document" && t("verify.resSignedDocument")}
                {outcome.kind === "generated" && t("verify.resGenerated")}
                {outcome.kind === "other_record" && t("verify.resOtherRecord")}
                {outcome.kind === "none" && t("verify.resNone")}
              </span>
            </div>
            <p className="text-sm">
              {outcome.kind === "final" && t("verify.resFinalBody")}
              {outcome.kind === "signed_document" && t("verify.resSignedDocumentBody")}
              {outcome.kind === "generated" && fill(t("verify.resGeneratedBody"), { name: outcome.match.project_name || t("public.agreement") })}
              {outcome.kind === "other_record" && fill(t("verify.resOtherRecordBody"), { name: outcome.match.project_name || t("public.agreement") })}
              {outcome.kind === "none" && t("verify.resNoneBody")}
            </p>
            {!auditId && outcome.kind !== "none" && outcome.kind !== "generated" && "match" in outcome && outcome.match?.audit_id && (
              <p className="text-sm">
                <Link className="underline" to={`/verify/${outcome.match.audit_id}`}>
                  {t("verify.openRecord")}
                </Link>
              </p>
            )}
            <p className="text-xs text-muted-foreground break-all">
              {fill(t("verify.fileHash"), { name: file.name })} <code className="font-mono">{file.sha}</code>
            </p>
          </section>
        )}
      </div>

      {record && (record.document_sha256 || record.final_sha256) && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-2 text-xs">
          <h2 className="text-sm font-semibold text-foreground">{t("verify.fingerprints")}</h2>
          {record.final_sha256 && (
            <p className="break-all"><span className="text-muted-foreground">{t("verify.fpFinal")}</span> <code className="font-mono">{record.final_sha256}</code></p>
          )}
          {record.document_sha256 && (
            <p className="break-all"><span className="text-muted-foreground">{t("verify.fpDocument")}</span> <code className="font-mono">{record.document_sha256}</code></p>
          )}
        </section>
      )}
    </main>
  );
};

export default Verify;
