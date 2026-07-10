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

# Step 1: Start only infrastructure (postgres, redis, minio) — NOT the backend yet.
# This ensures Docker DNS entries are registered before the backend tries to resolve them.
Write-Host "==> Starting infrastructure (postgres + redis + minio)..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" up -d postgres redis minio minio-init

# Step 2: Wait for all infrastructure services to be healthy before starting backend.
Write-Host "==> Waiting for infrastructure to be healthy..." -ForegroundColor Cyan
$infraHealthy = $false
for ($i = 0; $i -lt 30; $i++) {
    $allHealthy = $true
    foreach ($svc in @("freematch-db", "freematch-redis", "freematch-minio")) {
        try {
            $health = docker inspect --format='{{.State.Health.Status}}' $svc 2>$null
            if ($health -ne "healthy") {
                $allHealthy = $false
                break
            }
        } catch {
            $allHealthy = $false
            break
        }
    }
    if ($allHealthy) { $infraHealthy = $true; break }
    Start-Sleep -Seconds 2
}
if ($infraHealthy) {
    Write-Host "    All infrastructure is healthy." -ForegroundColor Green
} else {
    Write-Host "    Infrastructure did not become healthy in ~60s. Check: docker compose logs" -ForegroundColor Red
    exit 1
}

# Step 3: Now start the backend — DNS for postgres/redis/minio is guaranteed to be registered.
Write-Host "==> Starting backend..." -ForegroundColor Cyan
docker compose -f "$root\docker-compose.yml" up -d backend

Write-Host "==> Waiting for backend health on http://127.0.0.1:3000/health ..." -ForegroundColor Cyan
$healthy = $false
for ($i = 0; $i -lt 40; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3000/health" -UseBasicParsing -TimeoutSec 3
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
