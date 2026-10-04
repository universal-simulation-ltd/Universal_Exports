import { describe, it, expect, vi, afterEach } from "vitest";
vi.mock("./supabase", () => ({ supabase: {} }));
import { agreementRows, deviceTranslation, translateOnDevice, baseLang } from "./translation";

const snapshot = {
  projectName: "Coffee", role: "Seller",
  fields: [{ label: "Incoterm", value: "FOB" }, { label: "Payment terms", value: "30 days net" }],
  products: [{ name: "Arabica beans", units: "10", unitPrice: "1", total: "10" }],
  totals: { currency: "GBP", amount: "10" },
  documents: [{ label: "Invoice", reference: "INV-1", date: "", value: "" }],
};

afterEach(() => { delete (globalThis as { Translator?: unknown }).Translator; });

describe("agreementRows", () => {
  it("takes fields, product names and document names with stable keys", () => {
    expect(agreementRows(snapshot).map((r) => r.key)).toEqual(["f:0", "f:1", "p:0", "d:0"]);
    expect(agreementRows(null)).toEqual([]);
  });
});

describe("on-device translation", () => {
  it("is unavailable without the browser API", async () => {
    expect(await deviceTranslation("fr")).toBe("unavailable");
  });

  it("uses the Translator API, skips numbers, and maps Portuguese to pt", async () => {
    const create = vi.fn(async () => ({ translate: async (s: string) => `[fr] ${s}` }));
    const availability = vi.fn(async () => "available");
    (globalThis as { Translator?: unknown }).Translator = { availability, create };
    expect(await deviceTranslation("pt-BR")).toBe("available");
    expect(availability).toHaveBeenCalledWith({ sourceLanguage: "en", targetLanguage: "pt" });
    const out = await translateOnDevice([{ key: "f:0", label: "Payment terms", value: "30" }], "fr");
    expect(out).toEqual([{ key: "f:0", label: "[fr] Payment terms", value: "30" }]);
  });

  it("knows the base language", () => {
    expect(baseLang("pt-BR")).toBe("pt");
    expect(baseLang("en-gb")).toBe("en");
  });
});
