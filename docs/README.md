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

## Language — the SDK's, since 2026-09-29

There is one language setting, and it is the suite's: **Tune this app**
(App preferences) and, once they appear, **Global preferences** in the profile
menu. `src/lib/i18n/index.tsx` reads `useLanguage()` from `@unisim/sdk`, so the
navbar, the SDK dialogs, the knowledge base and Exports' own strings always show
the same language, and a change re-renders all of them. With no choice made it
follows the browser, and English of any region is **English (GB)**.

* **Dictionaries:** `src/lib/i18n/<code>.ts` — `en` (the shape; British
  spelling, read by both English (GB) and English (US)), `fr`, `de`, `es`, `it`,
  `pt-BR`, `pt-PT`, `tr`. Each is typed `Messages`, so `tsc` fails on a missing
  or misspelt key, and `t()` only takes real keys. Lookups walk the SDK's
  `languageFallbacks` chain, ending in English. `pt-BR`, `pt-PT` and `tr` (and
  the five Certificate of Origin / Bill of Lading / Download PDF keys in the
  older four) were machine-translated — worth a native speaker's pass.
* **The drafter screens** (2026-10-04) — the landing page, sign-in, the whole
  editor (`MainContent.tsx`, products, the tariff lookup, the back-up dialog,
  the AI import panel) — keep their strings in `src/lib/i18n/drafter/<code>.ts`,
  spread into each main dictionary with one line, so `MessageKey` still covers
  every key. `useDrafterI18n()` (same folder) adds `tf` (fill `{slots}`), `tp`
  (`.one` / `.other` plural pairs via `Intl.PluralRules`), and on-screen
  amounts and dates in the app's language via `Intl`.
* **Deliberately English:** the generated PDFs (agreement, documents, QR
  sheet), so the labels handed to them stay English — `LockedSectionView`
  takes message keys and prints `translate("en", key)` into the PDF while the
  screen shows `t(key)`. Also left as they come: the default Certificate of
  Origin declaration (it is the document's own text), stored values such as
  "Freight Prepaid" (only the dropdown label is translated), names of official
  bodies and services (HMRC, UK Export Finance, Customs Declaration Service,
  UK Trade Tariff), and data from outside — the UK Trade Tariff's commodity and
  measure descriptions, Companies House statuses, Supabase/server error text.
* **What went:** the Language rows Exports put in the profile pill
  (`FileMenu.tsx`, deleted — they were the only `actions` left) and
  `showLanguageSelector={false}`, which had hidden Language from the SDK's
  dialogs because the SDK's value did not translate this app.

### ⚠️ The old `eboxy-lang` key, and Dutch

Before this, Exports kept its own language in localStorage `eboxy-lang`, written
only when somebody picked one. `src/lib/i18n/migrate.ts` runs once from
`main.tsx`, before the provider mounts:

* `en` → `en-gb`; `fr`/`de`/`es`/`it` → the same — written as **this app's
  override** (`universal:language:exports`), never the global
  `universal:language`. The old choice only ever applied to Exports, and every
  Universal App on `opensource.unisim.co.uk` shares that origin's localStorage,
  so writing the global value would re-language the neighbours too.
* **`nl` → no override.** The SDK has no Dutch, so neither dialog could show it.
  Those users follow the suite language — a global choice if one exists, else
  the browser, which for a Dutch browser means English (GB). The Dutch
  dictionary is in git history (`src/lib/i18n.tsx` before this change) for the
  day the SDK adds `nl`.
* An existing override wins; the legacy key is removed either way.

People who never picked (no `eboxy-lang`) used to get English whatever their
browser said; they now get their browser's language, or the global choice made
in another Universal App on the same origin — the suite behaviour.

## Counter-signing: audit trail and verify page

The other party signs at `/sign/<token>` (the token is the credential). Since
2026-10-04 every signing link keeps an audit trail (platform migration 0244):

- **What is recorded:** when the link was made and sent (emailed, copied or a
  mail draft opened), which stored PDF the other party opened and its SHA-256,
  when they opened and signed it, and the IP address, browser and country at
  those two moments only. Signing is refused if the sender generated a newer
  copy after the signer opened theirs: you sign what you were shown.
- **Why IP/browser, and who sees them:** they are the evidence an electronic
  signature's weight rests on (legitimate interests of both parties, UK GDPR
  Art 6(1)(f)). The sign page says so above the Submit button. They appear only
  to the two parties (the drafter's panel and the audit page of the signed copy)
  and never on the public verify page; they go when the project or account is
  deleted.
- **The signed copy:** the `exports-sign` Edge Function (universal-platform)
  builds it with pdf-lib: the original pages, the signature stamped into the
  other party's signing block (the agreement stores where that block is, as
  `counterpartyBox` in the view snapshot), and an appended audit page with a QR
  to `/verify/<audit id>`. The database computes and keeps its SHA-256. Both
  parties can download it.
- **Verify:** `/verify` and `/verify/<audit id>` are public. A dropped PDF is
  hashed in the browser (it is never uploaded) and matched against the signed
  copy, the agreement as signed, or any copy the sender generated.

## Sign together, live

In the They Sign panel, **Start a live session** puts the drafter and the other
party on one Supabase Realtime channel (`src/lib/together.ts`; broadcast and
presence only, nothing is stored). The drafter sees the same document, which
part of the page the other party is on, their name as they type it and their
signature stroke by stroke, and can point them at the document, their name or
their signature; the other party sees the sender's signature arrive and the
part they are pointed at. The other party is told the sender can see what they
type while the sender is present, and can stop sharing. The channel name is a
SHA-256 of the signing token, and everything received is validated before it is
shown. The submitted signature, with its audit trail, is still the only record.

## The agreement side by side, in the other party's language

The sign page shows the agreement's text (overview fields, product and document
names) beside a translation, with the agreement's own language labelled as the
binding one and the translation as for reference only. Two free sources, and
neither sends the agreement anywhere (`src/lib/translation.ts`):

- **The sender's translation.** In the They Sign panel the drafter attaches one
  translation to the link (platform migration 0245), typed by hand or
  pre-filled by their own browser's on-device translator and then checked.
- **The signer's device.** Where the browser has an on-device translator
  (Chrome's built-in Translator API), the signer can translate it there.
  Labelled as a machine translation.

Universal AI's in-browser models were considered and not used: a translation
model is a 100 MB+ download per language pair before the first word, too much
for someone opening a signing link on a phone, and a machine translation of a
contract still cannot be the binding text.

## Suite context

This repo is one part of the **Universal Simulation suite** (the open-source
Universal Apps family). For cross-repo context — how the `@unisim/sdk`, edge
routing, and the suite changelog wire together — see the suite docs repo:
[`universal-simulation-ltd/docs`](https://github.com/universal-simulation-ltd/docs)
(private; checked out at the umbrella root as `Docs_UNI_SIM/` for suite
contributors). Start with `ARCHITECTURE.md` (the cross-repo map).
