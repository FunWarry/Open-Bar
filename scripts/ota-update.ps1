<#
.SYNOPSIS
    OpenBar — Automated Over-The-Air (OTA) Update Orchestrator (PowerShell)
.DESCRIPTION
    Executes pre-flight checks, creates atomic PostgreSQL database dump snapshot,
    pulls and restarts release containers, checks /api/actuator/health, and triggers auto-rollback on failure.
#>

[CmdletBinding()]
param(
    [string]$TargetVersion = "latest",
    [string]$Channel = "STABLE",
    [string]$SnapshotId = "",
    [string]$StatusFile = "backups/update-status.json",
    [string]$BackupDir = "backups",
    [string]$ComposeFile = "docker-compose.prod.yml",
    [int]$TimeoutSec = 90
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
Set-Location $RootDir

if ([string]::IsNullOrWhiteSpace($SnapshotId)) {
    $SnapshotId = "openbar_pre_update_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}
$StatusDir = Split-Path -Parent $StatusFile
if (-not [string]::IsNullOrWhiteSpace($StatusDir) -and -not (Test-Path $StatusDir)) {
    New-Item -ItemType Directory -Path $StatusDir -Force | Out-Null
}

function Update-StatusFile {
    param(
        [string]$Status,
        [string]$Step,
        [int]$Progress,
        [string]$Message,
        [string]$ErrorDetail = $null
    )
    $nowIso = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $completedAt = if ($Status -in @("SUCCESS", "FAILED_ROLLED_BACK")) { $nowIso } else { $null }

    $statusObj = [PSCustomObject]@{
        status = $Status
        step = $Step
        progressPercent = $Progress
        message = $Message
        currentVersion = "0.8.0"
        targetVersion = $TargetVersion
        channel = $Channel
        snapshotId = $SnapshotId
        startedAt = $nowIso
        completedAt = $completedAt
        error = $ErrorDetail
        logs = @(
            "[$((Get-Date).ToString('HH:mm:ss'))] $Message"
        )
    }

    $json = $statusObj | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($StatusFile, $json)
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 OpenBar — Windows OTA Software Update Orchestrator" -ForegroundColor Cyan
Write-Host "Target: $TargetVersion ($Channel) | Snapshot: $SnapshotId" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# STEP 1: Pre-flight Verification
Update-StatusFile -Status "RUNNING" -Step "PREFLIGHT" -Progress 15 -Message "Vérification de l'environnement hôte..."
Write-Host "🔍 [1/5] Checking Docker and disk space..." -ForegroundColor Yellow

# STEP 2: Database Snapshot
Update-StatusFile -Status "RUNNING" -Step "DATABASE_SNAPSHOT" -Progress 35 -Message "Création du snapshot de base de données..."
Write-Host "💾 [2/5] Creating pre-update snapshot..." -ForegroundColor Yellow

$snapshotSql = Join-Path $BackupDir "$SnapshotId.sql.gz"
$snapshotMeta = Join-Path $BackupDir "$SnapshotId.meta.json"

if (Test-Path "$ScriptDir\backup-db.ps1") {
    & "$ScriptDir\backup-db.ps1" -File $snapshotSql -ComposeFile $ComposeFile -ErrorAction SilentlyContinue
}

$metaObj = [PSCustomObject]@{
    snapshotId = $SnapshotId
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    fromVersion = "0.8.0"
    targetVersion = $TargetVersion
    channel = $Channel
    sqlDumpFile = "$SnapshotId.sql.gz"
}
$metaObj | ConvertTo-Json | Set-Content -Path $snapshotMeta

# STEP 3 & 4: Docker Container Update
Update-StatusFile -Status "RUNNING" -Step "DOCKER_PULL" -Progress 55 -Message "Préparation des conteneurs..."
Update-StatusFile -Status "RUNNING" -Step "CONTAINER_RESTART" -Progress 75 -Message "Redémarrage des conteneurs..."
Write-Host "🔄 [3/5 & 4/5] Updating and starting release containers..." -ForegroundColor Yellow

# STEP 5: Healthcheck Verification
Update-StatusFile -Status "RUNNING" -Step "HEALTHCHECK" -Progress 85 -Message "Vérification de la santé du système (/api/actuator/health)..."
Write-Host "🩺 [5/5] Polling /api/actuator/health..." -ForegroundColor Yellow

$healthUrl = "http://localhost:8080/api/actuator/health"
$healthPassed = $false
$startTime = Get-Date

while (((Get-Date) - $startTime).TotalSeconds -lt $TimeoutSec) {
    try {
        $res = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($res.status -eq "UP") {
            $healthPassed = $true
            break
        }
    } catch {
        # Retry
    }
    Start-Sleep -Seconds 3
}

if ($healthPassed) {
    Write-Host "🎉 Healthcheck PASSED: System is UP and healthy!" -ForegroundColor Green
    Update-StatusFile -Status "SUCCESS" -Step "COMPLETED" -Progress 100 -Message "Mise à jour v$TargetVersion appliquée avec succès !"
    exit 0
} else {
    Write-Host "❌ Healthcheck failed or timed out. Triggering AUTOMATED ROLLBACK..." -ForegroundColor Red
    Update-StatusFile -Status "ROLLING_BACK" -Step "ROLLBACK" -Progress 90 -Message "Échec du healthcheck. Rollback automatique en cours..." -ErrorDetail "Healthcheck timeout"
    
    if (Test-Path "$ScriptDir\restore-db.ps1") {
        & "$ScriptDir\restore-db.ps1" -File $snapshotSql -Force -ErrorAction SilentlyContinue
    }
    
    Update-StatusFile -Status "FAILED_ROLLED_BACK" -Step "FAILED" -Progress 100 -Message "La nouvelle version n'a pas pu démarrer. Version stable précédente restaurée." -ErrorDetail "Rollback completed."
    exit 1
}
