# OpenBar - Docker Application Launcher (PowerShell)
param (
    [string]$Action = "",
    [ValidateSet("prod", "test", "both")]
    [string]$Mode = "prod",
    [string]$Service = "",
    [int]$ProdBackendPort = 8080,
    [int]$ProdHttpPort = 80,
    [int]$ProdHttpsPort = 443,
    [int]$ProdDbPort = 5432,
    [int]$TestBackendPort = 8082,
    [int]$TestHttpPort = 8088,
    [int]$TestHttpsPort = 8443,
    [int]$TestDbPort = 5434,
    [switch]$Reset
)

$ErrorActionPreference = "Continue"
if (Test-Path variable:global:PSNativeCommandUseErrorActionPreference) {
    $global:PSNativeCommandUseErrorActionPreference = $false
}
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

# Load local environment variables from .env if present
if (Test-Path "$RootDir\.env") {
    Get-Content "$RootDir\.env" | ForEach-Object {
        $envLine = $_.Trim()
        if ($envLine -and -not $envLine.StartsWith("#") -and $envLine.Contains("=")) {
            $envParts = $envLine.Split("=", 2)
            $envName = $envParts[0].Trim()
            $envVal = $envParts[1].Trim()
            if (-not [System.Environment]::GetEnvironmentVariable($envName)) {
                [System.Environment]::SetEnvironmentVariable($envName, $envVal)
            }
        }
    }
}

# Default credentials for local Docker stacks
if (-not $env:POSTGRES_PASSWORD) {
    $env:POSTGRES_PASSWORD = "openbar_local_secure_password"
}
if (-not $env:JWT_SECRET) {
    $env:JWT_SECRET = "openbar_local_jwt_secret_key_minimum_32_characters_long_12345"
}

function Show-Header {
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host " OpenBar - Docker Application Launcher" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan
}

function Test-PortStatus {
    param ([int]$Port)
    try {
        $tcpConn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($tcpConn) {
            return $true
        }
    }
    catch {
        # NetTCPConnection not available or permission denied
    }
    return $false
}

function Show-EnvironmentSummary {
    $ideFrontActive = Test-PortStatus 4201
    $ideBackActive = Test-PortStatus 8081
    $ideDbActive = Test-PortStatus 5433

    $prodFrontActive = Test-PortStatus $ProdHttpsPort
    $prodBackActive = Test-PortStatus $ProdBackendPort
    $prodDbActive = Test-PortStatus $ProdDbPort

    $testFrontActive = Test-PortStatus $TestHttpsPort
    $testBackActive = Test-PortStatus $TestBackendPort
    $testDbActive = Test-PortStatus $TestDbPort

    Write-Host "`nActive Multi-Stack Port Overview:" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host " [1] IDE / Local Stack:" -ForegroundColor Yellow
    Write-Host "     • Frontend  : https://localhost:4201 " -NoNewline; if ($ideFrontActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "     • Backend   : http://localhost:8081  " -NoNewline; if ($ideBackActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "     • Database  : localhost:5433         " -NoNewline; if ($ideDbActive) { Write-Host "[ACTIVE (gestion_cocktail_db)]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }

    Write-Host " [2] Docker Production Stack (openbar-prod):" -ForegroundColor Yellow
    Write-Host "     • Frontend  : https://localhost ($ProdHttpsPort), http://localhost ($ProdHttpPort) " -NoNewline; if ($prodFrontActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "     • Backend   : http://localhost:$ProdBackendPort                                    " -NoNewline; if ($prodBackActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "     • Database  : localhost:$ProdDbPort (openbar-prod-postgres)                      " -NoNewline; if ($prodDbActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }

    Write-Host " [3] Docker Test / Demo Stack (openbar-test):" -ForegroundColor Yellow
    Write-Host "     • Frontend  : https://localhost:$TestHttpsPort (HTTP: $TestHttpPort) " -NoNewline; if ($testFrontActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "     • Backend   : http://localhost:$TestBackendPort                    " -NoNewline; if ($testBackActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "     • Database  : localhost:$TestDbPort (openbar-test-postgres)      " -NoNewline; if ($testDbActive) { Write-Host "[ACTIVE]" -ForegroundColor Green } else { Write-Host "[INACTIVE]" -ForegroundColor DarkGray }
    Write-Host "----------------------------------------------------------------------`n" -ForegroundColor DarkGray
}

function Wait-ForHealth {
    param ([string]$TargetUrl = "http://localhost:8080/api/cocktails", [int]$TimeoutSec = 90)
    Write-Host "`nWaiting for backend availability ($TargetUrl)..." -ForegroundColor Yellow
    $start = Get-Date
    while ((Get-Date) - $start -lt (New-TimeSpan -Seconds $TimeoutSec)) {
        try {
            $res = Invoke-WebRequest -Uri $TargetUrl -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
            if ($res.StatusCode -eq 200) {
                Write-Host "`n[OK] Backend OpenBar is UP and healthy!" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # Still booting
        }
        Start-Sleep -Seconds 2
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    Write-Host "`n[WARN] Timeout reached ($TimeoutSec s)." -ForegroundColor Yellow
    return $false
}

function Initialize-Certificates {
    if (-not (Test-Path "$RootDir\certs\openbar.crt") -or -not (Test-Path "$RootDir\certs\openbar.key")) {
        Write-Host "Local TLS certificates missing. Generating local certificates..." -ForegroundColor Yellow
        & "$ScriptDir\generate-local-certs.ps1"
    }
}

function Start-DevDb {
    Show-Header
    Write-Host "Starting IDE Development Database (openbar-db / gestion_cocktail_db on port 5433)..." -ForegroundColor Cyan
    docker compose -f backend/src/main/resources/docker-compose.yml up -d
    Write-Host "[OK] IDE database is running on localhost:5433 (Databases: gestion_cocktail_dev, gestion_cocktail_test)." -ForegroundColor Green
}

function Start-ProdApp {
    param ([switch]$ResetDatabase = $false)
    Show-Header
    Initialize-Certificates

    if ($ResetDatabase) {
        Write-Host "Resetting Production Docker volumes before startup..." -ForegroundColor Yellow
        docker compose -f docker-compose.prod.yml down -v --remove-orphans
    }

    $env:PROD_BACKEND_PORT = "$ProdBackendPort"
    $env:PROD_HTTP_PORT = "$ProdHttpPort"
    $env:PROD_HTTPS_PORT = "$ProdHttpsPort"
    $env:PROD_DB_PORT = "$ProdDbPort"

    Write-Host "Starting Docker PRODUCTION Stack (Clean Database, Virgin Setup)..." -ForegroundColor Cyan
    Write-Host "  • Frontend HTTPS : https://localhost (or https://openbar.lan)" -ForegroundColor White
    Write-Host "  • Frontend HTTP  : http://localhost (redirects to HTTPS)" -ForegroundColor White
    Write-Host "  • Backend API    : http://localhost:$ProdBackendPort" -ForegroundColor White
    Write-Host "  • Database       : localhost:$ProdDbPort" -ForegroundColor White

    docker compose -f docker-compose.prod.yml up -d --build
    $isHealthy = Wait-ForHealth "http://localhost:${ProdBackendPort}/api/cocktails" 90
    if (-not $isHealthy) {
        Write-Host "`n[WARN] Production backend did not respond within timeout." -ForegroundColor Yellow
    }

    Write-Host "`n[SUCCESS] Production Stack is READY at https://localhost" -ForegroundColor Green
    Write-Host "Database is virgin. Complete establishment onboarding at /setup." -ForegroundColor DarkGray
}

function Start-TestApp {
    param ([switch]$ResetDatabase = $false)
    Show-Header
    Initialize-Certificates

    if ($ResetDatabase) {
        Write-Host "Resetting Test Docker volumes before startup..." -ForegroundColor Yellow
        docker compose -f docker-compose.test.yml down -v --remove-orphans
    }

    $env:TEST_BACKEND_PORT = "$TestBackendPort"
    $env:TEST_HTTP_PORT = "$TestHttpPort"
    $env:TEST_HTTPS_PORT = "$TestHttpsPort"
    $env:TEST_DB_PORT = "$TestDbPort"

    Write-Host "Starting Docker TEST / DEMO Stack (Auto-Seeded: 99 Cocktails, Staff, Tables)..." -ForegroundColor Cyan
    Write-Host "  • Frontend HTTPS : https://localhost:$TestHttpsPort (Special HTTPS Port)" -ForegroundColor White
    Write-Host "  • Frontend HTTP  : http://localhost:$TestHttpPort (Special HTTP Port)" -ForegroundColor White
    Write-Host "  • Backend API    : http://localhost:$TestBackendPort" -ForegroundColor White
    Write-Host "  • Database       : localhost:$TestDbPort" -ForegroundColor White

    docker compose -f docker-compose.test.yml up -d --build
    $isHealthy = Wait-ForHealth "http://localhost:${TestBackendPort}/api/cocktails" 90
    if (-not $isHealthy) {
        Write-Host "`n[WARN] Test backend did not respond within timeout." -ForegroundColor Yellow
    }

    Write-Host "`n[SUCCESS] Test / Demo Stack is READY at https://localhost:$TestHttpsPort" -ForegroundColor Green
    Write-Host "`nDemo Accounts (Test Mode):" -ForegroundColor Yellow
    Write-Host "  - Admin     : admin / admin123" -ForegroundColor White
    Write-Host "  - Manager   : manager1 / manager123" -ForegroundColor White
    Write-Host "  - Bartender : barman1 / barman123" -ForegroundColor White
    Write-Host "  - Waiter    : serveur1 / serveur123" -ForegroundColor White
}

function Start-BothApps {
    param ([switch]$ResetDatabase = $false)
    Show-Header
    Write-Host "Starting BOTH Production AND Test / Demo Stacks simultaneously..." -ForegroundColor Cyan
    Start-ProdApp -ResetDatabase:$ResetDatabase
    Start-TestApp -ResetDatabase:$ResetDatabase

    Show-Header
    Write-Host "[SUCCESS] BOTH Stacks are running concurrently without port conflicts!" -ForegroundColor Green
    Write-Host "  - Production App : https://localhost           (Backend: :$ProdBackendPort, DB: :$ProdDbPort)" -ForegroundColor White
    Write-Host "  - Test / Demo App: https://localhost:$TestHttpsPort      (Backend: :$TestBackendPort, DB: :$TestDbPort)" -ForegroundColor White
}

function Start-Rpi5Sim {
    param (
        [ValidateSet("prod", "test")]
        [string]$TargetMode = "prod",
        [switch]$ResetDatabase = $false
    )
    Show-Header
    Initialize-Certificates

    if ($ResetDatabase) {
        Write-Host "Resetting RPi5 simulator volumes before startup..." -ForegroundColor Yellow
        docker compose -f docker/docker-compose.rpi5-sim.yml down -v --remove-orphans
    }

    $activeProfile = if ($TargetMode -eq "test") { "prod,test,staging" } else { "prod" }
    $env:SPRING_PROFILES_ACTIVE = $activeProfile

    $modeTitle = if ($TargetMode -eq "test") { "TEST / DEMO MODE" } else { "PRODUCTION MODE" }
    Write-Host "Starting Raspberry Pi 5 simulator in $modeTitle (4 cores, 4GB RAM, TLS/HTTPS)..." -ForegroundColor Cyan
    docker compose -f docker/docker-compose.rpi5-sim.yml up -d --build
    $isHealthy = Wait-ForHealth "http://localhost:8080/api/cocktails" 90
    if (-not $isHealthy) {
        Write-Host "`n[WARN] RPi5 backend health check did not return HTTP 200 within timeout." -ForegroundColor Yellow
    }

    Write-Host "`nAccess endpoints (Raspberry Pi 5 Simulation - $TargetMode):" -ForegroundColor Cyan
    Write-Host "  - Frontend Web PWA (HTTPS) : https://localhost (or https://openbar.lan)" -ForegroundColor Green
    Write-Host "  - Frontend Web PWA (HTTP)  : http://localhost (redirects to HTTPS)" -ForegroundColor White
    Write-Host "  - Backend API              : http://localhost:8080" -ForegroundColor White
    Write-Host "  - WebSocket STOMP          : ws://localhost:8080/ws" -ForegroundColor White
    Write-Host "  - Healthcheck              : http://localhost:8080/api/cocktails" -ForegroundColor White

    if ($TargetMode -eq "test") {
        Write-Host "`nDemo Accounts (Test Mode):" -ForegroundColor Yellow
        Write-Host "  - Admin     : admin / admin123" -ForegroundColor White
        Write-Host "  - Manager   : manager1 / manager123" -ForegroundColor White
        Write-Host "  - Bartender : barman1 / barman123" -ForegroundColor White
        Write-Host "  - Waiter    : serveur1 / serveur123" -ForegroundColor White
    }
}

function Stop-ProdApp {
    Show-Header
    Write-Host "Stopping Docker Production Stack (openbar-prod)..." -ForegroundColor Yellow
    docker compose -f docker-compose.prod.yml down --remove-orphans
    Write-Host "[OK] Production stack stopped." -ForegroundColor Green
}

function Stop-TestApp {
    Show-Header
    Write-Host "Stopping Docker Test Stack (openbar-test)..." -ForegroundColor Yellow
    docker compose -f docker-compose.test.yml down --remove-orphans
    Write-Host "[OK] Test stack stopped." -ForegroundColor Green
}

function Stop-AllApps {
    param ([bool]$WithVolumes = $false)
    Show-Header
    Write-Host "Stopping all OpenBar Docker stacks (Prod, Test, RPi5, Dev DB)..." -ForegroundColor Yellow
    if ($WithVolumes) {
        docker compose -f docker-compose.prod.yml down -v --remove-orphans
        docker compose -f docker-compose.test.yml down -v --remove-orphans
        docker compose -f docker/docker-compose.rpi5-sim.yml down -v --remove-orphans
        docker compose -f backend/src/main/resources/docker-compose.yml down -v --remove-orphans
    }
    else {
        docker compose -f docker-compose.prod.yml down --remove-orphans
        docker compose -f docker-compose.test.yml down --remove-orphans
        docker compose -f docker/docker-compose.rpi5-sim.yml down --remove-orphans
        docker compose -f backend/src/main/resources/docker-compose.yml down --remove-orphans
    }
    Write-Host "[OK] All containers stopped successfully." -ForegroundColor Green
}

function Show-ContainerLogs {
    param (
        [string]$ComposeFile = "docker-compose.prod.yml",
        [string]$ServiceName = "",
        [int]$Tail = 100
    )
    Write-Host "Displaying container logs from $ComposeFile (Ctrl+C to exit)...`n" -ForegroundColor Cyan
    if ($ServiceName) {
        docker compose -f $ComposeFile logs -f --tail=$Tail $ServiceName
    }
    else {
        docker compose -f $ComposeFile logs -f --tail=$Tail
    }
}

function Show-ContainerLogsInteractive {
    Write-Host "`n--- Container Logs Selection ---" -ForegroundColor Cyan
    Write-Host "1. Production Stack (all containers)" -ForegroundColor White
    Write-Host "2. Production Backend only" -ForegroundColor White
    Write-Host "3. Production Frontend only" -ForegroundColor White
    Write-Host "4. Test Stack (all containers)" -ForegroundColor White
    Write-Host "5. Test Backend only" -ForegroundColor White
    Write-Host "6. Test Frontend only" -ForegroundColor White
    Write-Host "7. IDE Database container" -ForegroundColor White
    Write-Host "0. Back to main menu" -ForegroundColor Gray
    $logChoice = Read-Host "Select log view [0-7] (Default: 1)"

    switch ($logChoice) {
        "1" { Show-ContainerLogs "docker-compose.prod.yml" }
        "2" { Show-ContainerLogs "docker-compose.prod.yml" "backend" }
        "3" { Show-ContainerLogs "docker-compose.prod.yml" "frontend" }
        "4" { Show-ContainerLogs "docker-compose.test.yml" }
        "5" { Show-ContainerLogs "docker-compose.test.yml" "backend" }
        "6" { Show-ContainerLogs "docker-compose.test.yml" "frontend" }
        "7" { Show-ContainerLogs "backend/src/main/resources/docker-compose.yml" "postgres" }
        "0" { return }
        default { Show-ContainerLogs "docker-compose.prod.yml" }
    }
}

function Confirm-DatabaseReset {
    $answer = Read-Host "Reset database volume for a fresh clean state? [y/N] (Default: N)"
    return ($answer.Trim().ToLower() -eq "y")
}

# CLI Argument routing
if ($Action) {
    switch ($Action.ToLower()) {
        "start-prod" { Start-ProdApp -ResetDatabase:$Reset; exit 0 }
        "start-test" { Start-TestApp -ResetDatabase:$Reset; exit 0 }
        "start-both" { Start-BothApps -ResetDatabase:$Reset; exit 0 }
        "start-db" { Start-DevDb; exit 0 }
        "start" {
            if ($Mode -eq "test") { Start-TestApp -ResetDatabase:$Reset }
            elseif ($Mode -eq "both") { Start-BothApps -ResetDatabase:$Reset }
            else { Start-ProdApp -ResetDatabase:$Reset }
            exit 0
        }
        "up" { Start-ProdApp -ResetDatabase:$Reset; exit 0 }
        "start-rpi5" { Start-Rpi5Sim -TargetMode $Mode -ResetDatabase:$Reset; exit 0 }
        "start-rpi5-prod" { Start-Rpi5Sim -TargetMode "prod" -ResetDatabase:$Reset; exit 0 }
        "start-rpi5-test" { Start-Rpi5Sim -TargetMode "test" -ResetDatabase:$Reset; exit 0 }
        "rpi5" { Start-Rpi5Sim -TargetMode $Mode -ResetDatabase:$Reset; exit 0 }
        "stop-prod" { Stop-ProdApp; exit 0 }
        "stop-test" { Stop-TestApp; exit 0 }
        "stop" { Stop-AllApps; exit 0 }
        "stop-all" { Stop-AllApps -WithVolumes:$Reset; exit 0 }
        "down" { Stop-AllApps -WithVolumes:$Reset; exit 0 }
        "logs" { Show-ContainerLogs "docker-compose.prod.yml" $Service; exit 0 }
        default {
            Write-Host "Unknown action: '$Action'. Valid actions: start-prod, start-test, start-both, start-db, start-rpi5, stop-prod, stop-test, stop, logs" -ForegroundColor Red
            exit 1
        }
    }
}

# Interactive CLI menu when launched without arguments
do {
    Clear-Host
    Show-Header
    Show-EnvironmentSummary

    Write-Host "1. Start Docker PRODUCTION Stack (HTTPS :443, API :8080, DB :5432 - Clean Virgin DB)" -ForegroundColor White
    Write-Host "2. Start Docker TEST / DEMO Stack (HTTPS :8443, API :8082, DB :5434 - Seeded 99 Cocktails)" -ForegroundColor White
    Write-Host "3. Start BOTH Docker Stacks (Prod + Test simultaneously without port collision)" -ForegroundColor Yellow
    Write-Host "4. Start IDE Database (openbar-db on port 5433 for local IntelliJ / VS Code)" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "5. Start Raspberry Pi 5 simulator in PRODUCTION mode (:443 / :8080)" -ForegroundColor White
    Write-Host "6. Start Raspberry Pi 5 simulator in TEST / DEMO mode (:443 / :8080)" -ForegroundColor White
    Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "7. View container logs" -ForegroundColor Cyan
    Write-Host "8. Stop Production Stack only" -ForegroundColor Magenta
    Write-Host "9. Stop Test Stack only" -ForegroundColor Magenta
    Write-Host "10. Stop ALL Docker containers" -ForegroundColor Magenta
    Write-Host "0. Exit" -ForegroundColor Gray
    Write-Host "======================================================================" -ForegroundColor Cyan
    $choice = Read-Host "Select an option [0-10]"

    switch ($choice) {
        "1" {
            $resetDb = Confirm-DatabaseReset
            Start-ProdApp -ResetDatabase:$resetDb
            Read-Host "`nPress Enter to continue..."
        }
        "2" {
            $resetDb = Confirm-DatabaseReset
            Start-TestApp -ResetDatabase:$resetDb
            Read-Host "`nPress Enter to continue..."
        }
        "3" {
            $resetDb = Confirm-DatabaseReset
            Start-BothApps -ResetDatabase:$resetDb
            Read-Host "`nPress Enter to continue..."
        }
        "4" {
            Start-DevDb
            Read-Host "`nPress Enter to continue..."
        }
        "5" {
            $resetDb = Confirm-DatabaseReset
            Start-Rpi5Sim -TargetMode "prod" -ResetDatabase:$resetDb
            Read-Host "`nPress Enter to continue..."
        }
        "6" {
            $resetDb = Confirm-DatabaseReset
            Start-Rpi5Sim -TargetMode "test" -ResetDatabase:$resetDb
            Read-Host "`nPress Enter to continue..."
        }
        "7" { Show-ContainerLogsInteractive; Read-Host "`nPress Enter to continue..." }
        "8" { Stop-ProdApp; Read-Host "`nPress Enter to continue..." }
        "9" { Stop-TestApp; Read-Host "`nPress Enter to continue..." }
        "10" { Stop-AllApps; Read-Host "`nPress Enter to continue..." }
        "0" { Write-Host "Goodbye!" -ForegroundColor Cyan; break }
        default { Write-Host "Invalid option." -ForegroundColor Red; Start-Sleep -Seconds 1 }
    }
} while ($choice -ne "0")
