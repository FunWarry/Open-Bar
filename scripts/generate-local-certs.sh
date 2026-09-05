#!/usr/bin/env bash
# ==============================================================================
# OpenBar — Local TLS / SSL Certificate Generator
# Generates local certificates with Subject Alternative Names (SAN) for
# secure HTTPS access, PWA offline caching, and camera QR code scanning.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default parameters
DEFAULT_DOMAIN="openbar.lan"
DEFAULT_OUTPUT_DIR="${ROOT_DIR}/certs"
DEFAULT_DAYS="3650" # 10 years

DOMAIN="${DEFAULT_DOMAIN}"
OUTPUT_DIR="${DEFAULT_OUTPUT_DIR}"
DAYS="${DEFAULT_DAYS}"
EXTRA_IP=""
TOOL="auto" # auto | mkcert | openssl

# ------------------------------------------------------------------------------
# Help & Usage
# ------------------------------------------------------------------------------
show_help() {
    cat << 'EOF'
OpenBar Local TLS Certificate Generator

Usage:
  ./scripts/generate-local-certs.sh [options]

Options:
  -d, --domain <domain>     Primary domain name (default: openbar.lan)
  -o, --output-dir <dir>    Output directory for cert files (default: ./certs)
  -i, --ip <ip_address>     Additional IP address to include in SAN
      --days <number>       Certificate validity in days (default: 3650)
      --tool <tool>         Generation tool: auto | mkcert | openssl (default: auto)
      --help                Show this help message

Examples:
  ./scripts/generate-local-certs.sh
  ./scripts/generate-local-certs.sh -d openbar.bar -i 192.168.1.100
  ./scripts/generate-local-certs.sh --tool openssl --days 365
EOF
}

# ------------------------------------------------------------------------------
# Parse Arguments
# ------------------------------------------------------------------------------
while [ $# -gt 0 ]; do
    case "$1" in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        -o|--output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -i|--ip)
            EXTRA_IP="$2"
            shift 2
            ;;
        --days)
            DAYS="$2"
            shift 2
            ;;
        --tool)
            TOOL="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Error: Unknown argument '$1'" >&2
            show_help
            exit 1
            ;;
    esac
done

mkdir -p "${OUTPUT_DIR}"
CERT_FILE="${OUTPUT_DIR}/openbar.crt"
KEY_FILE="${OUTPUT_DIR}/openbar.key"

# ------------------------------------------------------------------------------
# Detect Local LAN IP Address
# ------------------------------------------------------------------------------
DETECTED_IP=""
if [ -z "${EXTRA_IP}" ]; then
    if command -v ip >/dev/null 2>&1; then
        DETECTED_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -n1 || true)
    elif command -v hostname >/dev/null 2>&1; then
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || true)
    fi
fi

TARGET_IP="${EXTRA_IP:-$DETECTED_IP}"

echo "================================================================="
echo "   OpenBar Local TLS / SSL Certificate Generator"
echo "================================================================="
echo "Primary Domain : ${DOMAIN}"
echo "Output Dir     : ${OUTPUT_DIR}"
echo "Target Cert    : ${CERT_FILE}"
echo "Target Key     : ${KEY_FILE}"
echo "Validity (days): ${DAYS}"
[ -n "${TARGET_IP}" ] && echo "Detected LAN IP: ${TARGET_IP}"
echo "-----------------------------------------------------------------"

# ------------------------------------------------------------------------------
# Certificate Generation
# ------------------------------------------------------------------------------
SELECTED_TOOL="${TOOL}"
if [ "${SELECTED_TOOL}" = "auto" ]; then
    if command -v mkcert >/dev/null 2>&1; then
        SELECTED_TOOL="mkcert"
    elif command -v openssl >/dev/null 2>&1; then
        SELECTED_TOOL="openssl"
    else
        echo "Error: Neither 'mkcert' nor 'openssl' is installed on this system." >&2
        exit 1
    fi
fi

echo "Using tool: ${SELECTED_TOOL}"

if [ "${SELECTED_TOOL}" = "mkcert" ]; then
    echo "Running mkcert with local CA..."
    mkcert -install >/dev/null 2>&1 || true
    
    SAN_DOMAINS=("localhost" "127.0.0.1" "::1" "${DOMAIN}" "*.${DOMAIN}" "openbar.local" "*.openbar.local")
    [ -n "${TARGET_IP}" ] && SAN_DOMAINS+=("${TARGET_IP}")
    
    mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" "${SAN_DOMAINS[@]}"
else
    # OpenSSL Generation with SAN configuration
    TMP_CONFIG=$(mktemp)
    
    cat << EOF > "${TMP_CONFIG}"
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
CN                  = ${DOMAIN}

[req_ext]
subjectAltName      = @alt_names

[v3_ca]
subjectAltName      = @alt_names
basicConstraints    = critical, CA:true
keyUsage            = critical, digitalSignature, keyEncipherment, keyCertSign
extendedKeyUsage    = serverAuth, clientAuth

[alt_names]
DNS.1               = localhost
DNS.2               = ${DOMAIN}
DNS.3               = *.${DOMAIN}
DNS.4               = openbar.local
DNS.5               = *.openbar.local
IP.1                = 127.0.0.1
IP.2                = ::1
EOF

    if [ -n "${TARGET_IP}" ]; then
        echo "IP.3                = ${TARGET_IP}" >> "${TMP_CONFIG}"
    fi

    openssl req -x509 -nodes -days "${DAYS}" -newkey rsa:2048 \
        -keyout "${KEY_FILE}" \
        -out "${CERT_FILE}" \
        -config "${TMP_CONFIG}" \
        -extensions v3_ca 2>/dev/null

    rm -f "${TMP_CONFIG}"
fi

# Set proper permissions
chmod 0644 "${CERT_FILE}" 2>/dev/null || true
chmod 0600 "${KEY_FILE}" 2>/dev/null || true

# Verify output
if [ ! -f "${CERT_FILE}" ] || [ ! -s "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ] || [ ! -s "${KEY_FILE}" ]; then
    echo "Error: Certificate generation failed." >&2
    exit 1
fi

FINGERPRINT="N/A"
if command -v openssl >/dev/null 2>&1; then
    FINGERPRINT=$(openssl x509 -noout -fingerprint -sha256 -in "${CERT_FILE}" 2>/dev/null | cut -d'=' -f2 || echo "N/A")
fi

echo "-----------------------------------------------------------------"
echo "✅ Local TLS Certificate created successfully!"
echo "Certificate : ${CERT_FILE}"
echo "Private Key : ${KEY_FILE}"
echo "SHA-256     : ${FINGERPRINT}"
echo "================================================================="
echo "Mobile Device Setup (iOS Safari & Android Chrome):"
echo "  1. Copy '${CERT_FILE}' to target tablets/phones or import via AirDrop/Email."
echo "  2. Install as Trusted Root Certificate authority in device settings."
echo "  3. Access https://${TARGET_IP:-openbar.lan} to enjoy PWA offline mode and QR camera scanner!"
echo "================================================================="
exit 0
