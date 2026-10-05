#!/usr/bin/env bash
# ==============================================================================
# OpenBar — Docker Compose & Load Testing Management Script (Bash)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-openbar_local_secure_password}"
export JWT_SECRET="${JWT_SECRET:-openbar_local_jwt_secret_key_minimum_32_characters_long_12345}"

show_header() {
    echo "======================================================================"
    echo "🚀 OpenBar — Local Docker Manager & Load Benchmark Suite (k6)"
    echo "======================================================================"
}

wait_for_health() {
    local target_url="${1:-http://localhost:8080/api/cocktails}"
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

start_prod() {
    show_header
    if [ ! -f "${ROOT_DIR}/certs/openbar.crt" ]; then
        echo "⚠️  Local TLS certificates missing. Generating local certificates..."
        "${SCRIPT_DIR}/generate-local-certs.sh"
    fi
    echo "📦 Starting complete production stack (docker-compose.prod.yml)..."
    docker compose -f docker-compose.prod.yml up -d --build
    wait_for_health "http://localhost:8080/api/cocktails" 90
    echo ""
    echo "🌐 Access endpoints:"
    echo "  • Frontend Web PWA (HTTPS) : https://localhost (or https://openbar.lan)"
    echo "  • Frontend Web PWA (HTTP)  : http://localhost (redirects to HTTPS)"
    echo "  • Backend REST API         : http://localhost:8080"
    echo "  • Healthcheck              : http://localhost:8080/api/cocktails"
    echo "  • Swagger UI               : http://localhost:8080/swagger-ui.html"
}

start_rpi5() {
    show_header
    echo "🔒 Verifying Local TLS Certificates for RPi5 simulator..."
    local cert_file="${ROOT_DIR}/certs/openbar.crt"
    local key_file="${ROOT_DIR}/certs/openbar.key"
    if [ ! -f "${cert_file}" ] || [ ! -f "${key_file}" ]; then
        echo "Generating local TLS certificates (SAN: openbar.lan, localhost)..."
        bash "${SCRIPT_DIR}/generate-local-certs.sh"
    fi
    echo "🍓 Starting complete Raspberry Pi 5 production stack (4 cores, 4GB RAM, TLS/HTTPS)..."
    docker compose -f docker/docker-compose.rpi5-sim.yml up -d --build
    wait_for_health "http://localhost:8080/api/cocktails" 90
    echo ""
    echo "🌐 Access endpoints (Raspberry Pi 5 Simulation):"
    echo "  • Frontend Web PWA (HTTPS) : https://localhost (or https://openbar.lan)"
    echo "  • Frontend Web PWA (HTTP)  : http://localhost (redirects to HTTPS)"
    echo "  • Backend REST API         : http://localhost:8080"
    echo "  • WebSocket STOMP          : ws://localhost:8080/ws"
    echo "  • Healthcheck              : http://localhost:8080/api/cocktails"
    echo "  • Swagger UI               : http://localhost:8080/swagger-ui.html"
}

stop_app() {
    show_header
    echo "🛑 Stopping OpenBar containers..."
    docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true
    docker compose -f docker/docker-compose.rpi5-sim.yml down -v 2>/dev/null || true
    echo "✅ All containers stopped successfully."
}

run_test() {
    local scen="${1:-smoke}"
    local url="${2:-http://localhost:8080}"
    local out_dir="${3:-reports/load-tests}"
    show_header
    echo "🎯 Running load test scenario [${scen}] against ${url}..."
    echo "📁 Results will be exported to: ${out_dir}"
    node tests/load/run-load-tests.js "--scenario=${scen}" "--url=${url}" "--output-dir=${out_dir}"
}

run_profile() {
    local duration="${1:-60}"
    local output="${2:-reports/profile-report.json}"
    show_header
    echo "📊 Starting live hardware profiling (CPU, RAM, GC pauses) for ${duration}s..."
    echo "📁 Report will be exported to: ${output}"
    node scripts/benchmark-profile.js "--duration=${duration}" "--output=${output}"
}

case "${1:-}" in
    start|up)
        start_prod
        ;;
    start-rpi5|rpi5)
        start_rpi5
        ;;
    stop|down)
        stop_app
        ;;
    test)
        run_test "${2:-smoke}" "${3:-http://localhost:8080}"
        ;;
    profile)
        run_profile "${2:-60}"
        ;;
    logs)
        docker compose -f docker-compose.prod.yml logs -f --tail=100
        ;;
    *)
        show_header
        echo "Usage: ./scripts/manage-docker-app.sh {start|start-rpi5|stop|test [scenario]|profile|logs}"
        echo ""
        echo "Examples:"
        echo "  ./scripts/manage-docker-app.sh start            # Starts complete app"
        echo "  ./scripts/manage-docker-app.sh test smoke       # Runs k6 smoke test"
        echo "  ./scripts/manage-docker-app.sh test rush-hour   # Runs rush hour peak test"
        echo "  ./scripts/manage-docker-app.sh stop             # Stops all containers"
        ;;
esac
