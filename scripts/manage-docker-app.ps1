# OpenBar - Docker Compose & Load Testing Management Script (PowerShell)
param (
    [string]$Action = "",
    [string]$Scenario = "smoke",
    [string]$Url = "http://localhost:8080"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

# Default environment variables for Docker Compose
if (-not $env:POSTGRES_PASSWORD) {
    $env:POSTGRES_PASSWORD = "openbar_local_secure_password"
}
if (-not $env:JWT_SECRET) {
    $env:JWT_SECRET = "openbar_local_jwt_secret_key_minimum_32_characters_long_12345"
}

function Show-Header {
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host " OpenBar - Local Docker Manager & Load Benchmark Suite (k6)" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Wait-ForHealth {
    param ([string]$TargetUrl = "http://localhost:8080/actuator/health", [int]$TimeoutSec = 90)
    Write-Host "`nWaiting for backend availability ($TargetUrl)..." -ForegroundColor Yellow
    $start = Get-Date
    while ((Get-Date) - $start -lt (New-TimeSpan -Seconds $TimeoutSec)) {
        try {
            $res = Invoke-RestMethod -Uri $TargetUrl -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($res.status -eq "UP") {
                Write-Host "`n[OK] Backend OpenBar is UP and healthy!" -ForegroundColor Green
                return $true
            }
        } catch {
            # Still booting
        }
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    Write-Host "`n[WARN] Timeout reached ($TimeoutSec s)." -ForegroundColor Yellow
    return $false
}

function Start-ProdApp {
    Show-Header
    Write-Host "Starting complete production stack (docker-compose.prod.yml)..." -ForegroundColor Cyan
    docker compose -f docker-compose.prod.yml up -d --build
    Wait-ForHealth "http://localhost:8080/actuator/health" 90
    Write-Host "`nAccess endpoints:" -ForegroundColor Cyan
    Write-Host "  - Frontend Web PWA : http://localhost" -ForegroundColor White
    Write-Host "  - Backend REST API : http://localhost:8080" -ForegroundColor White
    Write-Host "  - Healthcheck      : http://localhost:8080/actuator/health" -ForegroundColor White
    Write-Host "  - Swagger UI       : http://localhost:8080/swagger-ui.html" -ForegroundColor White
}

function Start-Rpi5Sim {
    Show-Header
    Write-Host "Starting Raspberry Pi 5 simulation (4 vCPUs, 2GB RAM, G1GC)..." -ForegroundColor Cyan
    docker compose -f docker/docker-compose.rpi5-sim.yml up -d --build
    Wait-ForHealth "http://localhost:8080/actuator/health" 90
    Write-Host "`nAccess endpoints:" -ForegroundColor Cyan
    Write-Host "  - Simulated Backend: http://localhost:8080" -ForegroundColor White
    Write-Host "  - Healthcheck      : http://localhost:8080/actuator/health" -ForegroundColor White
}

function Stop-App {
    Show-Header
    Write-Host "Stopping all OpenBar containers..." -ForegroundColor Yellow
    docker compose -f docker-compose.prod.yml down -v 2>$null
    docker compose -f docker/docker-compose.rpi5-sim.yml down -v 2>$null
    Write-Host "[OK] All containers stopped successfully." -ForegroundColor Green
}

function Invoke-LoadTest {
    param ([string]$Scen = "smoke", [string]$TargetUrl = "http://localhost:8080")
    Show-Header
    Write-Host "Executing load test scenario [$Scen] against $TargetUrl..." -ForegroundColor Cyan
    node tests/load/run-load-tests.js "--scenario=$Scen" "--url=$TargetUrl"
}

function Invoke-HardwareProfile {
    param ([int]$Duration = 60)
    Show-Header
    Write-Host "Starting live hardware profiling (CPU, RAM, GC pauses) for $Duration s..." -ForegroundColor Cyan
    node scripts/benchmark-profile.js "--duration=$Duration" "--output=profile-report.json"
}

function Show-ContainerLogs {
    Write-Host "Displaying container logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    docker compose -f docker-compose.prod.yml logs -f --tail=100
}

# CLI Argument routing
switch ($Action.ToLower()) {
    "start"      { Start-ProdApp; exit 0 }
    "up"         { Start-ProdApp; exit 0 }
    "start-rpi5" { Start-Rpi5Sim; exit 0 }
    "rpi5"       { Start-Rpi5Sim; exit 0 }
    "stop"       { Stop-App; exit 0 }
    "down"       { Stop-App; exit 0 }
    "logs"       { Show-ContainerLogs; exit 0 }
    "test"       { Invoke-LoadTest $Scenario $Url; exit 0 }
    "profile"    { Invoke-HardwareProfile 60; exit 0 }
}

# Interactive CLI menu when launched without arguments
do {
    Clear-Host
    Show-Header
    Write-Host "1. Start complete app (Postgres + Backend + Frontend Nginx)" -ForegroundColor White
    Write-Host "2. Start Raspberry Pi 5 simulator (4 cores / 2GB RAM / G1GC)" -ForegroundColor White
    Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "3. Run Smoke Test (Fast 15s sanity check)" -ForegroundColor Green
    Write-Host "4. Run Rush Hour peak benchmark (40+ tables, 10 waitstaff, 4 bartenders)" -ForegroundColor Green
    Write-Host "5. Run WebSocket STOMP benchmark (Real-time broadcast latency)" -ForegroundColor Green
    Write-Host "6. Run Collaborative Patron Cart benchmark (Public QR guest orders)" -ForegroundColor Green
    Write-Host "7. Run Billing settlement & Thermal printing stress benchmark" -ForegroundColor Green
    Write-Host "8. Run entire load testing suite (all scenarios)" -ForegroundColor Green
    Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "9. Run live Hardware Profiling (CPU / RAM / GC pauses telemetry - 60s)" -ForegroundColor Yellow
    Write-Host "10. View container logs" -ForegroundColor Cyan
    Write-Host "11. Stop all Docker containers" -ForegroundColor Magenta
    Write-Host "0. Exit" -ForegroundColor Gray
    Write-Host "======================================================================" -ForegroundColor Cyan
    $choice = Read-Host "Select an option [0-11]"

    switch ($choice) {
        "1" { Start-ProdApp; Read-Host "`nPress Enter to continue..." }
        "2" { Start-Rpi5Sim; Read-Host "`nPress Enter to continue..." }
        "3" { Invoke-LoadTest "smoke" $Url; Read-Host "`nPress Enter to continue..." }
        "4" { Invoke-LoadTest "rush-hour" $Url; Read-Host "`nPress Enter to continue..." }
        "5" { Invoke-LoadTest "websocket" $Url; Read-Host "`nPress Enter to continue..." }
        "6" { Invoke-LoadTest "patron-cart" $Url; Read-Host "`nPress Enter to continue..." }
        "7" { Invoke-LoadTest "billing" $Url; Read-Host "`nPress Enter to continue..." }
        "8" { Invoke-LoadTest "all" $Url; Read-Host "`nPress Enter to continue..." }
        "9" { Invoke-HardwareProfile 60; Read-Host "`nPress Enter to continue..." }
        "10" { Show-ContainerLogs; Read-Host "`nPress Enter to continue..." }
        "11" { Stop-App; Read-Host "`nPress Enter to continue..." }
        "0" { Write-Host "Goodbye!" -ForegroundColor Cyan; break }
        default { Write-Host "Invalid option." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")
