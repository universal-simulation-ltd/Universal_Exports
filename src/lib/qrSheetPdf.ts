import { jsPDF } from "jspdf";

/**
 * Print-ready sheet of 8 identical QR labels (2 columns × 4 rows on A4).
 *
 * Each label opens the same public `/view/:token` link as the agreement's
 * header QR, so a seller can cut these out and stick one on each product /
 * carton — customs (or the buyer) scans any label to pull up the full export
 * pack online. The QR PNG is pre-rendered by qrPngDataUrl() so it carries the
 * same brand styling (orange modules, UniSim mark) as everywhere else.
 */

export interface QrSheetInput {
  /** Pre-rendered brand-styled QR PNG data URL (see qrPngDataUrl). */
  dataUrl: string;
  /** The URL each label opens — added as a click-through link annotation. */
  url: string;
  /** Project name, printed as the sheet title and under each tile. */
  projectName: string;
}

export interface BuiltQrSheet {
  blob: Blob;
  /** Object URL for download / preview. Caller owns revocation. */
  url: string;
}

export function buildQrSheetPdf({ dataUrl, url, projectName }: QrSheetInput): BuiltQrSheet {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const MARGIN = 40;
  const name = projectName || "Export pack";

  // Title + instructions.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${name} — scan labels`, MARGIN, MARGIN);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Cut out and attach one to each product or carton. Scanning any label opens the full export pack online.",
    MARGIN,
    MARGIN + 16
  );

  // 2 × 4 grid of tiles.
  const cols = 2;
  const rows = 4;
  const gridTop = MARGIN + 38;
  const cellW = (pageWidth - MARGIN * 2) / cols;
  const qrSize = 150;
  const cellH = qrSize + 44;

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

    const label = doc.splitTextToSize(name, cellW - 20)[0];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(label, cx, top + qrSize + 14, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Scan to view online", cx, top + qrSize + 26, { align: "center" });
  }

  const blob = doc.output("blob");
  return { blob, url: URL.createObjectURL(blob) };
}
