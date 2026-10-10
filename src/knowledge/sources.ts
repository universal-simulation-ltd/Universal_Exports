import type { Source } from './types'

// The research, standards and reports behind each article, keyed by article
// id. The same in every language, so kept once here and attached by index.ts.
//
// Original founding documents first, then the standards and law, then
// guidance — and only sources for what the app really does (checked against
// src/ on 2026-09-29: jsPDF builds every PDF in the browser
// (lib/exportAgreementPdf.ts, documentPdf.ts, qrSheetPdf.ts), Deal XML is a
// plain XML 1.0 document (lib/dealXml.ts), the tariff checker calls the UK
// Trade Tariff API v2 /commodities/<code> straight from the browser
// (CustomsLookup.tsx), the sign-up gate looks companies up through the
// Companies House API via our Worker, the Incoterms picker is Incoterms 2020,
// the phone hand-off is a Supabase Realtime broadcast checked against a
// 6-digit PIN, and agreement view links are crypto.randomUUID tokens).
// Nothing in the app is a certificate-based digital signature, so none of
// that cryptography is cited.
//
// ⚠️ `pdf` (our hosted copy at opensource.unisim.co.uk/kb/papers/) ONLY where
// the licence allows redistribution: UK Crown copyright under the Open
// Government Licence (legislation.gov.uk, Law Commission), EU acts under
// Decision 2011/833/EU, and IETF RFCs. UN, ICC, WCO and W3C documents are
// linked, not hosted. unece.org bot-blocks curl, so the UN Layout Key was
// confirmed through a Wayback Machine capture; the link points at UNECE.

const INCOTERMS_2020: Source = {
  kind: 'standard',
  title: 'Incoterms® 2020',
  publisher: 'International Chamber of Commerce',
  year: 2020,
  href: 'https://iccwbo.org/business-solutions/incoterms-rules/incoterms-2020/',
}

const LAW_COM_386: Source = {
  kind: 'report',
  title: 'Electronic execution of documents (Law Com No 386)',
  authors: 'Law Commission of England and Wales',
  publisher: 'Law Commission',
  year: 2019,
  href: 'https://cdn.websitebuilder.service.justice.gov.uk/uploads/sites/54/2025/12/Electronic-Execution-Report.pdf',
  pdf: 'papers/law-com-386-electronic-execution.pdf',
  licence: 'Crown copyright 2019, Open Government Licence v3.0',
}

export const SOURCES: Record<string, Source[]> = {
  'what-is-an-export-agreement': [
    {
      kind: 'law',
      title: 'United Nations Convention on Contracts for the International Sale of Goods (Vienna, 1980) (CISG)',
      publisher: 'UNCITRAL',
      year: 1980,
      href: 'https://uncitral.un.org/en/texts/salegoods/conventions/sale_of_goods/cisg',
    },
    INCOTERMS_2020,
    {
      kind: 'guidance',
      title: 'Export goods from the UK: step by step',
      publisher: 'GOV.UK',
      href: 'https://www.gov.uk/export-goods',
    },
  ],
  'export-documents-explained': [
    {
      kind: 'standard',
      title: 'Recommendation No. 1: United Nations Layout Key for Trade Documents (ECE/TRADE/C/CEFACT/2017/7)',
      publisher: 'UNECE / UN/CEFACT',
      year: 2017,
      href: 'https://unece.org/sites/default/files/2023-09/Rec01-ECE_TRADE_C_CEFACT_2017_07E.pdf',
    },
    {
      kind: 'law',
      title: 'Carriage of Goods by Sea Act 1992 — rights under bills of lading',
      publisher: 'UK Parliament',
      year: 1992,
      href: 'https://www.legislation.gov.uk/ukpga/1992/50/contents',
      pdf: 'papers/carriage-of-goods-by-sea-act-1992.pdf',
      licence: 'Crown copyright, Open Government Licence v3.0',
    },
    {
      kind: 'guidance',
      title: 'Get proof of origin for your goods',
      publisher: 'GOV.UK',
      href: 'https://www.gov.uk/guidance/get-proof-of-origin-for-your-goods',
    },
  ],
  'commodity-codes-and-tariffs': [
    {
      kind: 'standard',
      title: 'What is the Harmonized System (HS)?',
      publisher: 'World Customs Organization',
      href: 'https://www.wcoomd.org/en/topics/nomenclature/overview/what-is-the-harmonized-system.aspx',
    },
    {
      kind: 'guidance',
      title: 'Finding commodity codes for imports into or exports out of the UK',
      publisher: 'GOV.UK',
      href: 'https://www.gov.uk/guidance/finding-commodity-codes-for-imports-or-exports',
    },
    {
      kind: 'guidance',
      title: 'Trade Tariff API — the service the tariff checker asks',
      publisher: 'HM Revenue & Customs',
      href: 'https://api.trade-tariff.service.gov.uk/',
    },
    INCOTERMS_2020,
  ],
  'how-universal-exports-works': [
    {
      kind: 'guidance',
      title: 'jsPDF — the open-source library this app builds its PDFs with',
      publisher: 'GitHub',
      href: 'https://github.com/parallax/jsPDF',
    },
    {
      kind: 'standard',
      title: 'Extensible Markup Language (XML) 1.0 (Fifth Edition) — the Deal XML format',
      publisher: 'W3C',
      year: 2008,
      href: 'https://www.w3.org/TR/xml/',
    },
    {
      kind: 'guidance',
      title: 'Companies House API — the company lookup in Your details',
      publisher: 'Companies House',
      href: 'https://developer.company-information.service.gov.uk/',
    },
  ],
  'signing-and-counter-signing': [
    LAW_COM_386,
    {
      kind: 'law',
      title: 'Electronic Communications Act 2000, section 7: electronic signatures',
      publisher: 'UK Parliament',
      year: 2000,
      href: 'https://www.legislation.gov.uk/ukpga/2000/7/contents',
      pdf: 'papers/electronic-communications-act-2000.pdf',
      licence: 'Crown copyright, Open Government Licence v3.0',
    },
    {
      kind: 'law',
      title: 'Regulation (EU) No 910/2014 on electronic identification and trust services (eIDAS)',
      publisher: 'Official Journal of the European Union, L 257/73',
      year: 2014,
      href: 'https://eur-lex.europa.eu/eli/reg/2014/910/oj',
      pdf: 'papers/eidas-regulation-910-2014.pdf',
      licence: '© European Union, reused under Commission Decision 2011/833/EU',
    },
    {
      kind: 'guidance',
      title: 'Realtime Broadcast — the one-off live message the phone signature travels in',
      publisher: 'Supabase',
      href: 'https://supabase.com/docs/guides/realtime/broadcast',
    },
  ],
  'your-data-and-privacy': [
    {
      kind: 'guidance',
      title: 'Good Practices for Capability URLs',
      authors: 'Jeni Tennison',
      publisher: 'W3C Technical Architecture Group',
      year: 2014,
      href: 'https://www.w3.org/TR/capability-urls/',
    },
    {
      kind: 'standard',
      title: 'Universally Unique IDentifiers (UUIDs) (RFC 9562) — the random version 4 behind each view link',
      authors: 'Kyzer R. Davis, Brad G. Peabody, Paul J. Leach',
      publisher: 'IETF',
      year: 2024,
      href: 'https://www.rfc-editor.org/rfc/rfc9562.html',
      pdf: 'papers/rfc-9562-uuid.pdf',
      licence: 'IETF Trust — RFC, freely redistributable unmodified',
    },
    {
      kind: 'standard',
      title: 'The Transport Layer Security (TLS) Protocol Version 1.3 (RFC 8446)',
      authors: 'Eric Rescorla',
      publisher: 'IETF',
      year: 2018,
      href: 'https://www.rfc-editor.org/rfc/rfc8446.html',
    },
    {
      kind: 'guidance',
      title: 'Encryption (UK GDPR guidance)',
      publisher: 'Information Commissioner\'s Office',
      href: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/security/encryption/',
    },
  ],
}
