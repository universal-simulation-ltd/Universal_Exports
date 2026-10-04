import type { jsPDF } from "jspdf";
// `?url` makes Vite emit each TTF as a hashed asset and hand back its URL, so
// the fonts stay out of every JS chunk. Only the lazily-loaded PDF builders
// import this module, so the fonts are fetched only when someone builds a PDF.
import regularUrl from "../assets/fonts/NotoSans-Regular.ttf?url";
import boldUrl from "../assets/fonts/NotoSans-Bold.ttf?url";

/**
 * Noto Sans, embedded in every PDF Exports builds. jsPDF's built-in Helvetica
 * is WinAnsi only, so a Turkish, Polish or Welsh name came out wrong ("Ayşe"
 * as "Ay_e", and letter-spaced). The TTFs are the Latin + Latin Extended
 * subsets the Assess apps ship (same loader pattern as their pdfFont.ts);
 * licence in src/assets/fonts/OFL.txt.
 */
export const PDF_FONT = "NotoSans";

const FACES = [
  ["NotoSans-Regular.ttf", regularUrl, "normal"],
  ["NotoSans-Bold.ttf", boldUrl, "bold"],
] as const;

let loading: Promise<string[]> | null = null;

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Load the font faces once (and retry next time if the load failed). */
export async function loadPdfFontData(): Promise<string[]> {
  loading ??= Promise.all(FACES.map(([, url]) => fetchBase64(url)));
  try {
    return await loading;
  } catch (err) {
    loading = null; // let the next PDF retry rather than cache the failure
    throw err;
  }
}

/**
 * Register Noto Sans (normal / bold) on `doc` and return the family name to
 * pass to setFont. If the fonts can't be fetched (offline, say) the PDF still
 * builds, in Helvetica, rather than failing outright.
 */
export async function embedPdfFont(doc: jsPDF): Promise<string> {
  let data: string[];
  try {
    data = await loadPdfFontData();
  } catch (err) {
    console.warn("[exports] PDF font unavailable, falling back to Helvetica:", err);
    return "helvetica";
  }
  FACES.forEach(([file, , style], i) => {
    doc.addFileToVFS(file, data[i]);
    doc.addFont(file, PDF_FONT, style);
  });
  doc.setFont(PDF_FONT, "normal");
  return PDF_FONT;
}
