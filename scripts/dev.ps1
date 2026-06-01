#!/usr/bin/env pwsh
Set-Location -Path (Split-Path $PSScriptRoot -Parent)
npm run dev -- --port 8080
