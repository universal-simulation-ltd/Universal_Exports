import { useEffect, useMemo, useState } from "react";
import { Languages, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSignerDocument } from "@/lib/auditStore";
import type { AgreementViewSnapshot } from "@/lib/agreementViewStore";
import {
  TRANSLATION_LANGS,
  agreementRows,
  deviceTranslation,
  getTranslation,
  languageName,
  saveTranslation,
  translateOnDevice,
  type DeviceAvailability,
  type TranslationRow,
} from "@/lib/translation";
import { useI18n } from "@/lib/i18n";
import { fill } from "@/lib/i18n/format";

/**
 * The drafter attaches a translation of the agreement to a signing link, for
 * the other party to read beside the binding text. Typed by the drafter, or
 * pre-filled by their own browser's on-device translator and then checked.
 * Nothing is sent to a translation service. See src/lib/translation.ts.
 */
const TranslationEditor = ({ token }: { token: string }) => {
  const { t, lang } = useI18n();
  const [snapshot, setSnapshot] = useState<AgreementViewSnapshot | null>(null);
  const [target, setTarget] = useState<string>(TRANSLATION_LANGS[0]);
  const [rows, setRows] = useState<Record<string, TranslationRow>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceAvailability>("unavailable");
  const [busy, setBusy] = useState<"device" | "save" | null>(null);
  const [open, setOpen] = useState(false);
  const source = useMemo(() => agreementRows(snapshot), [snapshot]);

  useEffect(() => {
    let active = true;
    Promise.all([getSignerDocument(token).catch(() => null), getTranslation(token)]).then(([doc, tr]) => {
      if (!active) return;
      setSnapshot(doc?.snapshot ?? null);
      if (tr) {
        setTarget(tr.lang);
        setRows(Object.fromEntries(tr.rows.map((r) => [r.key, r])));
        setSaved(tr.lang);
      }
    });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    let active = true;
    deviceTranslation(target).then((a) => { if (active) setDevice(a); });
    return () => { active = false; };
  }, [target]);

  const fillOnDevice = async () => {
    setBusy("device");
    try {
      const out = await translateOnDevice(source, target);
      setRows(Object.fromEntries(out.map((r) => [r.key, r])));
      toast.info(t("translate.checkIt"));
    } catch {
      toast.error(t("translate.failed"));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("save");
    const ok = await saveTranslation(token, {
      lang: target,
      binding: "en",
      source: "drafter",
      rows: source.map((r) => ({ key: r.key, label: rows[r.key]?.label ?? "", value: rows[r.key]?.value ?? "" })),
    });
    setBusy(null);
    if (ok) { setSaved(target); toast.success(fill(t("translate.saved"), { language: languageName(target, lang) })); }
    else toast.error(t("translate.saveFailed"));
  };

  const remove = async () => {
    setBusy("save");
    const ok = await saveTranslation(token, null);
    setBusy(null);
    if (ok) { setSaved(null); setRows({}); toast.success(t("translate.removed")); }
    else toast.error(t("translate.saveFailed"));
  };

  const edit = (key: string, field: "label" | "value", value: string) =>
    setRows((prev) => ({ ...prev, [key]: { key, label: prev[key]?.label ?? "", value: prev[key]?.value ?? "", [field]: value } }));

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm font-medium flex items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> {t("translate.editorTitle")}
      </p>
      <p className="text-xs text-muted-foreground max-w-md">
        {saved ? fill(t("translate.attached"), { language: languageName(saved, lang) }) : t("translate.editorIntro")}
      </p>
      {!open ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!source.length}>
          {saved ? t("translate.edit") : t("translate.add")}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label htmlFor="tr-lang" className="text-xs text-muted-foreground block">{t("translate.language")}</label>
              <select
                id="tr-lang"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {TRANSLATION_LANGS.map((l) => <option key={l} value={l}>{languageName(l, lang)}</option>)}
              </select>
            </div>
            {device !== "unavailable" && (
              <Button type="button" variant="outline" size="sm" onClick={fillOnDevice} disabled={!!busy}>
                {busy === "device" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {t("translate.fillOnDevice")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {device === "unavailable" ? t("translate.typeIt") : t("translate.fillNote")}
          </p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {source.map((r) => (
              <div key={r.key} className="grid gap-2 sm:grid-cols-2 items-start border-b border-border/50 pb-2">
                <div className="text-xs">
                  <span className="block text-muted-foreground">{r.label}</span>
                  <span className="break-words">{r.value || "—"}</span>
                </div>
                <div className="space-y-1">
                  <input
                    aria-label={fill(t("translate.labelIn"), { label: r.label })}
                    value={rows[r.key]?.label ?? ""}
                    onChange={(e) => edit(r.key, "label", e.target.value)}
                    placeholder={r.label}
                    maxLength={300}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  />
                  <textarea
                    aria-label={fill(t("translate.valueIn"), { label: r.label })}
                    value={rows[r.key]?.value ?? ""}
                    onChange={(e) => edit(r.key, "value", e.target.value)}
                    maxLength={2000}
                    rows={1}
                    className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t("translate.bindingNote")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={save} disabled={!!busy}>
              {busy === "save" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {t("translate.save")}
            </Button>
            {saved && (
              <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={!!busy}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> {t("translate.remove")}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>{t("translate.close")}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranslationEditor;
