# Universal Exports — docs

## What this repo is

Universal Exports is an open-source platform for **Export Agreements and trade
finance documents** — generate, sign, and manage export paperwork in the
browser. It can be used two ways: self-host it for free with your own
Supabase, or use UNI·SIM's hosted deployment.

- **Live:** [opensource.unisim.co.uk/exports](https://opensource.unisim.co.uk/exports)
  — served by path via the `opensource-portal` Worker, which proxies
  `/exports` to its Cloudflare Pages project.
- **Stack:** Vite + React + TypeScript, shadcn/ui (Radix primitives),
  Tailwind. Tests run under Vitest, with a Playwright config for end-to-end
  runs.
- **Persistence:** unlike the purely device-local Universal Apps, Exports has
  full per-user Supabase persistence — bank accounts, contacts, catalogue and
  projects are keyed by user id (see the in-repo `supabase/` folder).
- **Signatures:** includes a draw-to-sign flow with a mobile hand-off — the
  desktop signature pad can show a QR that opens a `/sign-mobile/<token>`
  route so the signature is drawn on a phone. The drafter's "You sign" block
  captures name, **role/title** (e.g. Director, CEO) and an optional **company
  stamp/seal** upload (`StampUpload.tsx`); both are carried into the signature
  block of the generated PDF (`lib/exportAgreementPdf.ts`) — role beneath the
  signer's name, stamp beside the signature.

Free and open source; the app is usable without an account (sign-in gates only
the save-to-cloud features).

## Trade documents produced

Each project builds a full export-document set. Documents are section-driven:
the sidebar (`DocumentSidebar.tsx`) lists them and `MainContent.tsx` renders a
form per section, keyed by section id in `formData`/`allForms`. Required-field
status lives in `docRequiredFields` (sidebar); the demo project
(`lib/demoProject.ts`) seeds a fully-worked, locked example of every one.

- **Documents:** Estimate / Quote, Purchase Order, Invoice
- **Shipment:** Shipment Details, Picking List, Delivery Note,
  **Certificate of Origin (CoO)**, **Bill of Lading (BoL)**
- **Payment:** Bank Details, Receipt, Credit Note, Letter of Credit
- **Product / customs:** Products, Country of Origin, Tariffs & Customs

The CoO and BoL forms follow the same locked-view + form + `renderSectionButtons`
pattern as the other sections and prefill from Your Details, the counterparty and
the Shipment section (ports, vessel, goods description, country of origin). This
brings the set in line with IncoDocs / Shipping Solutions.

## Suite context

This repo is one part of the **Universal Simulation suite** (the open-source
Universal Apps family). For cross-repo context — how the `@unisim/sdk`, edge
routing, and the suite changelog wire together — see the suite docs repo:
[`universal-simulation-ltd/docs`](https://github.com/universal-simulation-ltd/docs)
(private; checked out at the umbrella root as `Docs_UNI_SIM/` for suite
contributors). Start with `ARCHITECTURE.md` (the cross-repo map).
