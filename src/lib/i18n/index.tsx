// Universal Exports' own translations, driven by the SDK's language.
//
// Since 2026-09-29 there is ONE language setting, and it is the suite's:
// `useLanguage()` from @unisim/sdk. It resolves this app's own override (App
// preferences), else the global choice (Global preferences), else the
// browser's language, else English (GB). The navbar, the profile menu, the
// knowledge base and this app all read that same value, so they always agree.
//
// ⚠️ Until then Exports kept its own language in localStorage `eboxy-lang`,
// picked from a Language row in the profile pill, and passed
// `showLanguageSelector={false}` so the SDK's dialogs had no Language at all.
// The SDK chrome and the app could disagree, and the app never followed the
// browser. `migrate.ts` carries an old `eboxy-lang` choice across once.
//
// ⚠️ Dutch went with it. The SDK's list (SUPPORTED_LANGUAGES) has no `nl`, so
// neither dialog can offer it; a Dutch choice is migrated to "follow the
// suite", which for a Dutch browser is English (GB). See `migrate.ts`. The old
// Dutch dictionary is in git history (src/lib/i18n.tsx before this change) for
// the day the SDK adds `nl`.
//
// Dictionaries: `./<code>.ts`. English (`en.ts`) is the shape — every other one
// is typed `Messages`, so `tsc` fails on a missing or misspelt key. English
// (GB) and English (US) both read `en` (its spelling is British already).
import { useCallback, useMemo, type ReactNode } from "react";
import { languageFallbacks, useLanguage, type Language } from "@unisim/sdk";
import { en, type MessageKey, type Messages } from "./en";
import { fr } from "./fr";
import { de } from "./de";
import { es } from "./es";
import { it } from "./it";
import { ptBR } from "./pt-BR";
import { ptPT } from "./pt-PT";
import { tr } from "./tr";

export type { Language, MessageKey, Messages };

const DICTS: Record<string, Messages> = {
  en,
  fr,
  de,
  es,
  it,
  "pt-BR": ptBR,
  "pt-PT": ptPT,
  tr,
};

/** The string for `key` in `lang`, walking the SDK's fallback chain to English. */
export function translate(lang: string, key: MessageKey): string {
  for (const code of languageFallbacks(lang)) {
    const hit = DICTS[code]?.[key];
    if (hit) return hit;
  }
  return en[key] ?? key;
}

/** The translator for a component. Re-renders when the SDK language changes. */
export function useI18n(): { lang: Language; t: (key: MessageKey) => string } {
  const { language } = useLanguage();
  const t = useCallback((key: MessageKey) => translate(language, key), [language]);
  return useMemo(() => ({ lang: language, t }), [language, t]);
}

/**
 * Mount once, inside <UniversalProvider>. Keeps `<html lang>` on the language
 * the app is showing. Set during render, not in an effect, so it is right in
 * the same pass that renders the new strings.
 */
export function I18nRoot({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  if (typeof document !== "undefined" && document.documentElement.lang !== language) {
    document.documentElement.lang = language;
  }
  return <>{children}</>;
}
