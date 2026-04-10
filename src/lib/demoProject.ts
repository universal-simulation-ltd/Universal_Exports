import { ProjectData } from './projectStore'

// A fully pre-filled demo project: Markey Industrial Ltd (UK seller) exporting
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
    'invoice',
    'delivery-note',
    'bank-details',
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
  ],

  forms: {
    // ── Transaction ───────────────────────────────────────────────────────────
    transaction: {
      drawer: 'Markey Industrial Ltd',
      drawee: 'Dubois Équipements SAS',
      payee: 'Markey Industrial Ltd',
      currency: 'GBP',
      placeOfIssue: 'Portsmouth, United Kingdom',
      incoterms: 'CIF',
      paymentTerms: '30 days after sight',
      endorsementNotes: 'Without recourse. Documents against acceptance.',
    },

    // ── Shipment ─────────────────────────────────────────────────────────────
    shipment: {
      goodsDescription:
        'Precision CNC cutting tools and industrial drill bits — hardened steel, boxed',
      incoterms: 'CIF',
      transportMode: 'Sea',
      portLoading: 'Portsmouth, United Kingdom',
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
        'Goods manufactured at our Portsmouth facility. UK preferential origin applicable under UK–EU TCA.',
    },

    // ── Estimate / Quote ──────────────────────────────────────────────────────
    'estimate-quote': {
      referenceNo: 'QT-2026-0042',
      date: '2026-03-01',
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
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes: 'Please confirm receipt and expected dispatch date.',
    },

    // ── Invoice ───────────────────────────────────────────────────────────────
    invoice: {
      referenceNo: 'INV-2026-0089',
      date: '2026-04-10',
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
      counterparty: 'Dubois Équipements SAS',
      amount: '9825.00',
      docCurrency: 'GBP',
      notes: 'Goods dispatched in 3 pallets. Please inspect on receipt.',
    },

    // ── Picking List ──────────────────────────────────────────────────────────
    'picking-list': {
      pickedBy: 'Thomas Webb',
      datePicked: '2026-04-13',
      pickedItems: JSON.stringify({ 0: true, 1: true, 2: true }),
    },
  },
}

// Fake contact data that gets injected into MainContent when the demo loads
export const DEMO_YOUR_DETAILS = {
  registeredName: 'Markey Industrial Ltd',
  tradingName: 'Markey Tools',
  companyNumber: '08234561',
  vatNumber: 'GB 234 5678 90',
  eoriNumber: 'GB234567890000',
  address: '14 Harbour View, Portsmouth',
  country: 'United Kingdom',
  contactName: 'James Markey',
  telephone: '+44 23 9282 0000',
  email: 'james@markeyindustrial.co.uk',
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
