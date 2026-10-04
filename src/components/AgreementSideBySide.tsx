import { useEffect, useMemo, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgreementViewSnapshot } from "@/lib/agreementViewStore";
import {
  agreementRows,
  baseLang,
  deviceTranslation,
  languageName,
  translateOnDevice,
  type AgreementTranslation,
  type DeviceAvailability,
  type TranslationRow,
} from "@/lib/translation";
import { useI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";

interface Props {
  snapshot: AgreementViewSnapshot | null;
  /** The sender's own translation for this link, if they attached one. */
  supplied: AgreementTranslation | null;
}

/**
 * The agreement beside a translation, for the other party. The binding text
 * (the agreement as drafted) is always on the left and labelled as binding;
 * the translation is labelled for reference only, and says where it came
 * from: the sender, or this device's own translator. See src/lib/translation.ts.
 */
const AgreementSideBySide = ({ snapshot, supplied }: Props) => {
  const { t, lang } = useI18n();
  const source = useMemo(() => agreementRows(snapshot), [snapshot]);
  const readerBase = baseLang(lang);
  // The sender's translation is used when it is in the reader's language (or
  // the reader reads English and the sender supplied one in another language).
  const suppliedFits = !!supplied && (baseLang(supplied.lang) === readerBase || readerBase === "en");
  const target = suppliedFits ? supplied!.lang : lang;
  const [device, setDevice] = useState<DeviceAvailability | null>(null);
  const [machine, setMachine] = useState<TranslationRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (readerBase === "en") return;
    let active = true;
    deviceTranslation(lang).then((a) => { if (active) setDevice(a); });
    return () => { active = false; };
  }, [lang, readerBase]);

  if (!source.length) return null;
  // English reader and nothing supplied: the agreement is already in their language.
  if (readerBase === "en" && !suppliedFits) return null;

  const translated = suppliedFits ? supplied!.rows : machine;
  const byKey = new Map((translated ?? []).map((r) => [r.key, r]));
  const bindingName = languageName(supplied?.binding ?? "en", lang);
  const targetName = languageName(target, lang);

  const runDevice = async () => {
    setBusy(true);
    setFailed(false);
    try {
      setMachine(await translateOnDevice(source, lang, setProgress));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-3" aria-labelledby="sbs-title">
      <div className="flex items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <h2 id="sbs-title" className="text-sm font-semibold">{fill(t("translate.title"), { language: targetName })}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{fill(t("translate.binding"), { language: bindingName })}</p>

      {!translated && (
        <div className="space-y-2">
          {device === "available" || device === "downloadable" ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={runDevice} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {busy && device === "downloadable" && progress > 0 && progress < 1
                  ? fill(t("translate.downloading"), { percent: String(Math.round(progress * 100)) })
                  : t("translate.onDevice")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("translate.onDeviceNote")}</p>
            </>
          ) : (
            device !== null && <p className="text-xs text-muted-foreground">{t("translate.unavailable")}</p>
          )}
          {failed && <p className="text-xs text-red-700 dark:text-red-400" role="alert">{t("translate.failed")}</p>}
        </div>
      )}

      {translated && (
        <>
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            {suppliedFits ? t("translate.fromSender") : t("translate.fromDevice")}
          </p>
          {/* Two equal columns at every width — on a phone they wrap rather than
              scroll, so the translation is never cut off beside the original. */}
          <div>
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="py-1.5 pr-3 font-medium w-1/2" lang={supplied?.binding ?? "en"}>
                    {fill(t("translate.colBinding"), { language: bindingName })}
                  </th>
                  <th className="py-1.5 font-medium w-1/2">{fill(t("translate.colReference"), { language: targetName })}</th>
                </tr>
              </thead>
              <tbody>
                {source.map((r) => {
                  const tr = byKey.get(r.key);
                  return (
                    <tr key={r.key} className="border-b border-border/50 last:border-0 align-top">
                      <td className="py-1.5 pr-3 wrap-break-word hyphens-auto" lang={supplied?.binding ?? "en"}>
                        <span className="block text-xs text-muted-foreground">{r.label}</span>
                        {r.value || "—"}
                      </td>
                      <td className="py-1.5 wrap-break-word hyphens-auto" lang={target}>
                        <span className="block text-xs text-muted-foreground">{tr?.label || r.label}</span>
                        {tr?.value || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

export default AgreementSideBySide;
