#!/usr/bin/env bash
# Launch a local preview of Universal Exports (Vite + React 18 + React Query).
# Runs the dev server in the foreground — press Ctrl-C to stop.
#
# Usage:  ./scripts/preview.sh [port]      (default 8080, the configured port)
#
# First run installs npm deps if node_modules is missing.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PORT="${1:-8080}"

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies (first run)…"
  # This is a lovable/shadcn project pinning vite@^8 while
  # @vitejs/plugin-react-swc still declares a vite ^4–^7 peer range, so a
  # strict npm install hits ERESOLVE. --legacy-peer-deps is the suite's
  # documented fallback (docs/claude-handover.md §5). Don't commit the
  # lockfile it produces — CI's `npm ci` rejects it.
  npm install || {
    echo "Plain install hit a peer-dep conflict — retrying with --legacy-peer-deps…"
    npm install --legacy-peer-deps
  }
fi

if [[ ! -f .env.local && ! -f .env ]]; then
  echo "WARNING: no .env.local — Supabase env vars (VITE_SUPABASE_URL etc.) will"
  echo "         be undefined, so createClient() throws and the app renders BLANK."
  echo "         Copy .env.example to .env.local and fill in the project values."
fi

echo "Universal Exports → http://localhost:$PORT"
exec npm run dev -- --port "$PORT"
