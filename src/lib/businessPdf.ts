import type { BusinessDoc, BusinessDocKind, BusinessLine, CurrencyCode, PdfImage } from "@unisim/doc";
import type { CatalogueProduct } from "./productCatalogueStore";
import type { DocPdfParty } from "./documentPdf";

/**
 * The documents that print with a proper line-item table through the shared
 * business renderer (`@unisim/doc`, the one Universal Invoices uses), instead
 * of documentPdf.ts's label/value rows (2026-11-10, with the editor redesign).
 * Everything else — purchase order, certificates, bill of lading, letter of
 * credit — keeps documentPdf.ts.
 */
export const BUSINESS_KINDS: Record<string, BusinessDocKind> = {
  "estimate-quote": "quote",
  invoice: "invoice",
  "delivery-note": "delivery-note",
  "picking-list": "packing-list",
};

const CURRENCIES: CurrencyCode[] = ["EUR", "GBP", "USD"];

export interface ProductLineRow {
  catalogueId: string;
  units: string;
  discount?: string;
  discountAmount?: string;
}

export interface ExportsBusinessInput {
  docId: string;
  /** The document's own fields (referenceNo, date, notes, docCurrency…). */
  fields: Record<string, string>;
  /** Used when the document names none: the transaction's. */
  fallbackCurrency?: string;
  /** product-details.productLines, as stored. */
  productLines?: string;
  catalogue: CatalogueProduct[];
  from?: DocPdfParty | null;
  to?: DocPdfParty | null;
  /** Today, when the document has no date of its own. */
  today: string;
}

const textLines = (s?: string) => (s ?? "").split(/\n|,(?=\s)/).map((x) => x.trim()).filter(Boolean);
const minor = (major: number) => Math.round(major * 100);

function partyName(p?: DocPdfParty | null) {
  return (p?.registeredName || p?.tradingName || "").trim();
}

/**
 * A completed Exports document as a BusinessDoc, or null when it can't print
 * that way (not one of BUSINESS_KINDS, no products, or a currency the
 * renderer has no symbol for) — the caller then falls back to the rows.
 */
export function toBusinessDoc(input: ExportsBusinessInput): BusinessDoc | null {
  const kind = BUSINESS_KINDS[input.docId];
  if (!kind) return null;
  let rows: ProductLineRow[] = [];
  try {
    rows = JSON.parse(input.productLines || "[]");
  } catch {
    rows = [];
  }
  const lines: BusinessLine[] = [];
  for (const row of rows) {
    const product = input.catalogue.find((p) => p.id === row.catalogueId);
    if (!product) continue;
    const quantity = parseFloat(row.units) || 0;
    const percent = parseFloat(row.discount || "0") || 0;
    // Exports takes a fixed amount off the line's total; the renderer takes it off each unit.
    const fixed = parseFloat(row.discountAmount || "0") || 0;
    const unitPrice = minor(product.unitPrice);
    const discount =
      fixed > 0 && quantity > 0
        ? { amount: Math.round(unitPrice * (percent / 100) + minor(fixed) / quantity) }
        : percent > 0
          ? { percent }
          : undefined;
    lines.push({
      code: product.code || undefined,
      description: [product.name, product.description, product.hsCode ? `HS code ${product.hsCode}` : ""].filter(Boolean).join("\n"),
      quantity,
      unitPrice,
      ...(discount ? { discount } : {}),
      taxRate: product.vatPercent || 0,
    });
  }
  if (!lines.length) return null;

  const code = (input.fields.docCurrency || input.fallbackCurrency || "GBP").trim().toUpperCase();
  if (!CURRENCIES.includes(code as CurrencyCode)) return null;
  const taxed = lines.some((l) => (l.taxRate ?? 0) > 0);
  const from = input.from ?? {};
  const to = input.to ?? {};
  const ids = [from.vatNumber && `VAT ${from.vatNumber}`, from.eoriNumber && `EORI ${from.eoriNumber}`].filter(Boolean).join(" · ");
  // A picking list is dated by when it was picked.
  const own = input.docId === "picking-list" ? input.fields.datePicked : input.fields.date;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(own ?? "") ? own! : input.today;

  return {
    kind,
    // The generated documents stay in English on purpose (documentPdf.ts).
    language: "en",
    numberStyle: "en",
    currency: code as CurrencyCode,
    taxMode: taxed ? "standard" : "export-exempt",
    number: input.fields.referenceNo || "",
    date,
    issuer: {
      name: partyName(from),
      address: [...textLines(from.address), from.country ?? ""].filter(Boolean),
      contact: { name: from.contactName || undefined, phone: from.telephone || undefined, email: from.email || undefined },
      footer: [partyName(from), ids].filter(Boolean),
    },
    client: {
      name: partyName(to) || input.fields.counterparty || "",
      address: [...textLines(to.address), to.country ?? ""].filter(Boolean),
      ...(to.contactName || to.email ? { contact: { name: to.contactName || undefined, email: to.email || undefined } } : {}),
    },
    lines,
    notes: input.fields.notes || undefined,
  };
}

/** A logo of any format as the renderer's JPEG, on white (it has no transparency). */
async function jpegOf(dataUrl: string): Promise<PdfImage | null> {
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const jpeg = canvas.toDataURL("image/jpeg", 0.9);
    const binary = atob(jpeg.slice(jpeg.indexOf(",") + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { jpeg: bytes, width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

/** Build the document through the shared renderer and download it. */
export async function downloadBusinessPdf(doc: BusinessDoc, title: string, logoDataUrl?: string): Promise<void> {
  const { businessDocToPdf } = await import("@unisim/doc");
  const logo = logoDataUrl ? await jpegOf(logoDataUrl) : null;
  const { blob } = businessDocToPdf({ ...doc, issuer: { ...doc.issuer, logo } }, { producer: "Universal Exports" });
  const url = URL.createObjectURL(blob);
  const safe = [title, doc.number].filter(Boolean).join(" ").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "document";
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
