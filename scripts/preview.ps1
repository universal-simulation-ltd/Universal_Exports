# Launch a local preview of Universal Exports.
# Runs the dev server in the foreground — press Ctrl-C to stop.
# Windows equivalent of preview.sh.
#
#   Usage:  .\scripts\preview.ps1 [port]     (default 8080)
#
# 8080 is this app's port in the registry (Docs_UNI_SIM/dev-preview.md).
# --strictPort means a port clash fails loudly instead of silently serving
# this app on another app's port.
#
# Vite is pinned to 8080 for this project, not the 51xx range.
# First run installs deps if node_modules is missing.

$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
    $port = if ($args.Count -ge 1) { $args[0] } else { '8080' }

    if (-not (Test-Path 'node_modules')) {
        Write-Host "Installing dependencies (first run)..." -ForegroundColor Cyan
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }

    if (-not (Test-Path '.env.local') -and -not (Test-Path '.env')) {
        Write-Warning "no .env.local - VITE_PLATFORM_SUPABASE_* will be undefined, so the Supabase-backed features won't work. Copy .env.example to .env.local."
    }

    Write-Host "Universal Exports -> http://localhost:$port" -ForegroundColor Green
    npm run dev -- --port $port --strictPort
} finally {
    Pop-Location
}
