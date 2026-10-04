import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Copy, Loader2, RotateCcw, CheckCircle2, Mail, Send, Download, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { UnisimQr } from "@unisim/sdk";
import {
  createSignatureToken,
  listSignatureTokens,
  type AgreementSignature,
} from "@/lib/signatureStore";
import { finaliseSignature, getFinalPdf, markSent, shortHash } from "@/lib/auditStore";
import { BASE_PATH } from "@/lib/basePath";
import { isImageDataUrl, pdfBlobFromDataUrl } from "@/lib/safeDataUrl";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { fill, fillNodes } from "@/lib/i18n/format";

/** What we know about the other party, used to pre-fill the email form. */
export interface CounterpartyHint {
  email?: string;
  contactName?: string;
  registeredName?: string;
  /** Their role/label in the agreement, e.g. "Buyer" / "Seller". */
  role?: string;
}

interface Props {
  projectId:   string;
  projectName: string;
  /** The other party's details, defaulted into the "email this request" form. */
  counterparty?: CounterpartyHint;
}

function formatDateTime(lang: string, iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/**
 * Drafter-side panel for the "They Sign" tab on the Export Agreement page.
 *
 * - On mount, loads any existing tokens for this project. If there's a
 *   `signed` row, surface the counter-signature and its audit trail.
 * - Otherwise, offer a "Generate counter-sign link" button. Once generated,
 *   show the QR code + copyable URL. Copying, emailing or drafting the email
 *   records when the link was sent (the audit trail's "sent" line).
 * - Polls every 8 s while a token is pending so the panel auto-updates when
 *   the other party signs without a manual refresh.
 */
const CounterSignPanel = ({ projectId, projectName, counterparty }: Props) => {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [tokens,      setTokens]      = useState<AgreementSignature[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [downloading, setDownloading] = useState(false);

  // "Email this request" form — pre-filled from the counterparty captured in the
  // agreement, but editable (a different person may actually sign, e.g. their
  // director). Sending goes through the send-export-sign-request Edge Function
  // for signed-in, email-verified users; everyone else (and any provider outage)
  // falls back to opening a mailto: draft, so nothing is ever blocked.
  const [emailTo,   setEmailTo]   = useState(counterparty?.email ?? "");
  const [emailName, setEmailName] = useState(counterparty?.contactName ?? "");
  const [emailRole, setEmailRole] = useState(counterparty?.role ?? "");
  const [sending,   setSending]   = useState(false);

  // Fill the defaults once the counterparty details arrive, without clobbering
  // anything the user has already typed.
  useEffect(() => {
    if (counterparty?.email && !emailTo) setEmailTo(counterparty.email);
    if (counterparty?.contactName && !emailName) setEmailName(counterparty.contactName);
    if (counterparty?.role && !emailRole) setEmailRole(counterparty.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterparty?.email, counterparty?.contactName, counterparty?.role]);

  // The hardcoded "Example" project lives only client-side and is never saved to
  // the backend, so there's nothing to attach a real token to (and creating one
  // would just leave an orphan row). Detect it the same way the rest of the app
  // does (the `demo-` id prefix) and mint the token locally so the QR code and
  // link still render for the demo walkthrough.
  const isDemo = projectId.startsWith("demo-");

  // Pick the most relevant token: the latest signed one if any, else the
  // latest pending. Drafters who regenerate get the freshest pending link.
  const active = tokens.find(t => t.status === "signed")
              ?? tokens.find(t => t.status === "pending")
              ?? null;
  // Include the runtime base path ("/exports" behind the portal Worker's
  // path prefix, "" on universalexports.app) — origin alone can 404.
  const signUrl = active
    ? `${window.location.origin}${BASE_PATH}/sign/${active.id}`
    : "";

  // Initial load + polling. Polling stops once we have a signed row — no
  // further state change is possible.
  useEffect(() => {
    // No backend row exists for the demo project — nothing to load or poll.
    if (isDemo) {
      setLoading(false);
      return;
    }

    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Paused while the tab is hidden (a drafter can leave this open for
    // hours); checked again the moment they come back to it.
    let parked = false;

    const tick = async () => {
      timer = null;
      if (document.hidden) { parked = true; return; }
      const rows = await listSignatureTokens(projectId);
      if (!active) return;
      setTokens(rows);
      setLoading(false);
      const stillPending = rows.some(r => r.status === "pending");
      if (stillPending) {
        timer = setTimeout(tick, 8000);
      }
    };
    const onVisible = () => {
      if (!document.hidden && parked && active) { parked = false; void tick(); }
    };
    document.addEventListener("visibilitychange", onVisible);
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [projectId, isDemo]);

  const noteSent = (via: "email" | "link" | "mailto") => {
    if (!active || isDemo || active.sent_at) return;
    void markSent(active.id, via);
    setTokens((prev) => prev.map((r) => (r.id === active.id ? { ...r, sent_at: new Date().toISOString(), sent_via: via } : r)));
  };

  const handleGenerate = async () => {
    if (!projectId) {
      toast.error(t("cs.saveFirst"));
      return;
    }
    // Demo project: mint a token client-side instead of hitting Supabase. The
    // demo project isn't persisted, so a backend token would just be an orphan
    // row. The QR + link still render so the walkthrough is complete.
    if (isDemo) {
      const row: AgreementSignature = {
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: null,
        project_name: projectName,
        status: "pending",
        counter_signer_name: "",
        counter_signer_signature: "",
        counter_signed_at: null,
        viewed_pdf_at: null,
        created_at: new Date().toISOString(),
      };
      setTokens(prev => [row, ...prev]);
      toast.success(t("cs.linkReady"));
      return;
    }

    setGenerating(true);
    const row = await createSignatureToken({ projectId, projectName });
    setGenerating(false);
    if (row) {
      setTokens(prev => [row, ...prev]);
      toast.success(t("cs.linkReady"));
    } else {
      toast.error(t("cs.linkFailed"));
    }
  };

  const handleCopy = async () => {
    if (!signUrl) return;
    try {
      await navigator.clipboard.writeText(signUrl);
      noteSent("link");
      toast.success(t("cs.copied"));
    } catch {
      toast.error(t("cs.copyFailed"));
    }
  };

  // Open the user's mail client with the request pre-drafted. The universal
  // fallback: works with no account, no backend, offline — nothing is blocked.
  // Written in the DRAFTER's language: it goes out from their own mailbox.
  const openMailtoDraft = () => {
    const subject = fill(t("cs.mailSubject"), { name: projectName });
    const greeting = emailName ? fill(t("cs.mailGreetingName"), { name: emailName }) : t("cs.mailGreeting");
    const body = `${greeting}

${projectName ? fill(t("cs.mailBodyNamed"), { name: projectName }) : t("cs.mailBody")}

${t("cs.mailOpen")}
${signUrl}

${t("cs.mailThanks")}`;
    noteSent("mailto");
    window.location.href = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleSendEmail = async () => {
    if (!signUrl) return;
    const to = emailTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error(t("cs.badEmail"));
      return;
    }

    // Not signed in / unverified, or a demo project (no real token to email) —
    // go straight to a mailto: draft. The Edge Function would reject these.
    const canSendServerSide = !!user?.email_confirmed_at && !isDemo;
    if (!canSendServerSide) {
      openMailtoDraft();
      toast.info(t("cs.draftOpened"));
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-export-sign-request", {
        body: {
          to,
          link: signUrl,
          agreementTitle: projectName,
          recipientName: emailName.trim(),
          role: emailRole.trim(),
          senderName: user?.user_metadata?.full_name || user?.email || "",
        },
      });
      if (!error && (data as { ok?: boolean } | null)?.ok) {
        noteSent("email");
        toast.success(fill(t("cs.emailed"), { email: to }));
      } else {
        // Provider not configured / outage / rejected — never lose the request.
        openMailtoDraft();
        toast.info(t("cs.emailFallback"));
      }
    } catch {
      openMailtoDraft();
      toast.info(t("cs.emailFallback"));
    } finally {
      setSending(false);
    }
  };

  // The signed copy (original pages + their signature + the audit page). The
  // server builds it as the signature lands; if that didn't happen (an older
  // signer page, a hiccup), asking for it builds it now.
  const handleDownloadSigned = async () => {
    if (!active) return;
    setDownloading(true);
    try {
      let final = await getFinalPdf(active.id);
      if (!final) {
        await finaliseSignature(active.id);
        final = await getFinalPdf(active.id);
      }
      const blob = pdfBlobFromDataUrl(final?.pdfData);
      if (!final || !blob) {
        toast.error(t("audit.toastCopyFailed"));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed-${(projectName || "export-agreement").replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setTokens((prev) => prev.map((r) => (r.id === active.id ? { ...r, final_sha256: final!.sha256 } : r)));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        {t("cs.loading")}
      </div>
    );
  }

  // Completed state — counter-signature on record.
  if (active && active.status === "signed") {
    const auditRows: { label: string; value: string }[] = [
      { label: t("cs.auditSent"), value: active.sent_at ? formatDateTime(lang, active.sent_at) : t("cs.auditNotRecorded") },
      { label: t("cs.auditOpened"), value: formatDateTime(lang, active.viewed_pdf_at) },
      { label: t("cs.auditSigned"), value: formatDateTime(lang, active.counter_signed_at) },
    ];
    if (active.signer_ip) auditRows.push({ label: t("cs.auditFrom"), value: active.signer_ip });
    if (active.document_sha256) auditRows.push({ label: t("cs.auditDocument"), value: shortHash(active.document_sha256) });
    if (active.final_sha256) auditRows.push({ label: t("cs.auditFinal"), value: shortHash(active.final_sha256) });
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {t("cs.signedTitle")}
        </div>
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          {fillNodes(t("cs.signedBy"), {
            name: <strong>{active.counter_signer_name}</strong>,
            date: formatDateTime(lang, active.counter_signed_at),
          })}
        </p>
        {/* Written by whoever held the link: show it only if it really is an image. */}
        {isImageDataUrl(active.counter_signer_signature) && (
          <div className="inline-block rounded-md border border-emerald-200 bg-white p-2">
            <img
              src={active.counter_signer_signature}
              alt={t("sign.signatureAlt")}
              className="max-h-[80px] object-contain"
            />
          </div>
        )}
        <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-3 gap-y-1 text-xs">
          {auditRows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-emerald-800/80 dark:text-emerald-300/80">{r.label}</dt>
              <dd className="text-emerald-900 dark:text-emerald-200 font-mono break-all">{r.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={handleDownloadSigned} disabled={downloading}>
            {downloading
              ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              : <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />}
            {t("audit.downloadSigned")}
          </Button>
          {active.audit_id && (
            <Button asChild type="button" variant="outline" size="sm">
              <Link to={`/verify/${active.audit_id}`} target="_blank" rel="noopener">
                <Fingerprint className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                {t("audit.checkLink")}
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            {t("cs.newSigner")}
          </Button>
        </div>
      </div>
    );
  }

  // Pending / no-token state.
  return (
    <div className="space-y-4">
      {!active ? (
        <>
          <p className="text-sm text-muted-foreground max-w-md">{t("cs.intro")}</p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{t("cs.generating")}</>
            ) : (
              t("cs.generate")
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground max-w-md">{t("cs.shareIntro")}</p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="rounded-2xl border border-border bg-white p-2">
              <UnisimQr value={signUrl} size={192} label={t("cs.qrLabel")} />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <label htmlFor="cs-link" className="text-xs text-muted-foreground block">{t("cs.link")}</label>
              <div className="flex gap-2">
                <input
                  id="cs-link"
                  readOnly
                  value={signUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 min-w-0 rounded-md border border-input bg-secondary/50 px-3 py-2 text-xs font-mono"
                />
                <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label={t("cs.copy")}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div aria-live="polite">
                {active.viewed_pdf_at ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">{t("cs.opened")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("cs.waiting")}</p>
                )}
                {active.sent_at && (
                  <p className="text-xs text-muted-foreground">{fill(t("cs.sentAt"), { date: formatDateTime(lang, active.sent_at) })}</p>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={generating}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                {t("cs.regenerate")}
              </Button>
            </div>
          </div>

          {/* Email the request directly to the other party. Defaults from the
              counterparty captured in the agreement; editable in case someone
              else signs. Sends via the Edge Function for verified users, else
              opens a mailto: draft. */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("cs.emailTitle")}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="cs-email-name" className="text-xs text-muted-foreground block">{t("cs.name")}</label>
                <input
                  id="cs-email-name"
                  type="text"
                  value={emailName}
                  onChange={(e) => setEmailName(e.target.value)}
                  placeholder={t("cs.namePlaceholder")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="cs-email-role" className="text-xs text-muted-foreground block">{t("cs.role")} <span className="opacity-60">{t("cs.optional")}</span></label>
                <input
                  id="cs-email-role"
                  type="text"
                  value={emailRole}
                  onChange={(e) => setEmailRole(e.target.value)}
                  placeholder={t("cs.rolePlaceholder")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="cs-email-to" className="text-xs text-muted-foreground block">{t("cs.emailAddress")}</label>
              <div className="flex gap-2">
                <input
                  id="cs-email-to"
                  type="email"
                  inputMode="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="name@company.com"
                  className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button type="button" onClick={handleSendEmail} disabled={sending || !emailTo.trim()}>
                  {sending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />{t("cs.sending")}</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" aria-hidden="true" />{t("cs.send")}</>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("cs.emailNote")}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default CounterSignPanel;
