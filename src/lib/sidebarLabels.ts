import type { MessageKey } from "@/lib/i18n";

// What each item in the document sidebar (components/DocumentSidebar.tsx) is
// called — the phone's menu bar at the foot of the editor shows the one you are
// on (pages/Index.tsx, `PhoneMenuBar`). Keep it in step with the sidebar's own
// labels.
const ITEM_LABELS: Record<string, MessageKey> = {
  "ai-import": "sidebar.eboxyAI",
  "your-details": "sidebar.yourDetails",
  "contacts": "sidebar.contacts",
  "saved-projects": "sidebar.saved",
  "project-overview": "sidebar.projectOverview",
  "transaction": "sidebar.transaction",
  "product-details": "sidebar.products",
  "coo": "sidebar.cooOrigin",
  "estimate-quote": "sidebar.estimateQuote",
  "purchase-order": "sidebar.purchaseOrder",
  "invoice": "sidebar.invoice",
  "shipment": "sidebar.shipmentDetails",
  "picking-list": "sidebar.pickingList",
  "delivery-note": "sidebar.deliveryNote",
  "certificate-of-origin": "sidebar.certificateOfOrigin",
  "bill-of-lading": "sidebar.billOfLading",
  "bank-details": "sidebar.bankDetails",
  "receipt": "sidebar.receipt",
  "credit-note": "sidebar.creditNote",
  "letter-of-credit": "sidebar.letterOfCredit",
  "customs": "sidebar.tariffs",
  "handy-tools": "sidebar.handyTools",
  "eboxy": "sidebar.eboxy",
};

/** The sidebar's own label for an item, or null for one it does not list. */
export function sidebarItemLabel(id: string | null, t: (key: MessageKey) => string): string | null {
  const key = id ? ITEM_LABELS[id] : undefined;
  return key ? t(key) : null;
}
