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
  route so the signature is drawn on a phone.

Free and open source; the app is usable without an account (sign-in gates only
the save-to-cloud features).

## Suite context

This repo is one part of the **Universal Simulation suite** (the open-source
Universal Apps family). For cross-repo context — how the `@unisim/sdk`, edge
routing, and the suite changelog wire together — see the suite docs repo:
[`universal-simulation-ltd/docs`](https://github.com/universal-simulation-ltd/docs)
(private; checked out at the umbrella root as `Docs_UNI_SIM/` for suite
contributors). Start with `ARCHITECTURE.md` (the cross-repo map).
