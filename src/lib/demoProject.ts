import { ProjectData } from './projectStore'
import type { CatalogueProduct } from './productCatalogueStore'

// Hardcoded demo catalogue products — merged into the catalogue state when demo loads
export const DEMO_CATALOGUE: CatalogueProduct[] = [
  {
    id: 'demo-p1',
    code: 'MIL-CNC-SET10',
    hsCode: '8207199000',
    name: 'CNC Precision Cutting Tool Set (10pc)',
    description: 'Hardened steel CNC cutting tool set, 10 pieces, boxed',
    unitPrice: 124.50,
    vatPercent: 20,
  },
  {
    id: 'demo-p2',
    code: 'MIL-DRILL-HSS',
    hsCode: '8207509000',
    name: 'Industrial HSS Drill Bit',
    description: 'High-speed steel industrial drill bit, Ø8mm',
    unitPrice: 8.75,
    vatPercent: 20,
  },
  {
    id: 'demo-p3',
    code: 'MIL-CAL-150',
    hsCode: '8207509000',
    name: 'Digital Vernier Caliper 150mm',
    description: 'Stainless steel digital vernier caliper, 150mm range, 0.01mm resolution',
    unitPrice: 34.50,
    vatPercent: 20,
  },
]

// A fully pre-filled demo project: Universal Simulation Ltd (UK seller) exporting
// precision cutting tools to Dubois Équipements SAS (France).
export const DEMO_PROJECT: ProjectData = {
  id: 'demo-example-project',
  name: 'Example: UK Export — Precision Tools to France',
  createdAt: '2026-03-01T09:00:00.000Z',
  role: 'seller',
  eboxyGenerated: false,

  lockedSections: [
    'project-overview',
    'transaction',
    'shipment',
    'product-details',
    'coo',
    'estimate-quote',
    'purchase-order',
    'invoice',
    'delivery-note',
    'picking-list',
    'bank-details',
    'receipt',
    'credit-note',
    'letter-of-credit',
    'customs',
  ],

  savedSections: [
    'project-overview',
    'transaction',
    'shipment',
    'product-details',
    'coo',
    'estimate-quote',
    'purchase-order',
    'invoice',
    'delivery-note',
    'picking-list',
    'bank-details',
    'receipt',
    'credit-note',
    'letter-of-credit',
    'customs',
  ],

  forms: {
    // ── Transaction ───────────────────────────────────────────────────────────
    transaction: {
      drawer: 'Universal Simulation Ltd',
      drawee: 'Dubois Équipements SAS',
      payee: 'Universal Simulation Ltd',
      currency: 'GBP',
      placeOfIssue: 'London, United Kingdom',
      incoterms: 'CIF',
      paymentTerms: '30 days after sight',
      endorsementNotes: 'Without recourse. Documents against acceptance.',
    },

    // ── Shipment ─────────────────────────────────────────────────────────────
    shipment: {
      goodsDescription:
        'Precision CNC cutting tools, industrial drill bits and digital measuring instruments — hardened steel and stainless steel, boxed',
      incoterms: 'CIF',
      transportMode: 'Sea',
      portLoading: 'London, United Kingdom',
      portDischarge: 'Saint-Malo, France',
      shippingDate: '2026-04-14',
      expectedArrival: '2026-04-17',
      vesselFlight: 'Brittany Ferries — MV Cotentin',
    },

    // ── Product Details ───────────────────────────────────────────────────────
    'product-details': {
      productLines: JSON.stringify([
        { catalogueId: 'demo-p1', units: '50', discount: '0', discountAmount: '0' },
        { catalogueId: 'demo-p2', units: '200', discount: '5', discountAmount: '0' },
        { catalogueId: 'demo-p3', units: '10', discount: '0', discountAmount: '0' },
      ]),
    },

    // ── Certificate of Origin ─────────────────────────────────────────────────
    coo: {
      countryOfOrigin: 'United Kingdom',
      cooNotes:
        'Goods manufactured at our London facility. UK preferential origin applicable under UK–EU TCA.',
    },

    // ── Estimate / Quote ──────────────────────────────────────────────────────
    'estimate-quote': {
      referenceNo: 'QT-2026-0042',
      date: '2026-03-01',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes:
        'Valid for 30 days. Prices exclude delivery. CIF Saint-Malo terms apply. Subject to standard terms & conditions.',
    },

    // ── Purchase Order (received from buyer) ──────────────────────────────────
    'purchase-order': {
      referenceNo: 'PO-DBE-20260312',
      date: '2026-03-12',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes: 'Please confirm receipt and expected dispatch date.',
    },

    // ── Invoice ───────────────────────────────────────────────────────────────
    invoice: {
      referenceNo: 'INV-2026-0089',
      date: '2026-04-10',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes:
        'Payment due 30 days from date of invoice. Bank details as per the enclosed bill of exchange.',
    },

    // ── Delivery Note ─────────────────────────────────────────────────────────
    'delivery-note': {
      referenceNo: 'DN-2026-0089',
      date: '2026-04-14',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes: 'Goods dispatched in 3 pallets. Please inspect on receipt.',
    },

    // ── Picking List ──────────────────────────────────────────────────────────
    'picking-list': {
      pickedBy: 'Alex Chen',
      datePicked: '2026-04-13',
      pickedItems: JSON.stringify({ 0: true, 1: true, 2: true }),
    },

    // ── Receipt ───────────────────────────────────────────────────────────────
    receipt: {
      referenceNo: 'REC-2026-0089',
      date: '2026-04-21',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes: 'Payment received in full. Thank you for your business.',
    },

    // ── Credit Note ───────────────────────────────────────────────────────────
    'credit-note': {
      referenceNo: 'CN-2026-0012',
      date: '2026-04-18',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '175.00',
      docCurrency: 'GBP',
      notes: 'Credit note issued for return of 2 units — Industrial HSS Drill Bit (MIL-DRILL-HSS) found damaged on arrival.',
    },

    // ── Customs / Tariffs ─────────────────────────────────────────────────────
    customs: {
      // Applied tariff rules for the three demo products (grouped by HS code)
      appliedRules: JSON.stringify([
        {
          hsCode: '8207199000',
          productName: 'CNC Precision Cutting Tool Set (10pc)',
          description: 'Other tools for pressing, stamping or punching',
          thirdCountryDuty: '2.70%',
          preferentialDuty: '0.00%',
          vat: '20%',
          additionalDuties: [],
          measures: [],
        },
        {
          hsCode: '8207509000',
          productName: 'Industrial HSS Drill Bit + Digital Vernier Caliper 150mm',
          description: 'Other tools for drilling, other than for rock drilling',
          thirdCountryDuty: '3.70%',
          preferentialDuty: '0.00%',
          vat: '20%',
          additionalDuties: [],
          measures: [],
        },
      ]),
      // Export compliance checklist — all ticked for the demo
      exportCds: 'true',
      exportLicence: 'true',
      exportEori: 'true',
      exportInvoice: 'true',
      exportSanctions: 'true',
    },

    // ── Handy Tools — Getting Started checklist (all pre-ticked for demo) ────
    'handy-tools': {
      gettingStartedChecked: JSON.stringify([true, true, true, true]),
    },

    // ── Letter of Credit ──────────────────────────────────────────────────────
    'letter-of-credit': {
      referenceNo: 'LC-DBE-2026-004',
      date: '2026-03-14',
      issuedBy: 'Universal Simulation Ltd',
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      lcNumber: 'LC-DBE-2026-004',
      lcDateOfIssue: '2026-03-14',
      lcExpiryDate: '2026-05-14',
      lcAmount: '9825.00',
      lcCurrency: 'GBP',
      lcIssuingBank: 'BNP Paribas, Saint-Malo',
      lcAdvisingBank: 'HSBC, London',
      lcType: 'Irrevocable',
      lcTerms: 'Payment at sight upon presentation of compliant documents including commercial invoice, bill of lading, and certificate of origin.',
    },
  },
}

// Fake contact data that gets injected into MainContent when the demo loads
export const DEMO_YOUR_DETAILS = {
  registeredName: 'Universal Simulation Ltd',
  tradingName: 'UniSim',
  companyNumber: '12345678',
  vatNumber: 'GB 123 4567 89',
  eoriNumber: 'GB123456789000',
  address: '1 Innovation Way, London',
  country: 'United Kingdom',
  contactName: 'Alex Chen',
  telephone: '+44 20 7946 0000',
  email: 'alex@universalsimulation.co.uk',
}

export const DEMO_OTHER_PARTY = {
  registeredName: 'Dubois Équipements SAS',
  tradingName: '',
  companyNumber: '41823004700021',
  vatNumber: 'FR 41 823004700',
  eoriNumber: 'FR41823004700021',
  address: '8 Rue de la Manche, Saint-Malo',
  country: 'France',
  contactName: 'Claire Dubois',
  telephone: '+33 2 99 40 0000',
  email: 'c.dubois@duboisequipements.fr',
}
