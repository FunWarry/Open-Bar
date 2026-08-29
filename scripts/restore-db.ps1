# ==============================================================================
# OpenBar — PostgreSQL Database Disaster Recovery & Restore Script (PowerShell)
# Restores an OpenBar PostgreSQL database snapshot with pre-flight safety checks.
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, Position = 0)]
    [Alias("f")]
    [string]$File,

    [Alias("d")]
    [string]$Database = $env:POSTGRES_DB,

    [Alias("u")]
    [string]$User = $env:POSTGRES_USER,

    [Alias("h")]
    [string]$HostName = $env:POSTGRES_HOST,

    [Alias("p")]
    [int]$Port = 5432,

    [Alias("c")]
    [string]$Container,

    [string]$ComposeFile,

    [Alias("y")]
    [switch]$Force,

    [switch]$NoSafetyBackup,

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
if (-not $ComposeFile) { $ComposeFile = Join-Path $RootDir "docker-compose.prod.yml" }

# Load .env file if available
$envFile = Join-Path $RootDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^[^#].+=.+' } | ForEach-Object {
        $key, $val = $_ -split '=', 2
        [Environment]::SetEnvironmentVariable($key.Trim(), $val.Trim(), "Process")
    }
}

if (-not (Test-Path $File)) {
    throw "Backup file not found: $File"
}

$fileItem = Get-Item $File
if ($fileItem.Length -eq 0) {
    throw "Backup file is empty: $File"
}

$isGz = $File.EndsWith(".gz", [System.StringComparison]::OrdinalIgnoreCase)
$tempSqlFile = [System.IO.Path]::GetTempFileName()

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   OpenBar Database Restore Utility (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Target DB  : $Database"
Write-Host "User       : $User"
Write-Host "Source File: $File"
Write-Host "File Size  : $([Math]::Round($fileItem.Length / 1KB, 2)) KB"
Write-Host "Compressed : $isGz"
Write-Host "Mode       : $Mode"
Write-Host "Timestamp  : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "-----------------------------------------------------------------"

# Confirmation prompt
if (-not $Force) {
    Write-Host "WARNING: This operation will OVERWRITE existing data in '$Database'!" -ForegroundColor Yellow
    $confirmation = Read-Host "Are you sure you want to proceed with restore? [y/N]"
    if ($confirmation -notmatch '^(y|yes)$') {
        Write-Host "Database restoration aborted by user." -ForegroundColor Gray
        exit 0
    }
}

# Safety backup
if (-not $NoSafetyBackup) {
    $backupScript = Join-Path $ScriptDir "backup-db.ps1"
    if (Test-Path $backupScript) {
        Write-Host "Creating pre-restore safety snapshot..." -ForegroundColor Yellow
        $safetyFile = Join-Path (Join-Path $RootDir "backups") ("pre_restore_safety_{0}_{1}.sql.gz" -f $Database, (Get-Date -Format "yyyy-MM-dd_HHmmss"))
        try {
            & $backupScript -Database $Database -User $User -File $safetyFile -ComposeFile $ComposeFile
        } catch {
            Write-Warning "Safety backup failed: $_. Continuing restore..."
        }
    }
}

$startTime = Get-Date

try {
    # Decompress if gzipped
    if ($isGz) {
        Write-Host "Decompressing gzip archive..." -ForegroundColor Gray
        $inputStream = [System.IO.File]::OpenRead($File)
        $gzipStream = New-Object System.IO.Compression.GZipStream($inputStream, [System.IO.Compression.CompressionMode]::Decompress)
        $outputStream = [System.IO.File]::Create($tempSqlFile)
        $gzipStream.CopyTo($outputStream)
        $outputStream.Dispose()
        $gzipStream.Dispose()
        $inputStream.Dispose()
    } else {
        Copy-Item $File $tempSqlFile -Force
    }

    # Resolve target mode
    $targetMode = $Mode
    if ($targetMode -eq "auto") {
        if ((Test-Path $ComposeFile) -and (docker compose -f $ComposeFile ps postgres 2>$null | Select-String "postgres")) {
            $targetMode = "docker-compose"
        } elseif (docker ps --format '{{.Names}}' 2>$null | Select-String -Pattern "openbar.*postgres|gestion_cocktail_db|postgres") {
            $targetMode = "docker-exec"
        } elseif (Get-Command psql -ErrorAction SilentlyContinue) {
            $targetMode = "direct"
        } else {
            $targetMode = "docker-compose"
        }
    }

    Write-Host "Executing restore using mode: $targetMode" -ForegroundColor Yellow

    switch ($targetMode) {
        "docker-compose" {
            $pgPassword = $env:POSTGRES_PASSWORD
            docker compose -f $ComposeFile exec -T -e PGPASSWORD=$pgPassword postgres `
                psql -U $User -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$Database' AND pid <> pg_backend_pid();" 2>$null
            
            Get-Content $tempSqlFile -Raw | docker compose -f $ComposeFile exec -T -e PGPASSWORD=$pgPassword postgres `
                psql -U $User -d $Database -v ON_ERROR_STOP=1
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
                psql -U $User -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$Database' AND pid <> pg_backend_pid();" 2>$null
            
            Get-Content $tempSqlFile -Raw | docker exec -i -e PGPASSWORD=$pgPassword $targetContainer `
                psql -U $User -d $Database -v ON_ERROR_STOP=1
        }
        "direct" {
            $env:PGPASSWORD = $env:POSTGRES_PASSWORD
            psql -h $HostName -p $Port -U $User -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$Database' AND pid <> pg_backend_pid();" 2>$null
            psql -h $HostName -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $tempSqlFile
        }
    }

    $duration = [Math]::Round(((Get-Date) - $startTime).TotalSeconds, 2)
    Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
    Write-Host "Database restore completed successfully!" -ForegroundColor Green
    Write-Host "Target DB  : $Database"
    Write-Host "Restored In: $($duration)s"
    Write-Host "=================================================================" -ForegroundColor Green
} catch {
    Write-Error "Restore failed: $_"
    exit 1
} finally {
    if (Test-Path $tempSqlFile) { Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue }
}
