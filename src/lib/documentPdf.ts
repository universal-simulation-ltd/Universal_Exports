import { jsPDF } from "jspdf";

/**
 * Generic, branded single-document PDF builder.
 *
 * Every export document in the app is modelled the same way — a title plus a
 * list of label/value rows (exactly what `LockedSectionView` renders) — so one
 * builder can produce a tidy, on-brand PDF for any of them (Invoice, Packing
 * List, Delivery Note, Certificate of Origin, Bill of Lading, Letter of Credit,
 * …). The issuer's logo + company details are stamped in the header so the
 * output carries their branding, mirroring the Export Agreement PDF's look.
 */

export interface DocPdfParty {
  registeredName?: string;
  tradingName?: string;
  address?: string;
  vatNumber?: string;
  eoriNumber?: string;
  country?: string;
  contactName?: string;
  telephone?: string;
  email?: string;
}

export interface DocPdfInput {
  /** Document name, e.g. "Delivery Note". */
  title: string;
  /** Label/value rows — the same array passed to LockedSectionView. */
  fields: [string, string][];
  /** Labels whose value should render full-width (long text: Notes, Declaration). */
  colSpanFields?: string[];
  projectName?: string;
  /** Issuer (your details) — stamped in the header. */
  from?: DocPdfParty | null;
  /** Counterparty — stamped as the "To" block when present. */
  to?: DocPdfParty | null;
  /** Brand logo as a PNG/JPG data URL. */
  logoDataUrl?: string;
  /** Accent colour for rules/headings. Defaults to UNI·SIM orange. */
  accentColor?: [number, number, number];
  /** Pre-formatted "generated on" date; defaults to today. */
  generatedOn?: string;
}

export interface BuiltDocPdf {
  blob: Blob;
  url: string;
  fileName: string;
}

const MARGIN = 48;
const LINE = 15;
const INK: [number, number, number] = [15, 23, 42]; // slate-900
const MUTED: [number, number, number] = [100, 116, 139]; // slate-500

function partyLines(p: DocPdfParty): string[] {
  const out: string[] = [];
  const name = p.registeredName || p.tradingName;
  if (name) out.push(name);
  if (p.address) out.push(p.address);
  const ids = [p.vatNumber && `VAT ${p.vatNumber}`, p.eoriNumber && `EORI ${p.eoriNumber}`]
    .filter(Boolean)
    .join("  ·  ");
  if (ids) out.push(ids);
  const contact = [p.contactName, p.telephone, p.email].filter(Boolean).join("  ·  ");
  if (contact) out.push(contact);
  return out;
}

export function buildDocumentPdf(input: DocPdfInput): BuiltDocPdf {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const accent = input.accentColor ?? [224, 85, 4];
  let y = MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN - 24) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Header: logo + issuer (left), document title + meta (right) ───────────
  const headerTop = y;
  let leftX = MARGIN;

  if (input.logoDataUrl) {
    try {
      const props = doc.getImageProperties(input.logoDataUrl);
      const maxH = 46;
      const maxW = 150;
      const ratio = props.width / props.height || 1;
      let w = maxH * ratio;
      let h = maxH;
      if (w > maxW) {
        w = maxW;
        h = maxW / ratio;
      }
      doc.addImage(input.logoDataUrl, props.fileType || "PNG", MARGIN, headerTop, w, h);
      leftX = MARGIN;
      y = headerTop + h + 8;
    } catch {
      // malformed logo — carry on without it
    }
  }

  const from = input.from ?? null;
  if (from) {
    const lines = partyLines(from);
    if (lines.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.text(lines[0], leftX, y + 2);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      for (const l of lines.slice(1)) {
        const wrapped = doc.splitTextToSize(l, contentWidth * 0.55) as string[];
        for (const wl of wrapped) {
          doc.text(wl, leftX, y);
          y += 11;
        }
      }
    }
  }

  // Right-aligned document title + project + date.
  const rightX = pageWidth - MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(input.title, rightX, headerTop + 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  let metaY = headerTop + 30;
  if (input.projectName) {
    doc.text(input.projectName, rightX, metaY, { align: "right" });
    metaY += 12;
  }
  const dateStr = input.generatedOn ?? new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  doc.text(dateStr, rightX, metaY, { align: "right" });

  y = Math.max(y, metaY + 10);

  // Accent rule under the header.
  doc.setDrawColor(...accent);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 20;

  // ── "To" block ────────────────────────────────────────────────────────────
  if (input.to) {
    const toLines = partyLines(input.to);
    if (toLines.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("TO", MARGIN, y);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      doc.text(toLines[0], MARGIN, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      for (const l of toLines.slice(1)) {
        const wrapped = doc.splitTextToSize(l, contentWidth * 0.7) as string[];
        for (const wl of wrapped) {
          doc.text(wl, MARGIN, y);
          y += 11;
        }
      }
      y += 8;
    }
  }

  // ── Fields ─────────────────────────────────────────────────────────────────
  const colSpan = new Set(input.colSpanFields ?? []);
  const labelW = 150;
  const valueX = MARGIN + labelW;
  const valueW = contentWidth - labelW;

  for (const [label, rawValue] of input.fields) {
    const value = rawValue && String(rawValue).trim() ? String(rawValue) : "—";

    if (colSpan.has(label)) {
      ensureSpace(LINE * 2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(label.toUpperCase(), MARGIN, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      const wrapped = doc.splitTextToSize(value, contentWidth) as string[];
      for (const wl of wrapped) {
        ensureSpace(LINE);
        doc.text(wl, MARGIN, y);
        y += 13;
      }
      y += 6;
      continue;
    }

    const wrapped = doc.splitTextToSize(value, valueW) as string[];
    ensureSpace(Math.max(LINE, wrapped.length * 13));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, MARGIN, y);
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    let vy = y;
    for (const wl of wrapped) {
      doc.text(wl, valueX, vy);
      vy += 13;
    }
    // faint row separator
    const rowH = Math.max(LINE, wrapped.length * 13);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y + rowH - 9, pageWidth - MARGIN, y + rowH - 9);
    y += rowH;
  }

  // ── Footer on every page ────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Generated with Universal Exports · opensource.unisim.co.uk/exports", MARGIN, pageHeight - 28);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - MARGIN, pageHeight - 28, { align: "right" });
  }

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const safe = input.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "document";
  return { blob, url, fileName: `${safe}.pdf` };
}

/** Build the document PDF and trigger a browser download. */
export function downloadDocumentPdf(input: DocPdfInput): void {
  const { url, fileName } = buildDocumentPdf(input);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the download a tick to start before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
