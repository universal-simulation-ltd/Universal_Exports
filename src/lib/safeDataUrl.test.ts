import { describe, it, expect } from "vitest";
import { isImageDataUrl, pdfBlobFromDataUrl } from "./safeDataUrl";

describe("pdfBlobFromDataUrl", () => {
  it("decodes a PDF data URL into an application/pdf Blob", async () => {
    const blob = pdfBlobFromDataUrl(`data:application/pdf;base64,${btoa("%PDF-1.7")}`);
    expect(blob?.type).toBe("application/pdf");
    expect(await blob?.text()).toBe("%PDF-1.7");
  });

  it("accepts the filename parameter jsPDF writes", () => {
    const blob = pdfBlobFromDataUrl(`data:application/pdf;filename=generated.pdf;base64,${btoa("%PDF")}`);
    expect(blob?.type).toBe("application/pdf");
  });

  it("refuses anything that isn't a PDF — an HTML blob would run in this origin", () => {
    expect(pdfBlobFromDataUrl(`data:text/html;base64,${btoa("<script>alert(1)</script>")}`)).toBeNull();
    expect(pdfBlobFromDataUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(pdfBlobFromDataUrl("data:application/pdfx;base64,AAAA")).toBeNull();
    expect(pdfBlobFromDataUrl("https://example.com/a.pdf")).toBeNull();
    expect(pdfBlobFromDataUrl("")).toBeNull();
    expect(pdfBlobFromDataUrl(null)).toBeNull();
  });

  it("returns null for broken base64 rather than throwing", () => {
    expect(pdfBlobFromDataUrl("data:application/pdf;base64,%%%")).toBeNull();
  });
});

describe("isImageDataUrl", () => {
  it("accepts what the signature pad produces", () => {
    expect(isImageDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isImageDataUrl("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
  });

  it("refuses remote URLs, SVG and other schemes", () => {
    expect(isImageDataUrl("https://tracker.example/pixel.png")).toBe(false);
    expect(isImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(isImageDataUrl("javascript:alert(1)")).toBe(false);
    expect(isImageDataUrl("data:image/png;base64,\"onerror=alert(1)")).toBe(false);
    expect(isImageDataUrl("")).toBe(false);
    expect(isImageDataUrl(null)).toBe(false);
  });
});
