// Guards for data: URLs that come back from the database and are shown on the
// public pages (/view/:token, /sign/:token) or to the drafter.
//
// ⚠️ These values are written by other people. A view row's `pdf_data` is
// written by whichever signed-in drafter minted the token, and a counter-sign
// row's signature image by whoever holds the signing link. Turning such a
// string into a blob: URL keeps the MIME type it claims, and a blob: URL runs
// in THIS origin — so a `data:text/html,…` "PDF" shown in an <iframe> would be
// a script with the visitor's session. Only ever build a PDF blob as
// application/pdf, and only show signature images that really are images.

const PDF_PREFIX = /^data:application\/pdf(?:;[^,]*)?;base64,/i;
const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/i;

/**
 * A stored `data:application/pdf;base64,…` URL as a PDF Blob, or null when the
 * string is anything else (or isn't valid base64). The Blob's type is always
 * application/pdf, whatever the string claimed.
 */
export function pdfBlobFromDataUrl(dataUrl: string | null | undefined): Blob | null {
  if (!dataUrl) return null;
  const match = PDF_PREFIX.exec(dataUrl);
  if (!match) return null;
  try {
    const bin = atob(dataUrl.slice(match[0].length).replace(/\s+/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: "application/pdf" });
  } catch {
    return null;
  }
}

/** True for a PNG/JPEG/WebP base64 data URL — the only things the signature
 *  pad produces, and the only things worth putting in an <img>. */
export function isImageDataUrl(value: string | null | undefined): value is string {
  return !!value && IMAGE_DATA_URL.test(value);
}
