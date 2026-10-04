import { supabase } from "./supabase";
import { isUuid } from "./signatureStore";
import type { AgreementViewSnapshot } from "./agreementViewStore";

// The agreement, translated for the other party (platform migration 0245).
//
// Two free sources, neither of which sends the agreement anywhere:
//   1. The DRAFTER writes the translation (by hand, or pre-filled by their own
//      browser's on-device translator and then checked) and attaches it to the
//      signing link. It is shown to the signer labelled as supplied by the
//      sender.
//   2. The SIGNER's browser translates on the device, where it can (Chrome's
//      built-in Translator API — the model runs locally, nothing is uploaded).
//      Labelled as a machine translation.
// Either way the agreement's own text is the binding one, and the page says so.
//
// Universal AI's in-browser models (transformers.js / WebLLM) were considered:
// they would work, but a translation model is a 100 MB+ download per language
// pair before the first word, too much to ask of someone opening a signing
// link on a phone — and a machine translation of a contract still can't be the
// binding text. So: the on-device API where the browser already has one, and
// otherwise the sender's own translation.

export interface TranslationRow {
  key: string;
  label: string;
  value: string;
}

export interface AgreementTranslation {
  lang: string;
  binding: string;
  source: "drafter" | "device";
  rows: TranslationRow[];
  updated_at?: string;
}

/** The languages a translation can be in: the suite's, less English. */
export const TRANSLATION_LANGS = ["fr", "de", "es", "it", "pt-BR", "pt-PT", "tr"] as const;

/** The translatable text of an agreement, in a stable order with stable keys. */
export function agreementRows(snapshot: AgreementViewSnapshot | null | undefined): TranslationRow[] {
  if (!snapshot) return [];
  const rows: TranslationRow[] = [];
  (snapshot.fields ?? []).forEach((f, i) => {
    if (f.label || f.value) rows.push({ key: `f:${i}`, label: f.label ?? "", value: f.value ?? "" });
  });
  (snapshot.products ?? []).forEach((p, i) => {
    if (p.name) rows.push({ key: `p:${i}`, label: "Product", value: p.name });
  });
  (snapshot.documents ?? []).forEach((d, i) => {
    if (d.label) rows.push({ key: `d:${i}`, label: "Document", value: d.label });
  });
  return rows;
}

/** The language name in the reader's language ("Französisch"). */
export function languageName(code: string, inLang: string): string {
  try {
    return new Intl.DisplayNames([inLang], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** "fr-CA" → "fr"; English (any) → "en". */
export function baseLang(code: string): string {
  return (code || "en").split("-")[0].toLowerCase();
}

// ── On-device translation (Chrome's Translator API) ─────────────────────────

interface TranslatorLike {
  translate(text: string): Promise<string>;
  destroy?: () => void;
}
interface TranslatorStatic {
  availability(opts: { sourceLanguage: string; targetLanguage: string }): Promise<string>;
  create(opts: {
    sourceLanguage: string;
    targetLanguage: string;
    monitor?: (m: EventTarget) => void;
  }): Promise<TranslatorLike>;
}

function translatorApi(): TranslatorStatic | null {
  const t = (globalThis as unknown as { Translator?: TranslatorStatic }).Translator;
  return t && typeof t.availability === "function" ? t : null;
}

/** The code the on-device API takes for a suite language. */
function deviceCode(lang: string): string {
  return lang.startsWith("pt") ? "pt" : baseLang(lang);
}

export type DeviceAvailability = "available" | "downloadable" | "unavailable";

/** Can THIS browser translate English → `target` on the device? */
export async function deviceTranslation(target: string): Promise<DeviceAvailability> {
  const api = translatorApi();
  if (!api) return "unavailable";
  try {
    // Some builds expose the API but never answer (headless, policy-disabled):
    // after 3 s, treat it as not available rather than leave the page waiting.
    const a = await Promise.race([
      api.availability({ sourceLanguage: "en", targetLanguage: deviceCode(target) }),
      new Promise<string>((resolve) => setTimeout(() => resolve("unavailable"), 3000)),
    ]);
    if (a === "available") return "available";
    if (a === "downloadable" || a === "downloading") return "downloadable";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}

/**
 * Translate the rows on the device. Call from a click: the first use may
 * download the language model, which the browser only allows after a gesture.
 */
export async function translateOnDevice(
  rows: TranslationRow[],
  target: string,
  onProgress?: (fraction: number) => void,
): Promise<TranslationRow[]> {
  const api = translatorApi();
  if (!api) throw new Error("unavailable");
  const translator = await api.create({
    sourceLanguage: "en",
    targetLanguage: deviceCode(target),
    monitor: (m) =>
      m.addEventListener("downloadprogress", (e) => onProgress?.((e as unknown as { loaded: number }).loaded ?? 0)),
  });
  const cache = new Map<string, string>();
  const tr = async (s: string) => {
    const text = s.trim();
    if (!text || /^[\d\s.,:%/+-]+$/.test(text)) return s; // numbers, codes, dates
    if (!cache.has(text)) cache.set(text, await translator.translate(text));
    return cache.get(text)!;
  };
  const out: TranslationRow[] = [];
  for (const r of rows) out.push({ key: r.key, label: await tr(r.label), value: await tr(r.value) });
  translator.destroy?.();
  return out;
}

// ── The drafter's translation, stored with the link ──────────────────────────

export async function getTranslation(token: string): Promise<AgreementTranslation | null> {
  if (!isUuid(token)) return null;
  const { data, error } = await supabase.rpc("exports_get_agreement_translation", { sig_token: token });
  if (error) {
    console.error("[exports] getTranslation failed:", error);
    return null;
  }
  const tr = data as AgreementTranslation | null;
  return tr && typeof tr === "object" && Array.isArray(tr.rows) ? tr : null;
}

/** Owner only, while the link is pending. `null` removes it. */
export async function saveTranslation(token: string, translation: Omit<AgreementTranslation, "updated_at"> | null): Promise<boolean> {
  const { data, error } = await supabase.rpc("exports_set_agreement_translation", {
    sig_token: token,
    p_translation: translation,
  });
  if (error) {
    console.error("[exports] saveTranslation failed:", error);
    return false;
  }
  return data === true;
}
