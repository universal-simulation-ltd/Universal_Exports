// One-time carry-over of the pre-2026-09-29 language choice.
//
// Exports used to keep its own language in localStorage `eboxy-lang` (en, fr,
// de, es, it, nl), written only when somebody picked one from the old Language
// row — so its presence means a deliberate choice. It becomes this app's
// OVERRIDE in the SDK (`universal:language:exports`), not the global language:
// the old choice only ever applied to Exports, and on opensource.unisim.co.uk
// every Universal App shares one origin, so writing the global value would
// quietly re-language the neighbours too. An override is exactly "Exports uses
// its own language", which is what it always was.
//
// Mapping:
//   en            → en-gb   (the old "English" was flagged 🇬🇧 and spelt British)
//   fr/de/es/it   → the same code
//   nl            → nothing (the SDK has no Dutch; see below)
//   anything else → nothing
//
// ⚠️ Dutch: no override is written, so the app follows the suite language —
// the global choice if one exists, else the browser's language, which for a
// Dutch browser resolves to English (GB). Pinning English as an override
// instead would stop a later suite-wide choice ever reaching them.
//
// Runs before React mounts (main.tsx), so the provider's first read already
// sees the override. The legacy key is removed afterwards, so this runs once.
// An override that already exists wins — somebody who has used the SDK's App
// preferences since has made a newer choice.

export const LEGACY_LANGUAGE_KEY = "eboxy-lang";
/** The SDK's per-app override key (provider.tsx `appLanguageKey('exports')`). */
export const APP_LANGUAGE_KEY = "universal:language:exports";

const CARRIED: Record<string, string> = {
  en: "en-gb",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
};

/** What an old `eboxy-lang` value becomes, or null to follow the suite. */
export function legacyLanguageToSdk(value: string | null): string | null {
  if (!value) return null;
  return CARRIED[value.trim().toLowerCase()] ?? null;
}

export function migrateLegacyLanguage(storage: Storage | undefined = globalThis.localStorage): void {
  if (!storage) return;
  try {
    const legacy = storage.getItem(LEGACY_LANGUAGE_KEY);
    if (legacy === null) return;
    const mapped = legacyLanguageToSdk(legacy);
    if (mapped && !storage.getItem(APP_LANGUAGE_KEY)) {
      storage.setItem(APP_LANGUAGE_KEY, mapped);
    }
    storage.removeItem(LEGACY_LANGUAGE_KEY);
  } catch {
    /* storage disabled or full: nothing to carry, and nothing to lose */
  }
}
