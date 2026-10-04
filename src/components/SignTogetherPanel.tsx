import { useEffect, useState } from "react";
import { Hand, Radio, CheckCircle2, FileText, PenLine, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignTogether, type TogetherField } from "@/lib/together";
import { getSignerDocument } from "@/lib/auditStore";
import { pdfBlobFromDataUrl } from "@/lib/safeDataUrl";
import { useI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

interface Props {
  token: string;
  /** The drafter's name and signature, shown to the other party as they arrive. */
  drafterName: string;
  drafterSignature: string;
  /** The other party submitted: the parent re-reads the link. */
  onSigned: () => void;
  onClose: () => void;
}

/**
 * The drafter's half of "Sign together, live". Both sides are on one Realtime
 * channel (src/lib/together.ts): the drafter sees the same document the other
 * party is signing, which part of the page they are on, their name as they type
 * it and their signature stroke by stroke — and can point them at a part of the
 * page. The drafter's own signature is sent to them the same way. Nothing here
 * is stored; the submitted signature and its audit trail are the record.
 */
const SignTogetherPanel = ({ token, drafterName, drafterSignature, onSigned, onClose }: Props) => {
  const { t } = useI18n();
  const live = useSignTogether({ token, role: "drafter", name: drafterName, enabled: true });
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [pointing, setPointing] = useState<TogetherField | null>(null);
  const { peer } = live;

  // The same document the other party is shown: the newest generated copy.
  useEffect(() => {
    let url: string | null = null;
    let active = true;
    getSignerDocument(token).then((d) => {
      const blob = pdfBlobFromDataUrl(d?.pdfData);
      if (!active || !blob) return;
      url = URL.createObjectURL(blob);
      setDocUrl(url);
    }, () => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [token]);

  // Our signature goes to them once we are connected (and again to a late joiner).
  const { connected, ink } = live;
  useEffect(() => {
    if (connected && drafterSignature.startsWith("data:")) ink(drafterSignature);
  }, [connected, drafterSignature, ink]);

  useEffect(() => {
    if (peer.signed) onSigned();
  }, [peer.signed, onSigned]);

  const point = (field: TogetherField) => {
    const next = pointing === field ? null : field;
    setPointing(next);
    live.focus(next);
  };

  const activity =
    !peer.present ? t("together.waiting")
    : peer.signed ? t("together.actSigned")
    : peer.focus === "submit" ? t("together.actSubmitting")
    : peer.focus === "signature" ? t("together.actSignature")
    : peer.focus === "name" ? t("together.actName")
    : peer.opened ? t("together.actReading")
    : t("together.actHere");

  const ring = (field: TogetherField) =>
    peer.present && peer.focus === field ? "ring-2 ring-sky-400 ring-offset-2 ring-offset-background" : "";

  return (
    <section className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 space-y-4 dark:border-sky-900 dark:bg-sky-950/30">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-200">
          <Radio className={cn("h-4 w-4", connected && "animate-pulse")} aria-hidden="true" />
          {t("together.title")}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("together.stop")}</Button>
      </div>

      <p className="text-sm text-sky-900 dark:text-sky-200" role="status" aria-live="polite">
        {peer.present && peer.name ? `${fill(t("together.peerHere"), { name: peer.name })} · ` : ""}
        {activity}
      </p>

      {/* Point them at a part of their page. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Hand className="h-3.5 w-3.5" aria-hidden="true" /> {t("together.pointTo")}
        </span>
        {([
          ["document", t("together.fDocument"), FileText],
          ["name", t("together.fName"), Type],
          ["signature", t("together.fSignature"), PenLine],
        ] as const).map(([field, label, Icon]) => (
          <Button
            key={field}
            type="button"
            size="sm"
            variant={pointing === field ? "default" : "outline"}
            aria-pressed={pointing === field}
            disabled={!peer.present}
            onClick={() => point(field)}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <div className={cn("rounded-md transition-shadow", ring("document"))}>
          <p className="text-xs text-muted-foreground mb-1">{t("together.sameDocument")}</p>
          {docUrl ? (
            <iframe title={t("public.agreement")} src={docUrl} className="w-full h-[360px] rounded-md border border-input bg-muted" />
          ) : (
            <div className="h-[120px] rounded-md border border-dashed border-input flex items-center justify-center text-xs text-muted-foreground p-3 text-center">
              {t("together.noDocument")}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className={cn("rounded-md bg-background p-2 border border-border transition-shadow", ring("name"))}>
            <p className="text-xs text-muted-foreground">{t("together.theirName")}</p>
            <p className="text-sm font-medium min-h-5 wrap-break-word">{peer.draftName || "—"}</p>
          </div>
          <div className={cn("rounded-md bg-background p-2 border border-border transition-shadow", ring("signature"))}>
            <p className="text-xs text-muted-foreground">{t("together.theirSignature")}</p>
            <div className="h-[72px] flex items-center justify-center">
              {peer.ink
                ? <img src={peer.ink} alt={t("together.theirSignature")} className="max-h-[72px] max-w-full object-contain" />
                : <span className="text-xs text-muted-foreground">—</span>}
            </div>
          </div>
          {peer.signed && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t("together.actSigned")}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("together.drafterNote")}</p>
    </section>
  );
};

export default SignTogetherPanel;
