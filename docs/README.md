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

## Hosted backups — and the `pending` path that broke every one of them

**Back up this agreement → "Hosted by UNI·SIM"** keeps the export-agreement PDF
in the private `hosted-uploads` bucket against the user's Universal ID for one
token, refunded on delete. `src/lib/hostedStore.ts` does the work;
`src/lib/hostedPaths.ts` owns the object names.

### ⚠️ `hosted_uploads` grants members SELECT and nothing else

Migration 0041 enables RLS on `public.hosted_uploads` and creates exactly two
policies: `hosted_uploads_member_read` (`for select`) and a platform-admin
`for all`. There is **no member UPDATE policy in 0041–0127**, on purpose — the
consume/refund RPCs are meant to be the only writers.

The store flow ignored that and was written in three steps:

1. `consumeHostedUpload({ storagePath: "pending" })` — reserve the token,
2. upload the bytes to `<org_id>/exports/<upload_id>-<slug>.pdf`,
3. `UPDATE hosted_uploads SET storage_path = <the real path>`.

**Step 3 matched zero rows on every account that isn't the platform admin**, and
PostgREST reports that as a perfectly ordinary success — no error, just `0`.
The call site never looked at the result. So the ledger kept saying `pending`
for every hosted agreement ever stored: the dialog listed the backup, and Open
asked storage for an object literally named `pending`, which does not exist and
never did — while the real file sat safely in the bucket the whole time.
`pending` also has no org-id first segment, so it fails the bucket's read policy
(`storage.foldername(name)[1]`) as well as being absent.

### What the fix does

* **Name the object before reserving the token.** `hostedExportPath(orgId,
  newObjectId(), fileName)` is computed first and passed to
  `consumeHostedUpload`, so the RPC's own insert records the truth and the
  update that RLS was blocking no longer exists.
* **Recover the rows already filed as `pending`.** The old path was fully
  determined by data still on the row — `<org_id>/exports/<id>-<safeName(file_name)>`
  — so `hostedExportPathCandidates()` rebuilds it and `openHostedExport` tries
  each candidate in turn. Existing broken backups open; nothing has to be
  migrated, re-uploaded or apologised for. ⚠️ **This is why `safeName` must
  never drift.** It is pinned by `npm run test:hosted-paths` (a standalone Node
  script — it needs no jsdom, so it stays out of the vitest suite).
* **Fail honestly when there really is nothing there.** Only then does
  `openHostedExport` throw `HostedObjectMissingError`, and `HostedStoreDialog`
  answers it against the row itself: which file, that the upload never finished,
  and one button to clear the entry and take the token back. A network or
  session failure is deliberately NOT reported that way.
* **Delete every candidate.** `deleteHostedExport` removes all of them, so
  refunding a legacy row cannot orphan its real object in the bucket.

The same landmine was fixed in Universal PDF (`ffae15b`), Images, QR and
Recorder — all five had copies of the identical three-step flow.

## Suite context

This repo is one part of the **Universal Simulation suite** (the open-source
Universal Apps family). For cross-repo context — how the `@unisim/sdk`, edge
routing, and the suite changelog wire together — see the suite docs repo:
[`universal-simulation-ltd/docs`](https://github.com/universal-simulation-ltd/docs)
(private; checked out at the umbrella root as `Docs_UNI_SIM/` for suite
contributors). Start with `ARCHITECTURE.md` (the cross-repo map).
