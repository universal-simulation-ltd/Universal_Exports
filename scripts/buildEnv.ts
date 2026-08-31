// The build-time configuration every shipped bundle MUST carry, and the check
// that refuses to build without it.
//
//   npm run test:build-env
//
// ⚠️ WHY THIS EXISTS. `src/main.tsx` hands `UniversalProvider` a Supabase URL
// and anon key read from `import.meta.env`. Vite INLINES those at build time:
// when the variables are absent it substitutes `undefined`, the build succeeds,
// and the bundle looks entirely normal — but the provider throws during init
// and every visitor gets a blank app.
//
// It is not hypothetical. Universal PDF shipped exactly this twice: once in CI
// before its release workflow passed the two secrets (PR #80), and once as a
// macOS DMG (0.6.15, 2026-08-31) packaged in a checkout that had no
// `.env.local` — the file is gitignored, so a fresh clone and every `git
// worktree` lack it. That build installed happily and died on launch.
//
// ⚠️ **Universal Exports and Universal PDF are the only two apps in the suite
// that can fail this way.** Every other app writes the pair as
// `import.meta.env.VITE_… || '<the public project URL and anon key>'`, so a
// build with no environment silently falls back to the real project instead.
// This app deliberately has no such fallback — no credential is duplicated in
// the source — which is precisely what makes the guard necessary here.
//
// ⚠️ Deliberately dependency-free. It is imported by `vite.config.ts` (which
// runs under esbuild) and by a test under Node's type-stripping, so it must not
// import `vite` or anything else — the caller does the `loadEnv` and passes the
// result in.

/** The variables `src/main.tsx` reads. Adding one here makes it mandatory. */
export const REQUIRED_BUILD_ENV = [
  "VITE_PLATFORM_SUPABASE_URL",
  "VITE_PLATFORM_SUPABASE_ANON_KEY",
] as const;

export interface BuildEnvProblem {
  key: string;
  /** 'missing' — absent or empty. 'malformed' — present but unusable. */
  reason: "missing" | "malformed";
  detail: string;
}

/**
 * What is wrong with this environment, if anything.
 *
 * ⚠️ An empty string counts as missing, and that is the case that actually
 * bites: GitHub Actions and Cloudflare Pages both pass an unset variable as an
 * EMPTY one rather than an absent one, so a `key in env` test would pass on
 * exactly the build that ships a dead app.
 */
export function checkBuildEnv(
  env: Record<string, string | undefined>,
): BuildEnvProblem[] {
  const problems: BuildEnvProblem[] = [];

  for (const key of REQUIRED_BUILD_ENV) {
    const value = (env[key] ?? "").trim();
    if (!value) {
      problems.push({ key, reason: "missing", detail: "not set (or set to an empty value)" });
      continue;
    }
    // A shape check, not a credential check — nothing here can tell a valid key
    // from a revoked one. It catches the mangled-secret cases that would
    // otherwise reach a visitor as the same blank page.
    if (key.endsWith("_URL") && !/^https:\/\/[^\s/]+/.test(value)) {
      problems.push({ key, reason: "malformed", detail: `not an https:// URL (got ${JSON.stringify(truncate(value))})` });
    }
    if (key.endsWith("_ANON_KEY") && value.split(".").length !== 3) {
      problems.push({ key, reason: "malformed", detail: "not a JWT (expected three dot-separated segments)" });
    }
  }

  return problems;
}

/** The message the build dies with. It has to be enough to act on alone. */
export function buildEnvError(problems: BuildEnvProblem[], mode: string): string {
  const lines = problems.map((p) => `  · ${p.key} — ${p.detail}`);
  return [
    `Universal Exports: build-time configuration is incomplete (vite mode "${mode}").`,
    "",
    ...lines,
    "",
    "Vite inlines these values, so building without them does NOT fail the build —",
    "it produces a bundle whose Supabase client cannot be constructed, and the app",
    "throws on load. Refusing here is the whole point; do not skip this by editing",
    "it out.",
    "",
    "Locally: this checkout needs .env.local. It is gitignored, so a fresh clone or",
    "a git worktree will NOT have it — copy it from a checkout that does.",
    "",
    "In CI / Cloudflare Pages: set both as build environment variables on the",
    "project (Settings → Environment variables), for Production AND Preview.",
  ].join("\n");
}

function truncate(value: string): string {
  return value.length > 40 ? `${value.slice(0, 40)}…` : value;
}
