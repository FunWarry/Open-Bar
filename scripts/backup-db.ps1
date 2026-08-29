# ==============================================================================
# OpenBar — PostgreSQL Database Backup Script (PowerShell)
# Creates a compressed, timestamped snapshot of the OpenBar PostgreSQL database.
# ==============================================================================

[CmdletBinding()]
param (
    [Alias("d")]
    [string]$Database = $env:POSTGRES_DB,

    [Alias("u")]
    [string]$User = $env:POSTGRES_USER,

    [Alias("h")]
    [string]$HostName = $env:POSTGRES_HOST,

    [Alias("p")]
    [int]$Port = 5432,

    [Alias("o")]
    [string]$OutputDir,

    [Alias("f")]
    [string]$File,

    [Alias("c")]
    [string]$Container,

    [string]$ComposeFile,

    [ValidateSet("auto", "docker-compose", "docker-exec", "direct")]
    [string]$Mode = "auto"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

# Load default values
if (-not $Database) { $Database = "openbar" }
if (-not $User) { $User = "openbar" }
if (-not $HostName) { $HostName = "localhost" }
if (-not $OutputDir) { $OutputDir = Join-Path $RootDir "backups" }
if (-not $ComposeFile) { $ComposeFile = Join-Path $RootDir "docker-compose.prod.yml" }

# Load .env file if available
$envFile = Join-Path $RootDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^[^#].+=.+' } | ForEach-Object {
        $key, $val = $_ -split '=', 2
        [Environment]::SetEnvironmentVariable($key.Trim(), $val.Trim(), "Process")
    }
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = (Get-Date).ToString("yyyy-MM-dd_HHmmss")
if ($File) {
    $backupFile = $File
} else {
    $backupFile = Join-Path $OutputDir ("{0}_backup_{1}.sql.gz" -f $Database, $timestamp)
}

$tempSqlFile = [System.IO.Path]::GetTempFileName()

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   OpenBar Database Backup Utility (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Database   : $Database"
Write-Host "User       : $User"
Write-Host "Target File: $backupFile"
Write-Host "Mode       : $Mode"
Write-Host "Timestamp  : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "-----------------------------------------------------------------"

$startTime = Get-Date

try {
    # Resolve target mode
    $targetMode = $Mode
    if ($targetMode -eq "auto") {
        if ((Test-Path $ComposeFile) -and (docker compose -f $ComposeFile ps postgres 2>$null | Select-String "postgres")) {
            $targetMode = "docker-compose"
        } elseif (docker ps --format '{{.Names}}' 2>$null | Select-String -Pattern "openbar.*postgres|gestion_cocktail_db|postgres") {
            $targetMode = "docker-exec"
        } elseif (Get-Command pg_dump -ErrorAction SilentlyContinue) {
            $targetMode = "direct"
        } else {
            $targetMode = "docker-compose"
        }
    }

    Write-Host "Executing backup using mode: $targetMode" -ForegroundColor Yellow

    switch ($targetMode) {
        "docker-compose" {
            $pgPassword = $env:POSTGRES_PASSWORD
            docker compose -f $ComposeFile exec -T -e PGPASSWORD=$pgPassword postgres `
                pg_dump -U $User -d $Database --clean --if-exists --no-owner --no-privileges > $tempSqlFile
        }
        "docker-exec" {
            $targetContainer = $Container
            if (-not $targetContainer) {
                $targetContainer = (docker ps --format '{{.Names}}' | Select-String -Pattern "openbar.*postgres|gestion_cocktail_db|postgres" | Select-Object -First 1).ToString().Trim()
            }
            if (-not $targetContainer) {
                throw "Could not find a running PostgreSQL container. Specify -Container <name>."
            }
            Write-Host "Using PostgreSQL container: $targetContainer"
            $pgPassword = $env:POSTGRES_PASSWORD
            docker exec -i -e PGPASSWORD=$pgPassword $targetContainer `
                pg_dump -U $User -d $Database --clean --if-exists --no-owner --no-privileges > $tempSqlFile
        }
        "direct" {
            $env:PGPASSWORD = $env:POSTGRES_PASSWORD
            pg_dump -h $HostName -p $Port -U $User -d $Database --clean --if-exists --no-owner --no-privileges > $tempSqlFile
        }
    }

    if (-not (Test-Path $tempSqlFile) -or ((Get-Item $tempSqlFile).Length -eq 0)) {
        throw "Generated backup SQL is empty or missing."
    }

    # Compress file to gzip
    $inputStream = [System.IO.File]::OpenRead($tempSqlFile)
    $outputStream = [System.IO.File]::Create($backupFile)
    $gzipStream = New-Object System.IO.Compression.GZipStream($outputStream, [System.IO.Compression.CompressionLevel]::Optimal)
    $inputStream.CopyTo($gzipStream)
    $gzipStream.Dispose()
    $outputStream.Dispose()
    $inputStream.Dispose()

    $fileInfo = Get-Item $backupFile
    $hash = (Get-FileHash -Path $backupFile -Algorithm SHA256).Hash
    $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)

    Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
    Write-Host "Database backup created successfully!" -ForegroundColor Green
    Write-Host "Location : $backupFile"
    Write-Host "Size     : $([Math]::Round($fileInfo.Length / 1KB, 2)) KB"
    Write-Host "SHA-256  : $hash"
    Write-Host "Duration : $($duration)s"
    Write-Host "=================================================================" -ForegroundColor Green
} catch {
    Write-Error "Backup failed: $_"
    if (Test-Path $backupFile) { Remove-Item $backupFile -Force -ErrorAction SilentlyContinue }
    exit 1
} finally {
    if (Test-Path $tempSqlFile) { Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue }
}
