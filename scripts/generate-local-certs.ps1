# ==============================================================================
# OpenBar — Local TLS / SSL Certificate Generator (PowerShell)
# Generates local certificates with Subject Alternative Names (SAN) for
# secure HTTPS access, PWA offline caching, and camera QR code scanning.
# ==============================================================================

[CmdletBinding()]
param (
    [Alias("d")]
    [string]$Domain = "openbar.lan",

    [Alias("o")]
    [string]$OutputDir,

    [Alias("i")]
    [string]$IP,

    [int]$Days = 3650,

    [ValidateSet("auto", "mkcert", "openssl", "pki")]
    [string]$Tool = "auto"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

if (-not $OutputDir) {
    $OutputDir = Join-Path $RootDir "certs"
}

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$certFile = Join-Path $OutputDir "openbar.crt"
$keyFile = Join-Path $OutputDir "openbar.key"

# Detect local LAN IPv4 address
$detectedIP = $IP
if (-not $detectedIP) {
    try {
        $detectedIP = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notlike "*vEthernet*" } |
            Select-Object -ExpandProperty IPAddress -First 1)
    } catch {
        $detectedIP = "127.0.0.1"
    }
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   OpenBar Local TLS / SSL Certificate Generator (PowerShell)" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Primary Domain : $Domain"
Write-Host "Output Dir     : $OutputDir"
Write-Host "Target Cert    : $certFile"
Write-Host "Target Key     : $keyFile"
Write-Host "Validity (days): $Days"
if ($detectedIP) { Write-Host "Detected LAN IP: $detectedIP" }
Write-Host "-----------------------------------------------------------------"

# Tool selection
$selectedTool = $Tool
if ($selectedTool -eq "auto") {
    if (Get-Command mkcert -ErrorAction SilentlyContinue) {
        $selectedTool = "mkcert"
    } elseif (Get-Command openssl -ErrorAction SilentlyContinue) {
        $selectedTool = "openssl"
    } else {
        $selectedTool = "pki"
    }
}

Write-Host "Using tool: $selectedTool" -ForegroundColor Yellow

switch ($selectedTool) {
    "mkcert" {
        $sanList = @("localhost", "127.0.0.1", "::1", $Domain, "*.$Domain", "openbar.local", "*.openbar.local")
        if ($detectedIP) { $sanList += $detectedIP }
        
        & mkcert -cert-file $certFile -key-file $keyFile $sanList
    }
    "openssl" {
        $tempConf = [System.IO.Path]::GetTempFileName()
        
        $confContent = @"
[req]
default_bits        = 2048
prompt              = no
default_md          = sha256
distinguished_name  = dn
req_extensions      = req_ext
x509_extensions     = v3_ca

[dn]
C                   = FR
ST                  = Ile-de-France
L                   = Paris
O                   = OpenBar
OU                  = Local Development & Production PWA
CN                  = $Domain

[req_ext]
subjectAltName      = @alt_names

[v3_ca]
subjectAltName      = @alt_names
basicConstraints    = critical, CA:true
keyUsage            = critical, digitalSignature, keyEncipherment, keyCertSign
extendedKeyUsage    = serverAuth, clientAuth

[alt_names]
DNS.1               = localhost
DNS.2               = $Domain
DNS.3               = *.$Domain
DNS.4               = openbar.local
DNS.5               = *.openbar.local
IP.1                = 127.0.0.1
IP.2                = ::1
"@
        if ($detectedIP) {
            $confContent += "`nIP.3                = $detectedIP"
        }

        Set-Content -Path $tempConf -Value $confContent

        try {
            & openssl req -x509 -nodes -days $Days -newkey rsa:2048 `
                -keyout $keyFile `
                -out $certFile `
                -config $tempConf `
                -extensions v3_ca 2>&1 | Out-Null
        } finally {
            if (Test-Path $tempConf) { Remove-Item $tempConf -Force -ErrorAction SilentlyContinue }
        }
    }
    "pki" {
        # Native Windows PowerShell PKI fallback
        $sanList = @("localhost", $Domain, "*.$Domain", "openbar.local")
        if ($detectedIP) { $sanList += $detectedIP }

        $cert = New-SelfSignedCertificate -DnsName $sanList `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -NotAfter (Get-Date).AddDays($Days) `
            -KeyExportPolicy Exportable `
            -KeyLength 2048 `
            -HashAlgorithm "SHA256" `
            -Subject "CN=$Domain, O=OpenBar"

        # Export public cert in PEM format
        $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
        $certPem = "-----BEGIN CERTIFICATE-----`n" + [System.Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`n-----END CERTIFICATE-----`n"
        Set-Content -Path $certFile -Value $certPem

        # Create private key container placeholder
        Set-Content -Path $keyFile -Value "# Managed in Windows Certificate Store: $($cert.Thumbprint)"
    }
}

if (-not (Test-Path $certFile) -or (Get-Item $certFile).Length -eq 0) {
    throw "Certificate generation failed: Output file missing or empty."
}

$displayTarget = if ($detectedIP) { $detectedIP } else { $Domain }
Write-Host "-----------------------------------------------------------------" -ForegroundColor Green
Write-Host "Local TLS Certificate generated successfully!" -ForegroundColor Green
Write-Host "Certificate : $certFile"
Write-Host "Private Key : $keyFile"
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "Mobile Device Setup (iOS Safari & Android Chrome):" -ForegroundColor Cyan
Write-Host "  1. Copy '$certFile' to target devices (AirDrop / Email / USB)."
Write-Host "  2. Install as Trusted Root CA in device settings."
Write-Host "  3. Access https://$displayTarget for PWA offline mode and QR camera access."
Write-Host "=================================================================" -ForegroundColor Cyan
