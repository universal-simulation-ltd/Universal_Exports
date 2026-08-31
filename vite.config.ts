import { execSync } from "node:child_process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { checkBuildEnv, buildEnvError } from "./scripts/buildEnv.ts";

// Build-version marker: prefer the Cloudflare Pages commit SHA baked in at build
// time, fall back to the local git short SHA, then 'dev'. Surfaced as a
// <meta name="build-sha"> tag and a startup console.log so the live build is
// identifiable in-browser without wrangler.
function resolveBuildSha(): string {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}
const BUILD_SHA = resolveBuildSha();

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // ⚠️ Refuse to BUILD without the Supabase pair `src/main.tsx` inlines. Vite
  // substitutes `undefined` for a missing variable and reports success, so the
  // artefact is dead on arrival and nothing says so until someone opens it.
  // Universal PDF shipped that twice — see `scripts/buildEnv.ts`. This app and
  // that one are the only two with no hardcoded fallback to the public project.
  //
  // Build only, never `vite dev`. `loadEnv` reads the `.env*` files AND
  // `process.env`, so one check covers both the local path (`.env.local`) and
  // Cloudflare Pages, where the pair arrives as build environment variables.
  if (command === "build") {
    const problems = checkBuildEnv(loadEnv(mode, process.cwd(), "VITE_"));
    if (problems.length) throw new Error(buildEnvError(problems, mode));
  }

  return {
    // Production asset URLs are emitted under /exports/ (the app is served at
    // opensource.unisim.co.uk/exports); public/_redirects rewrites them so the
    // same build also works at the root of universalexports.app. Runtime paths
    // (router basename, share links) use src/lib/basePath.ts instead of this.
    // Local dev stays "/".
    base: mode === "production" ? "/exports/" : "/",
    define: {
      "import.meta.env.VITE_BUILD_SHA": JSON.stringify(BUILD_SHA),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      watch: {
        usePolling: true,
      },
    },
    plugins: [
      {
        name: "build-sha-meta",
        transformIndexHtml() {
          return [
            { tag: "meta", attrs: { name: "build-sha", content: BUILD_SHA }, injectTo: "head" as const },
          ];
        },
      },
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
