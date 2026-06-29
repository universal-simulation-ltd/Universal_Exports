import { jsPDF } from "jspdf";

/**
 * Self-contained Export Agreement PDF builder.
 *
 * The same builder produces both the *unsigned* overview (the preview shown
 * right after "Generate Export Agreement") and the *signed* copy (after the
 * drafter clicks "Confirm signature"). Rather than editing an existing PDF in
 * place — which jsPDF can't do cleanly — we simply re-run the builder with the
 * signature block populated. The two outputs sit side-by-side in the UI.
 */

export interface AgreementField {
  label: string;
  value: string;
}

export interface AgreementProduct {
  name: string;
  units: string;
  /** Catalogue price per unit, pre-discount/VAT (may be empty). */
  unitPrice: string;
  /** Line total after discount + VAT (may be empty). */
  total: string;
}

export interface AgreementDocument {
  /** Friendly document name, e.g. "Invoice". */
  label: string;
  /** Reference / document number (may be empty). */
  reference: string;
  /** Document date (may be empty). */
  date: string;
  /** Currency + amount, or empty when value isn't applicable. */
  value: string;
}

export interface AgreementTariff {
  /** Product the rule applies to. */
  product: string;
  /** Commodity / HS code. */
  hsCode: string;
  /** Duty rate (third-country, with preferential noted where it applies). */
  duty: string;
  /** Import VAT rate. */
  vat: string;
  /** Computed duty cost for this line (number, e.g. "12.50"), if derivable. */
  dutyCost?: string;
  /** Computed import-VAT cost for this line, if derivable. */
  vatCost?: string;
  /** Currency code for the cost figures, e.g. "GBP". */
  currency?: string;
}

export interface AgreementSignatureBlock {
  /** Signer's full name. */
  name: string;
  /** base64 PNG data URL of the drawn / uploaded signature. */
  dataUrl: string;
  /** Pre-formatted date string, e.g. "3 June 2026". */
  date: string;
}

export interface AgreementPdfInput {
  projectName: string;
  /** "seller" | "buyer" | "" — used only for a friendly subtitle. */
  role: string;
  /** Key/value rows describing the transaction & shipment. */
  fields: AgreementField[];
  /** Product line summary (may be empty). */
  products: AgreementProduct[];
  /** Currency + amount footer for the products table. */
  totals: { currency: string; amount: string };
  /** Source documents provided for the agreement (reference / date / value). */
  documents?: AgreementDocument[];
  /** Expected tariffs (applied customs rules). Optional — omitted when empty. */
  tariffs?: AgreementTariff[];
  /** Drafter's signature — present only on the signed copy. */
  signature?: AgreementSignatureBlock | null;
  /**
   * Online view link, stamped as a QR top-right of the header. `dataUrl` is
   * the pre-rendered brand-styled PNG (see qrPngDataUrl); `url` doubles as a
   * click-through link annotation on the QR for digital readers.
   */
  qr?: { dataUrl: string; url: string } | null;
}

export interface BuiltPdf {
  blob: Blob;
  /** Object URL for embedding / download. Caller owns revocation. */
  url: string;
}

const MARGIN = 48;
const LINE = 16;

export function buildAgreementPdf(input: AgreementPdfInput): BuiltPdf {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Header ──────────────────────────────────────────────────────────────
  // Large online-view QR sits top-right; header text wraps short of it. Big
  // enough to scan comfortably off a printed page from arm's length.
  const QR_SIZE = 130;
  const qrTop = 36;
  let textWidth = contentWidth;
  if (input.qr) {
    const qrX = pageWidth - MARGIN - QR_SIZE;
    textWidth = contentWidth - QR_SIZE - 16;
    try {
      doc.addImage(input.qr.dataUrl, "PNG", qrX, qrTop, QR_SIZE, QR_SIZE);
      doc.link(qrX, qrTop, QR_SIZE, QR_SIZE, { url: input.qr.url });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Scan to view this project online", qrX + QR_SIZE / 2, qrTop + QR_SIZE + 11, { align: "center" });
    } catch {
      // malformed image — skip the QR rather than fail the whole document
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text("Export Agreement", MARGIN, y);
  y += LINE + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  const subtitleParts = [input.projectName || "Untitled project"];
  if (input.role) {
    subtitleParts.push(`Prepared as ${input.role}`);
  }
  const subtitle = doc.splitTextToSize(subtitleParts.join("  ·  "), textWidth);
  doc.text(subtitle, MARGIN, y);
  y += LINE * subtitle.length;
  doc.text(`Generated ${new Date().toLocaleDateString()}`, MARGIN, y);
  y += LINE;

  // Keep the divider clear of the QR block when one is stamped.
  if (input.qr) {
    y = Math.max(y, qrTop + QR_SIZE + 18);
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += LINE + 4;

  // ── Overview ──────────────────────────────────────────────────────────────
  // Single merged section: the transaction/shipment fields plus the at-a-glance
  // figures (total units, documents with their reference + date). HS codes are
  // intentionally NOT here — they're listed with their taxes in the Tariffs
  // section below. The transaction "Amount" already serves as the total deal
  // price, so we don't repeat it.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Overview", MARGIN, y);
  y += LINE + 2;

  doc.setFontSize(10);
  const labelWidth = 150;

  // Build the merged row list: the transaction fields, then total units, then a
  // documents line that names each provided doc with its reference + date.
  const totalUnits = input.products.reduce((s, p) => s + (parseFloat(p.units) || 0), 0);
  const docList = (input.documents ?? []).map((d) => {
    const meta = [d.reference, d.date].filter(Boolean).join(" | ");
    return meta ? `${d.label} (${meta})` : d.label;
  });
  const overviewRows: { label: string; value: string }[] = [...input.fields];
  if (totalUnits > 0) overviewRows.push({ label: "Total units", value: String(totalUnits) });
  if (docList.length) {
    overviewRows.push({ label: `Documents (${docList.length})`, value: docList.join(", ") });
  }

  for (const f of overviewRows) {
    const value = f.value || "—";
    const wrapped = doc.splitTextToSize(value, contentWidth - labelWidth);
    ensureSpace(LINE * wrapped.length);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text(f.label, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(wrapped, MARGIN + labelWidth, y);
    y += LINE * wrapped.length;
  }
  y += LINE - 4;

  // ── Products ────────────────────────────────────────────────────────────
  if (input.products.length > 0) {
    ensureSpace(LINE * 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Products", MARGIN, y);
    y += LINE + 2;

    const unitsX = MARGIN + contentWidth - 260;
    const priceX = MARGIN + contentWidth - 180;
    const totalX = MARGIN + contentWidth - 80;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Description", MARGIN, y);
    doc.text("Units", unitsX, y);
    doc.text("Unit price", priceX, y);
    doc.text("Total", totalX, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE - 2;

    doc.setTextColor(15, 23, 42);
    for (const p of input.products) {
      ensureSpace(LINE);
      const name = doc.splitTextToSize(p.name || "—", unitsX - MARGIN - 8)[0];
      doc.setFont("helvetica", "normal");
      doc.text(name, MARGIN, y);
      doc.text(p.units || "—", unitsX, y);
      doc.text(p.unitPrice || "—", priceX, y);
      doc.text(p.total || "—", totalX, y);
      y += LINE;
    }

    y += 4;
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE;
    doc.setFont("helvetica", "bold");
    // Totals row: total units under the Units column, total value under Total.
    doc.text("Total", MARGIN, y);
    if (totalUnits > 0) doc.text(String(totalUnits), unitsX, y);
    doc.text(
      `${input.totals.currency} ${input.totals.amount}`.trim(),
      totalX,
      y
    );
    y += LINE + 8;
  }

  // ── Tariffs (optional) ─────────────────────────────────────────────────────
  // One block per product: HS code on the header line, then duty and VAT on
  // their own lines, each with its computed cost where derivable.
  if (input.tariffs && input.tariffs.length > 0) {
    ensureSpace(LINE * 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Tariffs", MARGIN, y);
    y += LINE + 2;

    const costX = MARGIN + contentWidth; // right-aligned cost column
    const subIndent = MARGIN + 14;

    doc.setFontSize(10);
    for (const tr of input.tariffs) {
      ensureSpace(LINE * 3);
      // Product + HS code header line.
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const head = tr.hsCode ? `${tr.product || "—"}  ·  HS ${tr.hsCode}` : (tr.product || "—");
      doc.text(doc.splitTextToSize(head, contentWidth)[0], MARGIN, y);
      y += LINE;

      const cur = tr.currency || input.totals.currency || "";
      const costLabel = (cost?: string) => (cost ? `${cur} ${cost}`.trim() : "");

      // Duty line.
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Duty  ${tr.duty || "—"}`, subIndent, y);
      const dutyCost = costLabel(tr.dutyCost);
      if (dutyCost) {
        doc.setTextColor(15, 23, 42);
        doc.text(dutyCost, costX, y, { align: "right" });
      }
      y += LINE;

      // VAT line.
      doc.setTextColor(71, 85, 105);
      doc.text(`VAT  ${tr.vat || "—"}`, subIndent, y);
      const vatCost = costLabel(tr.vatCost);
      if (vatCost) {
        doc.setTextColor(15, 23, 42);
        doc.text(vatCost, costX, y, { align: "right" });
      }
      y += LINE + 4;
    }
    y += LINE - 8;
  }

  // ── Signature block ─────────────────────────────────────────────────────
  ensureSpace(120);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += LINE + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Signed by", MARGIN, y);
  y += LINE + 6;

  if (input.signature && input.signature.dataUrl.startsWith("data:")) {
    try {
      doc.addImage(input.signature.dataUrl, "PNG", MARGIN, y, 160, 56);
    } catch {
      // ignore malformed image — fall back to the line below
    }
    y += 64;
    doc.setDrawColor(148, 163, 184);
    doc.line(MARGIN, y, MARGIN + 200, y);
    y += LINE;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(input.signature.name || "—", MARGIN, y);
    y += LINE;
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${input.signature.date}`, MARGIN, y);
  } else {
    y += 40;
    doc.setDrawColor(148, 163, 184);
    doc.line(MARGIN, y, MARGIN + 200, y);
    y += LINE;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Awaiting signature", MARGIN, y);
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  return { blob, url };
}
