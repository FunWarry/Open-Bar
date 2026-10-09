#!/usr/bin/env bash
# ==============================================================================
# OpenBar — Docker Application Launcher (Bash)
# Dedicated launcher for Docker stacks and environment selection (no load tests)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if [ -f "${ROOT_DIR}/.env" ]; then
    set -a
    . "${ROOT_DIR}/.env"
    set +a
fi

export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-openbar_local_secure_password}"
export JWT_SECRET="${JWT_SECRET:-openbar_local_jwt_secret_key_minimum_32_characters_long_12345}"

export PROD_BACKEND_PORT="${PROD_BACKEND_PORT:-8080}"
export PROD_HTTP_PORT="${PROD_HTTP_PORT:-80}"
export PROD_HTTPS_PORT="${PROD_HTTPS_PORT:-443}"
export PROD_DB_PORT="${PROD_DB_PORT:-5432}"

export TEST_BACKEND_PORT="${TEST_BACKEND_PORT:-8082}"
export TEST_HTTP_PORT="${TEST_HTTP_PORT:-8088}"
export TEST_HTTPS_PORT="${TEST_HTTPS_PORT:-8443}"
export TEST_DB_PORT="${TEST_DB_PORT:-5434}"

show_header() {
    echo "======================================================================"
    echo "🚀 OpenBar — Docker Application Launcher"
    echo "======================================================================"
}

wait_for_health() {
    local target_url="${1:-http://localhost:${PROD_BACKEND_PORT}/api/cocktails}"
    local timeout_sec="${2:-90}"
    echo -n "⏳ Waiting for backend availability (${target_url})..."
    local start_time=$(date +%s)
    while true; do
        if curl -s -o /dev/null -w "%{http_code}" "${target_url}" | grep -q "200"; then
            echo -e "\n✅ Backend OpenBar is UP and healthy!"
            return 0
        fi
        local now=$(date +%s)
        if [ $((now - start_time)) -ge ${timeout_sec} ]; then
            echo -e "\n⚠️  Timeout reached (${timeout_sec}s)."
            return 1
        fi
        echo -n "."
        sleep 2
    done
}

ensure_certs() {
    if [ ! -f "${ROOT_DIR}/certs/openbar.crt" ] || [ ! -f "${ROOT_DIR}/certs/openbar.key" ]; then
        echo "⚠️  Local TLS certificates missing. Generating local certificates..."
        bash "${SCRIPT_DIR}/generate-local-certs.sh"
    fi
}

start_prod() {
    show_header
    ensure_certs
    echo "📦 Starting Docker PRODUCTION Stack (openbar-prod)..."
    echo "  • Frontend HTTPS : https://localhost (or https://openbar.lan)"
    echo "  • Frontend HTTP  : http://localhost (redirects to HTTPS)"
    echo "  • Backend API    : http://localhost:${PROD_BACKEND_PORT}"
    echo "  • Database       : localhost:${PROD_DB_PORT}"
    docker compose -f docker-compose.prod.yml up -d --build
    wait_for_health "http://localhost:${PROD_BACKEND_PORT}/api/cocktails" 90
    echo -e "\n✅ Production stack is UP and healthy at https://localhost"
}

start_test() {
    show_header
    ensure_certs
    echo "📦 Starting Docker TEST / DEMO Stack (openbar-test)..."
    echo "  • Frontend HTTPS : https://localhost:${TEST_HTTPS_PORT} (Special HTTPS Port)"
    echo "  • Frontend HTTP  : http://localhost:${TEST_HTTP_PORT} (Special HTTP Port)"
    echo "  • Backend API    : http://localhost:${TEST_BACKEND_PORT}"
    echo "  • Database       : localhost:${TEST_DB_PORT}"
    docker compose -f docker-compose.test.yml up -d --build
    wait_for_health "http://localhost:${TEST_BACKEND_PORT}/api/cocktails" 90
    echo -e "\n✅ Test / Demo stack is UP and healthy at https://localhost:${TEST_HTTPS_PORT}"
    echo "🔑 Demo Accounts: admin/admin123, manager1/manager123, barman1/barman123, serveur1/serveur123"
}

start_both() {
    show_header
    echo "🚀 Starting BOTH Production and Test stacks simultaneously..."
    start_prod
    start_test
    echo -e "\n🎉 Both environments are running concurrently without port conflicts!"
}

start_dev_db() {
    show_header
    echo "🐘 Starting IDE Development Database (openbar-db on port 5433)..."
    docker compose -f backend/src/main/resources/docker-compose.yml up -d
    echo "✅ IDE database running on localhost:5433"
}

stop_prod() {
    echo "🛑 Stopping Production stack..."
    docker compose -f docker-compose.prod.yml down --remove-orphans
}

stop_test() {
    echo "🛑 Stopping Test stack..."
    docker compose -f docker-compose.test.yml down --remove-orphans
}

stop_all() {
    echo "🛑 Stopping all OpenBar Docker stacks..."
    docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    docker compose -f docker-compose.test.yml down --remove-orphans 2>/dev/null || true
    docker compose -f docker/docker-compose.rpi5-sim.yml down --remove-orphans 2>/dev/null || true
    docker compose -f backend/src/main/resources/docker-compose.yml down --remove-orphans 2>/dev/null || true
    echo "✅ All stacks stopped."
}

case "${1:-}" in
    start-prod)
        start_prod
        ;;
    start-test)
        start_test
        ;;
    start-both)
        start_both
        ;;
    start-db)
        start_dev_db
        ;;
    stop-prod)
        stop_prod
        ;;
    stop-test)
        stop_test
        ;;
    stop|stop-all|down)
        stop_all
        ;;
    logs)
        docker compose -f docker-compose.prod.yml logs -f --tail=100
        ;;
    *)
        show_header
        echo "Usage: ./scripts/start-docker-app.sh {start-prod|start-test|start-both|start-db|stop-prod|stop-test|stop-all|logs}"
        ;;
esac
