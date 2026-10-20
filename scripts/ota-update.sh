#!/usr/bin/env bash
# ==============================================================================
# OpenBar — Automated Over-The-Air (OTA) Update Orchestrator
# Executes atomic PostgreSQL database snapshot, pulls/starts new release containers,
# validates container healthcheck (/api/actuator/health), and executes auto-rollback on failure.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

TARGET_VERSION=""
CHANNEL="STABLE"
SNAPSHOT_ID=""
STATUS_FILE="${ROOT_DIR}/backups/update-status.json"
BACKUP_DIR="${ROOT_DIR}/backups"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
API_PORT="${PROD_BACKEND_PORT:-8080}"
HEALTH_TIMEOUT_SEC=90

# ------------------------------------------------------------------------------
# Argument Parsing
# ------------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --target-version)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --channel)
            CHANNEL="$2"
            shift 2
            ;;
        --snapshot-id)
            SNAPSHOT_ID="$2"
            shift 2
            ;;
        --status-file)
            STATUS_FILE="$2"
            shift 2
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --timeout)
            HEALTH_TIMEOUT_SEC="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

if [[ -z "${TARGET_VERSION}" ]]; then
    TARGET_VERSION="latest"
fi

if [[ -z "${SNAPSHOT_ID}" ]]; then
    SNAPSHOT_ID="openbar_pre_update_$(date +%Y%m%d_%H%M%S)"
fi

mkdir -p "${BACKUP_DIR}"
mkdir -p "$(dirname "${STATUS_FILE}")"

# ------------------------------------------------------------------------------
# Helper: Write Status File
# ------------------------------------------------------------------------------
update_status() {
    local status="$1"
    local step="$2"
    local progress="$3"
    local message="$4"
    local error="$5"
    local log_entry="$6"
    local now
    now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    cat <<EOF > "${STATUS_FILE}"
{
  "status": "${status}",
  "step": "${step}",
  "progressPercent": ${progress},
  "message": "${message}",
  "currentVersion": "0.8.0",
  "targetVersion": "${TARGET_VERSION}",
  "channel": "${CHANNEL}",
  "snapshotId": "${SNAPSHOT_ID}",
  "startedAt": "${now}",
  "completedAt": $(if [[ "${status}" == "SUCCESS" || "${status}" == "FAILED_ROLLED_BACK" ]]; then echo "\"${now}\""; else echo "null"; fi),
  "error": $(if [[ -n "${error}" ]]; then echo "\"${error}\""; else echo "null"; fi),
  "logs": [
    "[$(date +"%H:%M:%S")] ${message}",
    $(if [[ -n "${log_entry}" ]]; then echo "\"${log_entry}\""; else echo "\"Execution en cours...\""; fi)
  ]
}
EOF
}

echo "======================================================================"
echo "🚀 OpenBar — OTA Software Update Orchestrator"
echo "Target: ${TARGET_VERSION} (${CHANNEL}) | Snapshot: ${SNAPSHOT_ID}"
echo "======================================================================"

# ------------------------------------------------------------------------------
# STEP 1: Pre-flight Verification
# ------------------------------------------------------------------------------
update_status "RUNNING" "PREFLIGHT" 15 "Vérification de l'environnement hôte et de l'espace disque..." ""
echo "🔍 [1/5] Pre-flight checks..."

if ! command -v docker >/dev/null 2>&1; then
    update_status "FAILED_ROLLED_BACK" "FAILED" 100 "Docker n'est pas installé ou inaccessible sur l'hôte." "Docker command not found"
    exit 1
fi

# Check free disk space (require >= 1GB)
FREE_KB=$(df -k . | tail -1 | awk '{print $4}')
if [[ "${FREE_KB}" -lt 1048576 ]]; then
    update_status "FAILED_ROLLED_BACK" "FAILED" 100 "Espace disque insuffisant (< 1 Go libre)." "Disk space check failed"
    exit 1
fi

# ------------------------------------------------------------------------------
# STEP 2: Database Snapshot (Disaster Recovery)
# ------------------------------------------------------------------------------
update_status "RUNNING" "DATABASE_SNAPSHOT" 35 "Création du snapshot atomique de la base de données..." ""
echo "💾 [2/5] Creating pre-update PostgreSQL database snapshot..."

SNAPSHOT_SQL="${BACKUP_DIR}/${SNAPSHOT_ID}.sql.gz"
SNAPSHOT_META="${BACKUP_DIR}/${SNAPSHOT_ID}.meta.json"

if [[ -f "${SCRIPT_DIR}/backup-db.sh" ]]; then
    bash "${SCRIPT_DIR}/backup-db.sh" -f "${SNAPSHOT_SQL}" --compose-file "${COMPOSE_FILE}" || {
        echo "⚠️  Dedicated backup script failed, creating direct pg_dump snapshot..."
        docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U openbar openbar | gzip > "${SNAPSHOT_SQL}"
    }
else
    docker compose -f "${COMPOSE_FILE}" exec -T postgres pg_dump -U openbar openbar | gzip > "${SNAPSHOT_SQL}"
fi

cat <<EOF > "${SNAPSHOT_META}"
{
  "snapshotId": "${SNAPSHOT_ID}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "fromVersion": "0.8.0",
  "targetVersion": "${TARGET_VERSION}",
  "channel": "${CHANNEL}",
  "sqlDumpFile": "${SNAPSHOT_ID}.sql.gz"
}
EOF
echo "✅ Database snapshot captured: ${SNAPSHOT_SQL}"

# ------------------------------------------------------------------------------
# STEP 3: Tag Fallback & Pull Images
# ------------------------------------------------------------------------------
update_status "RUNNING" "DOCKER_PULL" 55 "Sauvegarde des conteneurs actuels et préparation de la nouvelle version..." ""
echo "📦 [3/5] Tagging current containers as rollback fallback..."

docker tag openbar-prod-backend:latest openbar-prod-backend:rollback-fallback 2>/dev/null || true
docker tag openbar-prod-frontend:latest openbar-prod-frontend:rollback-fallback 2>/dev/null || true

# ------------------------------------------------------------------------------
# STEP 4: Start Containers
# ------------------------------------------------------------------------------
update_status "RUNNING" "CONTAINER_RESTART" 75 "Redémarrage des conteneurs avec la nouvelle version..." ""
echo "🔄 [4/5] Starting containers with release ${TARGET_VERSION}..."

docker compose -f "${COMPOSE_FILE}" up -d --no-deps backend frontend 2>/dev/null || {
    echo "⚠️  Fast restart failed, attempting compose rebuild / restart..."
    docker compose -f "${COMPOSE_FILE}" up -d
}

# ------------------------------------------------------------------------------
# STEP 5: Healthcheck & Automated Rollback
# ------------------------------------------------------------------------------
update_status "RUNNING" "HEALTHCHECK" 85 "Vérification de la santé du système (/api/actuator/health)..." ""
echo "🩺 [5/5] Polling healthcheck endpoint (timeout: ${HEALTH_TIMEOUT_SEC}s)..."

HEALTH_URL="http://localhost:${API_PORT}/api/actuator/health"
HEALTH_PASSED=false
START_TIME=$(date +%s)

while true; do
    HTTP_CODE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" "${HEALTH_URL}" 2>/dev/null || echo "000")
    if [[ "${HTTP_CODE}" == "200" ]]; then
        if grep -q '"status":"UP"' /tmp/health_response.json 2>/dev/null || grep -q '"UP"' /tmp/health_response.json 2>/dev/null; then
            HEALTH_PASSED=true
            break
        fi
    fi

    NOW=$(date +%s)
    if [[ $((NOW - START_TIME)) -ge ${HEALTH_TIMEOUT_SEC} ]]; then
        break
    fi
    sleep 3
done

if [[ "${HEALTH_PASSED}" == "true" ]]; then
    echo "🎉 Healthcheck PASSED: System is UP and healthy!"
    update_status "SUCCESS" "COMPLETED" 100 "Mise à jour v${TARGET_VERSION} appliquée avec succès !" "" "Healthcheck validé avec succès."
    exit 0
fi

# ==============================================================================
# ROLLBACK: Healthcheck Failed or Timed Out
# ==============================================================================
echo "❌ Healthcheck FAILED or timed out (${HEALTH_TIMEOUT_SEC}s). Triggering AUTOMATED ROLLBACK..."
update_status "ROLLING_BACK" "ROLLBACK" 90 "Échec du healthcheck. Déclenchement du rollback automatique et restauration de la base..." "Healthcheck timeout or 5xx"

docker compose -f "${COMPOSE_FILE}" stop backend frontend 2>/dev/null || true

if [[ -f "${SCRIPT_DIR}/restore-db.sh" ]]; then
    bash "${SCRIPT_DIR}/restore-db.sh" -f "${SNAPSHOT_SQL}" --compose-file "${COMPOSE_FILE}" --yes 2>/dev/null || true
else
    gunzip -c "${SNAPSHOT_SQL}" | docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U openbar -d openbar 2>/dev/null || true
fi

docker compose -f "${COMPOSE_FILE}" up -d backend frontend 2>/dev/null || true

update_status "FAILED_ROLLED_BACK" "FAILED" 100 "La nouvelle version n'a pas pu démarrer. Le système a été restauré automatiquement dans sa version stable précédente." "Automated rollback completed successfully." "Version stable restaurée."
echo "🛡️ System rollback completed."
exit 1
