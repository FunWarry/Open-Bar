# OpenBar - Configure Windows Defender Firewall for Docker & Local Stack
# Requires Administrator privileges (will auto-elevate via UAC if needed)

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "Elevating privileges to configure Windows Firewall..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " OpenBar - Windows Firewall Configuration" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Update existing Docker Desktop rules to include 'Private' network profile
Write-Host "`n[1/3] Enabling Private profile on Docker Desktop Backend..." -ForegroundColor Yellow
try {
    netsh advfirewall firewall set rule name="Docker Desktop Backend" new profile=private,public
    Write-Host "[OK] Docker Desktop Backend rule profile set to Private + Public" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not update Docker Desktop Backend rule: $_" -ForegroundColor Yellow
}

# 2. Add explicit Inbound rule for OpenBar ports (443, 8443, 80, 8088, 4201)
Write-Host "`n[2/3] Adding inbound rule for OpenBar web ports..." -ForegroundColor Yellow
$ruleName = "OpenBar Docker & Web Stack"
$ports = "80,443,8080,8082,8088,8443,4201"

# Remove old rule if exists
Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

# Create new comprehensive rule for Private and Public networks
New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 80, 443, 8080, 8082, 8088, 8443, 4201 `
    -Action Allow `
    -Profile Domain, Private, Public `
    -Description "Allows inbound traffic for OpenBar production, test, and development stacks" | Out-Null

Write-Host "[OK] Firewall rule '$ruleName' created for ports: $ports on Domain, Private, and Public profiles." -ForegroundColor Green

# 3. Add explicit Inbound rule for WSL Relay
Write-Host "`n[3/3] Authorizing WSL Relay..." -ForegroundColor Yellow
$wslRelayPath = "C:\Program Files\WSL\wslrelay.exe"
if (Test-Path $wslRelayPath) {
    $wslRuleName = "WSL Relay (OpenBar)"
    Remove-NetFirewallRule -DisplayName $wslRuleName -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $wslRuleName `
        -Direction Inbound `
        -Program $wslRelayPath `
        -Action Allow `
        -Profile Domain, Private, Public `
        -Description "Allows WSL Relay to accept inbound connections" | Out-Null
    Write-Host "[OK] WSL Relay authorized for incoming connections." -ForegroundColor Green
} else {
    Write-Host "[INFO] WSL Relay binary not found at default path, skipping." -ForegroundColor DarkGray
}

Write-Host "`n[SUCCESS] Windows Firewall successfully configured for OpenBar!" -ForegroundColor Green
Start-Sleep -Seconds 3
