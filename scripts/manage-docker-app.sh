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
    echo "📦 Starting complete production stack (docker-compose.prod.yml)..."
    docker compose -f docker-compose.prod.yml up -d --build
    wait_for_health "http://localhost:8080/api/cocktails" 90
    echo ""
    echo "🌐 Access endpoints:"
    echo "  • Frontend Web PWA : http://localhost"
    echo "  • Backend REST API : http://localhost:8080"
    echo "  • Healthcheck      : http://localhost:8080/api/cocktails"
    echo "  • Swagger UI       : http://localhost:8080/swagger-ui.html"
}

start_rpi5() {
    show_header
    echo "🍓 Starting Raspberry Pi 5 simulation (4 vCPUs, 2GB RAM, G1GC)..."
    docker compose -f docker/docker-compose.rpi5-sim.yml up -d --build
    wait_for_health "http://localhost:8080/api/cocktails" 90
    echo ""
    echo "🌐 Access endpoints:"
    echo "  • Simulated Backend: http://localhost:8080"
    echo "  • Healthcheck      : http://localhost:8080/api/cocktails"
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
    show_header
    echo "🎯 Running load test scenario [${scen}] against ${url}..."
    node tests/load/run-load-tests.js "--scenario=${scen}" "--url=${url}"
}

run_profile() {
    local duration="${1:-60}"
    show_header
    echo "📊 Starting live hardware profiling (CPU, RAM, GC pauses) for ${duration}s..."
    node scripts/benchmark-profile.js "--duration=${duration}" "--output=profile-report.json"
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
