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

mkdir -p "${CERT_DIR}" 2>/dev/null || true

if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    echo "Notice: SSL certificates missing in ${CERT_DIR}. Generating fallback self-signed certificate..."
    
    TARGET_DIR="${CERT_DIR}"
    if [ ! -w "${CERT_DIR}" ]; then
        echo "Notice: ${CERT_DIR} is read-only. Generating fallback SSL certificates in /tmp/certs..."
        TARGET_DIR="/tmp/certs"
        mkdir -p "${TARGET_DIR}"
    fi

    FALLBACK_KEY="${TARGET_DIR}/openbar.key"
    FALLBACK_CERT="${TARGET_DIR}/openbar.crt"
    
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout "${FALLBACK_KEY}" \
        -out "${FALLBACK_CERT}" \
        -subj "/CN=openbar.lan/O=OpenBar/C=FR" \
        -addext "subjectAltName=DNS:localhost,DNS:openbar.lan,DNS:*.openbar.lan,DNS:openbar.local,DNS:app.open-bar.eu,DNS:test.open-bar.eu,DNS:*.open-bar.eu,IP:127.0.0.1" \
        2>/dev/null || {
            # Fallback for OpenSSL versions without -addext
            openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
                -keyout "${FALLBACK_KEY}" \
                -out "${FALLBACK_CERT}" \
                -subj "/CN=openbar.lan/O=OpenBar/C=FR" \
                2>/dev/null
        }

    chmod 0644 "${FALLBACK_CERT}" 2>/dev/null || true
    chmod 0600 "${FALLBACK_KEY}" 2>/dev/null || true

    if [ "${TARGET_DIR}" != "${CERT_DIR}" ]; then
        sed -i "s|/etc/nginx/certs/openbar.crt|/tmp/certs/openbar.crt|g" /etc/nginx/conf.d/default.conf
        sed -i "s|/etc/nginx/certs/openbar.key|/tmp/certs/openbar.key|g" /etc/nginx/conf.d/default.conf
    fi

    echo "Fallback SSL certificate generated successfully."
fi

# Configure custom HTTPS redirect port if specified (e.g. 8443 for test environment)
if [ -n "${HTTPS_PORT}" ] && [ "${HTTPS_PORT}" != "443" ]; then
    sed -i "s|return 301 https://\$host\$request_uri;|return 301 https://\$host:${HTTPS_PORT}\$request_uri;|g" /etc/nginx/conf.d/default.conf
fi

# Hand over to Nginx
exec nginx -g "daemon off;"
