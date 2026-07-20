import { jsPDF } from "jspdf";

/**
 * Print-ready sheet of 8 box QR labels (2 columns × 4 rows on A4), numbered
 * Box 1–8.
 *
 * Every label opens the same public `/view/:token` link as the agreement's
 * header QR, so a seller can cut these out and stick one on each box / carton —
 * customs (or the buyer) scans any label to pull up the full export pack
 * online. The QR PNG is pre-rendered by qrPngDataUrl() so it carries the same
 * brand styling (orange modules, UniSim mark) as everywhere else.
 */

export interface QrSheetInput {
  /** Pre-rendered brand-styled QR PNG data URL (see qrPngDataUrl). */
  dataUrl: string;
  /** The URL each label opens — added as a click-through link annotation. */
  url: string;
  /** Project name, printed as the sheet title and under each tile. */
  projectName: string;
  /**
   * When set, the online link behind these labels was NOT reserved (no account),
   * so the sheet is stamped with this caption + a diagonal watermark to make
   * clear the labels are a preview and won't resolve until reserved.
   */
  watermark?: string;
}

export interface BuiltQrSheet {
  blob: Blob;
  /** Object URL for download / preview. Caller owns revocation. */
  url: string;
}

export function buildQrSheetPdf({ dataUrl, url, projectName, watermark }: QrSheetInput): BuiltQrSheet {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const MARGIN = 40;
  const name = projectName || "Export pack";

  // Title + instructions.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${name} — box QR labels`, MARGIN, MARGIN);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Cut out and attach one to each box or carton. Scanning any label opens the full export pack online.",
    MARGIN,
    MARGIN + 16
  );

  // Unreserved-link caption (amber), shown above the grid when watermarked.
  if (watermark) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`⚠ ${watermark}`, MARGIN, MARGIN + 30);
  }

  // 2 × 4 grid of tiles.
  const cols = 2;
  const rows = 4;
  const gridTop = MARGIN + (watermark ? 48 : 38);
  const cellW = (pageWidth - MARGIN * 2) / cols;
  const qrSize = 135;
  const cellH = qrSize + 42;

  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const cx = MARGIN + c * cellW + cellW / 2;
    const top = gridTop + r * cellH;
    const qrX = cx - qrSize / 2;

    try {
      doc.addImage(dataUrl, "PNG", qrX, top, qrSize, qrSize);
      doc.link(qrX, top, qrSize, qrSize, { url });
    } catch {
      // malformed image — skip this tile rather than fail the whole sheet
    }
    // No per-tile caption: every label is the same code, so "Box N" / project
    // name / status lines were just repeated noise (the header covers it).
  }

  // Diagonal watermark across the whole sheet when the link isn't reserved, so
  // these preview labels can't be mistaken for print-ready ones.
  if (watermark) {
    const GState = (doc as unknown as { GState?: new (o: { opacity: number }) => unknown }).GState;
    if (GState) doc.setGState(new GState({ opacity: 0.12 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.setTextColor(180, 83, 9);
    doc.text("ACCOUNT REQUIRED", pageWidth / 2, pageHeight / 2, { align: "center", angle: 32 });
    if (GState) doc.setGState(new GState({ opacity: 1 }));
  }

  const blob = doc.output("blob");
  return { blob, url: URL.createObjectURL(blob) };
}
