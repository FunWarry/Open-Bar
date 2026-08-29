#!/bin/sh
# ==============================================================================
# OpenBar — Frontend Nginx TLS Bootstrap Entrypoint
# Ensures SSL/TLS certificates exist before starting Nginx.
# If no certificates are mounted, generates a self-signed fallback certificate.
# ==============================================================================

set -e

CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/openbar.crt"
KEY_FILE="${CERT_DIR}/openbar.key"

mkdir -p "${CERT_DIR}"

if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    echo "Notice: SSL certificates missing in ${CERT_DIR}. Generating fallback self-signed certificate..."
    
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "${KEY_FILE}" \
        -out "${CERT_FILE}" \
        -subj "/CN=openbar.lan/O=OpenBar/C=FR" \
        -addext "subjectAltName=DNS:localhost,DNS:openbar.lan,DNS:*.openbar.lan,DNS:openbar.local,IP:127.0.0.1" \
        2>/dev/null || {
            # Fallback for OpenSSL versions without -addext
            openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
                -keyout "${KEY_FILE}" \
                -out "${CERT_FILE}" \
                -subj "/CN=openbar.lan/O=OpenBar/C=FR" \
                2>/dev/null
        }

    chmod 0644 "${CERT_FILE}" 2>/dev/null || true
    chmod 0600 "${KEY_FILE}" 2>/dev/null || true
    echo "Fallback SSL certificate generated successfully."
fi

# Hand over to Nginx
exec nginx -g "daemon off;"
