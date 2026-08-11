# OpenBar — Script de validation SonarCloud local
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   OpenBar - Sonar Scan Local Validation  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Backend — Compilation et copie des dépendances
Push-Location "$PSScriptRoot/../backend"
mvn test-compile -q
Pop-Location

# 2. Frontend — Génération du rapport LCOV
Write-Host "`n[2/3] Frontend - Generation du rapport LCOV (Karma)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot/../frontend"
if (-not $env:CHROME_BIN -and (Test-Path "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")) {
    $env:CHROME_BIN = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage

# 3. SonarScanner Local
Write-Host "`n[3/3] Execution de SonarScanner Local..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot/.."
npx -y sonar-scanner "-Dsonar.qualitygate.wait=true"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Sonar Scan Local PASSED avec succes ! " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
