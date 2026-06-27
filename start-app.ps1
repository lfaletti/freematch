# start-app.ps1 — bring up the full FreeMatch stack after a reboot.
#
# Docker (postgres + redis + backend) usually restarts on its own, but the
# Expo web frontend runs natively on your machine and does NOT. This script
# makes both reliable: it ensures the Docker stack is up, waits for the
# backend health check, then starts the Expo web dev server.
#
# Usage:  npm run start:app      (or)      powershell -File start-app.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "==> Starting Docker stack (postgres + redis + backend)..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" up -d

Write-Host "==> Waiting for backend health on http://localhost:3000/health ..." -ForegroundColor Cyan
$healthy = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 3
        if ($r.StatusCode -eq 200) { $healthy = $true; break }
    } catch { }
    Start-Sleep -Seconds 2
}
if ($healthy) {
    Write-Host "    Backend is healthy." -ForegroundColor Green
} else {
    Write-Host "    Backend did not become healthy in ~80s. Check: docker compose logs backend" -ForegroundColor Yellow
}

Write-Host "==> Starting Expo web frontend on http://localhost:8081 ..." -ForegroundColor Cyan
Write-Host "    Open http://localhost:8081/ then log in or create an account (Ctrl+C to stop)" -ForegroundColor Green
Set-Location "$root\frontend"
npx expo start --web --port 8081
