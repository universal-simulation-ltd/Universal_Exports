import { describe, it, expect } from "vitest";
import { layoutBusinessDoc } from "@unisim/doc";
import { toBusinessDoc } from "./businessPdf";

const catalogue = [
  { id: "p1", code: "PT-1", hsCode: "8205", name: "Torque wrench", description: "12 in", unitPrice: 120, vatPercent: 0 },
  { id: "p2", code: "PT-2", hsCode: "", name: "Socket set", description: "", unitPrice: 40.5, vatPercent: 20 },
];
const productLines = JSON.stringify([
  { catalogueId: "p1", units: "10", discount: "5", discountAmount: "0" },
  { catalogueId: "p2", units: "4", discount: "0", discountAmount: "2" },
  { catalogueId: "gone", units: "1", discount: "0" },
]);
const base = {
  fields: { referenceNo: "INV-1", date: "2026-11-10", notes: "Thank you", docCurrency: "gbp" },
  productLines,
  catalogue,
  from: { registeredName: "Acme Ltd", address: "1 High St\nBristol", country: "United Kingdom", vatNumber: "GB1", eoriNumber: "GB1000" },
  to: { registeredName: "Outils SA", address: "5 rue X, Paris", country: "France", contactName: "Léa", email: "lea@example.fr" },
  today: "2026-01-01",
};

describe("toBusinessDoc", () => {
  it("prints the deal's products as lines, in minor units, with their discounts", () => {
    const doc = toBusinessDoc({ ...base, docId: "invoice" })!;
    expect(doc.kind).toBe("invoice");
    expect(doc.currency).toBe("GBP");
    expect(doc.taxMode).toBe("standard");
    expect(doc.lines).toHaveLength(2);
    expect(doc.lines[0]).toMatchObject({ code: "PT-1", quantity: 10, unitPrice: 12000, discount: { percent: 5 }, taxRate: 0 });
    expect(doc.lines[0].description).toBe("Torque wrench\n12 in\nHS code 8205");
    // £2 off the line's total is 50p off each of 4 units.
    expect(doc.lines[1]).toMatchObject({ unitPrice: 4050, discount: { amount: 50 }, taxRate: 20 });
    expect(doc.issuer.footer).toEqual(["Acme Ltd", "VAT GB1 · EORI GB1000"]);
    expect(doc.client.address).toEqual(["5 rue X", "Paris", "France"]);
    expect(layoutBusinessDoc(doc).length).toBe(1);
  });

  it("maps the quote, delivery note and picking list; leaves the purchase order to the rows", () => {
    expect(toBusinessDoc({ ...base, docId: "estimate-quote" })?.kind).toBe("quote");
    expect(toBusinessDoc({ ...base, docId: "delivery-note" })?.kind).toBe("delivery-note");
    expect(toBusinessDoc({ ...base, docId: "picking-list" })?.kind).toBe("packing-list");
    expect(toBusinessDoc({ ...base, docId: "purchase-order" })).toBeNull();
  });

  it("falls back to the rows with no products, or a currency the renderer can't print", () => {
    expect(toBusinessDoc({ ...base, docId: "invoice", productLines: "[]" })).toBeNull();
    expect(toBusinessDoc({ ...base, docId: "invoice", fields: { ...base.fields, docCurrency: "JPY" } })).toBeNull();
    expect(toBusinessDoc({ ...base, docId: "invoice", fields: { referenceNo: "X" }, fallbackCurrency: "EUR" })?.currency).toBe("EUR");
  });

  it("uses today when the document's date isn't an ISO date, and no tax lines when nothing carries VAT", () => {
    const doc = toBusinessDoc({ ...base, docId: "invoice", fields: { date: "10/11/2026" }, productLines: JSON.stringify([{ catalogueId: "p1", units: "1" }]) })!;
    expect(doc.date).toBe("2026-01-01");
    expect(doc.taxMode).toBe("export-exempt");
  });
});
