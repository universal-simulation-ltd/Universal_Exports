import { describe, it, expect, beforeEach } from "vitest";
import { SUPPORTED_LANGUAGES } from "@unisim/sdk";
import { translate } from "./index";
import { en, type MessageKey } from "./en";
import {
  APP_LANGUAGE_KEY,
  LEGACY_LANGUAGE_KEY,
  legacyLanguageToSdk,
  migrateLegacyLanguage,
} from "./migrate";

describe("translate", () => {
  it("answers every SDK language, English (GB) included", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(translate(lang, "sidebar.projects")).toBeTruthy();
    }
    expect(translate("en-gb", "sidebar.projects")).toBe(en["sidebar.projects"]);
  });

  it("uses each language's own dictionary", () => {
    expect(translate("fr", "setup.cancel")).toBe("Annuler");
    expect(translate("pt-BR", "doc.save")).toBe("Salvar");
    expect(translate("pt-PT", "doc.save")).toBe("Guardar");
    expect(translate("tr", "doc.save")).toBe("Kaydet");
  });

  it("falls back to English for a language the app has no strings for", () => {
    expect(translate("nl", "doc.save")).toBe("Save");
  });

  it("has no dictionary that just repeats English for a whole section", () => {
    const keys = Object.keys(en) as MessageKey[];
    for (const lang of ["fr", "de", "es", "it", "pt-BR", "pt-PT", "tr"]) {
      const same = keys.filter((k) => translate(lang, k) === en[k]);
      // Brand names and codes (Incoterms, "Universal Exports AI", "Project")
      // legitimately match; a missing dictionary would match all 150.
      expect(same.length, `${lang}: ${same.join(", ")}`).toBeLessThan(10);
    }
  });
});

describe("migrateLegacyLanguage", () => {
  beforeEach(() => localStorage.clear());

  it("maps the old codes", () => {
    expect(legacyLanguageToSdk("en")).toBe("en-gb");
    expect(legacyLanguageToSdk("fr")).toBe("fr");
    expect(legacyLanguageToSdk("de")).toBe("de");
    expect(legacyLanguageToSdk("es")).toBe("es");
    expect(legacyLanguageToSdk("it")).toBe("it");
    expect(legacyLanguageToSdk("nl")).toBeNull();
    expect(legacyLanguageToSdk("xx")).toBeNull();
    expect(legacyLanguageToSdk(null)).toBeNull();
  });

  it("carries a choice across as this app's override, once", () => {
    localStorage.setItem(LEGACY_LANGUAGE_KEY, "de");
    migrateLegacyLanguage();
    expect(localStorage.getItem(APP_LANGUAGE_KEY)).toBe("de");
    expect(localStorage.getItem(LEGACY_LANGUAGE_KEY)).toBeNull();
    // Never touches the global language other apps on the origin share.
    expect(localStorage.getItem("universal:language")).toBeNull();

    // A later App preferences change is not undone by a second run.
    localStorage.setItem(APP_LANGUAGE_KEY, "tr");
    migrateLegacyLanguage();
    expect(localStorage.getItem(APP_LANGUAGE_KEY)).toBe("tr");
  });

  it("keeps an English pick as English (GB) rather than the browser's language", () => {
    localStorage.setItem(LEGACY_LANGUAGE_KEY, "en");
    migrateLegacyLanguage();
    expect(localStorage.getItem(APP_LANGUAGE_KEY)).toBe("en-gb");
  });

  it("lets a Dutch pick follow the suite language", () => {
    localStorage.setItem(LEGACY_LANGUAGE_KEY, "nl");
    migrateLegacyLanguage();
    expect(localStorage.getItem(APP_LANGUAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_LANGUAGE_KEY)).toBeNull();
  });

  it("does not overwrite an override that already exists", () => {
    localStorage.setItem(APP_LANGUAGE_KEY, "es");
    localStorage.setItem(LEGACY_LANGUAGE_KEY, "fr");
    migrateLegacyLanguage();
    expect(localStorage.getItem(APP_LANGUAGE_KEY)).toBe("es");
  });

  it("does nothing when there is no old choice", () => {
    migrateLegacyLanguage();
    expect(localStorage.getItem(APP_LANGUAGE_KEY)).toBeNull();
  });
});
