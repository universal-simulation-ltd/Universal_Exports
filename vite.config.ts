import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
export default defineConfig(({ mode }) => ({
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
}));
