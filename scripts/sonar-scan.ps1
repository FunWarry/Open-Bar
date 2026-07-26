# OpenBar — Script de validation SonarCloud local
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   OpenBar - Sonar Scan Local Validation  " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Backend — Compilation et copie des dépendances
Write-Host "`n[1/3] Backend - Preparation des binaries..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot/../backend"
mvn test-compile dependency:copy-dependencies -DincludeScope=test -DoutputDirectory=target/dependency -q

# 2. Frontend — Génération du rapport LCOV
Write-Host "`n[2/3] Frontend - Generation du rapport LCOV (Karma)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot/../frontend"
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage

# 3. SonarScanner Local
Write-Host "`n[3/3] Execution de SonarScanner Local..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot/.."
npx -y sonar-scanner "-Dsonar.qualitygate.wait=true"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Sonar Scan Local PASSED avec succes ! " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
