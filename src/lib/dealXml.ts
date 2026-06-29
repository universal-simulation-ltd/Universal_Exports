import type { AgreementPdfInput } from "./exportAgreementPdf";

/**
 * Serialise the export deal (the same data that drives the agreement PDF) to a
 * structured XML document, so it can be re-imported into other trade / customs
 * software. Attribute + element values are XML-escaped; empty sections still
 * emit their wrapper element so downstream parsers see a stable shape.
 */

function esc(s: string | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDealXml(input: AgreementPdfInput): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<ExportDeal>");
  lines.push(`  <ProjectName>${esc(input.projectName)}</ProjectName>`);
  lines.push(`  <PreparedAs>${esc(input.role)}</PreparedAs>`);
  lines.push(`  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>`);

  lines.push("  <Transaction>");
  for (const f of input.fields) {
    lines.push(`    <Field label="${esc(f.label)}">${esc(f.value)}</Field>`);
  }
  lines.push("  </Transaction>");

  lines.push(
    `  <Totals currency="${esc(input.totals.currency)}" amount="${esc(input.totals.amount)}" />`
  );

  lines.push("  <Products>");
  for (const p of input.products) {
    lines.push(
      `    <Product name="${esc(p.name)}" units="${esc(p.units)}" unitPrice="${esc(p.unitPrice)}" total="${esc(p.total)}" />`
    );
  }
  lines.push("  </Products>");

  lines.push("  <Documents>");
  for (const d of input.documents ?? []) {
    lines.push(
      `    <Document label="${esc(d.label)}" reference="${esc(d.reference)}" date="${esc(d.date)}" value="${esc(d.value)}" />`
    );
  }
  lines.push("  </Documents>");

  lines.push("  <Tariffs>");
  for (const tr of input.tariffs ?? []) {
    lines.push(
      `    <Tariff product="${esc(tr.product)}" hsCode="${esc(tr.hsCode)}" duty="${esc(tr.duty)}" vat="${esc(tr.vat)}" />`
    );
  }
  lines.push("  </Tariffs>");

  lines.push("</ExportDeal>");
  return lines.join("\n");
}

/** Build the XML and trigger a browser download. */
export function downloadDealXml(input: AgreementPdfInput, fileName: string): void {
  const xml = buildDealXml(input);
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
