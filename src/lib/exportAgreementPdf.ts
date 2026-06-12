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
  // Online-view QR sits top-right; header text wraps short of it.
  const QR_SIZE = 84;
  const qrTop = 36;
  let textWidth = contentWidth;
  if (input.qr) {
    const qrX = pageWidth - MARGIN - QR_SIZE;
    textWidth = contentWidth - QR_SIZE - 16;
    try {
      doc.addImage(input.qr.dataUrl, "PNG", qrX, qrTop, QR_SIZE, QR_SIZE);
      doc.link(qrX, qrTop, QR_SIZE, QR_SIZE, { url: input.qr.url });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Scan to view online", qrX + QR_SIZE / 2, qrTop + QR_SIZE + 10, { align: "center" });
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

  // ── Transaction overview ────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Transaction Overview", MARGIN, y);
  y += LINE + 2;

  doc.setFontSize(10);
  const labelWidth = 150;
  for (const f of input.fields) {
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

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Description", MARGIN, y);
    doc.text("Units", MARGIN + contentWidth - 180, y);
    doc.text("Total", MARGIN + contentWidth - 80, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE - 2;

    doc.setTextColor(15, 23, 42);
    for (const p of input.products) {
      ensureSpace(LINE);
      const name = doc.splitTextToSize(p.name || "—", contentWidth - 200)[0];
      doc.setFont("helvetica", "normal");
      doc.text(name, MARGIN, y);
      doc.text(p.units || "—", MARGIN + contentWidth - 180, y);
      doc.text(p.total || "—", MARGIN + contentWidth - 80, y);
      y += LINE;
    }

    y += 4;
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE;
    doc.setFont("helvetica", "bold");
    doc.text("Total", MARGIN + contentWidth - 180, y);
    doc.text(
      `${input.totals.currency} ${input.totals.amount}`.trim(),
      MARGIN + contentWidth - 80,
      y
    );
    y += LINE + 8;
  }

  // ── Documents provided ────────────────────────────────────────────────────
  if (input.documents && input.documents.length > 0) {
    ensureSpace(LINE * 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Documents Provided", MARGIN, y);
    y += LINE + 2;

    const refX = MARGIN + contentWidth * 0.40;
    const dateX = MARGIN + contentWidth * 0.64;
    const valueX = MARGIN + contentWidth * 0.82;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Document", MARGIN, y);
    doc.text("Reference", refX, y);
    doc.text("Date", dateX, y);
    doc.text("Value", valueX, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE - 2;

    doc.setTextColor(15, 23, 42);
    for (const d of input.documents) {
      ensureSpace(LINE);
      const name = doc.splitTextToSize(d.label || "—", refX - MARGIN - 8)[0];
      doc.setFont("helvetica", "normal");
      doc.text(name, MARGIN, y);
      doc.text(d.reference || "—", refX, y);
      doc.text(d.date || "—", dateX, y);
      doc.text(d.value || "—", valueX, y);
      y += LINE;
    }
    y += LINE - 4;
  }

  // ── Expected tariffs (optional) ───────────────────────────────────────────
  if (input.tariffs && input.tariffs.length > 0) {
    ensureSpace(LINE * 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Expected Tariffs", MARGIN, y);
    y += LINE + 2;

    const hsX = MARGIN + contentWidth * 0.46;
    const dutyX = MARGIN + contentWidth * 0.66;
    const vatX = MARGIN + contentWidth * 0.86;

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text("Product", MARGIN, y);
    doc.text("HS code", hsX, y);
    doc.text("Duty", dutyX, y);
    doc.text("VAT", vatX, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(MARGIN, y, pageWidth - MARGIN, y);
    y += LINE - 2;

    doc.setTextColor(15, 23, 42);
    for (const tr of input.tariffs) {
      ensureSpace(LINE);
      const name = doc.splitTextToSize(tr.product || "—", hsX - MARGIN - 8)[0];
      doc.setFont("helvetica", "normal");
      doc.text(name, MARGIN, y);
      doc.text(tr.hsCode || "—", hsX, y);
      doc.text(tr.duty || "—", dutyX, y);
      doc.text(tr.vat || "—", vatX, y);
      y += LINE;
    }
    y += LINE - 4;
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
