#!/usr/bin/env bash
# ==============================================================================
# OpenBar — PostgreSQL Database Backup Script
# Creates a compressed, timestamped snapshot of the OpenBar PostgreSQL database.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default configuration values
DEFAULT_DB="${POSTGRES_DB:-openbar}"
DEFAULT_USER="${POSTGRES_USER:-openbar}"
DEFAULT_HOST="${POSTGRES_HOST:-localhost}"
DEFAULT_PORT="${POSTGRES_PORT:-5432}"
DEFAULT_OUTPUT_DIR="${ROOT_DIR}/backups"
DEFAULT_COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

DB_NAME="${DEFAULT_DB}"
DB_USER="${DEFAULT_USER}"
DB_HOST="${DEFAULT_HOST}"
DB_PORT="${DEFAULT_PORT}"
OUTPUT_DIR="${DEFAULT_OUTPUT_DIR}"
COMPOSE_FILE="${DEFAULT_COMPOSE_FILE}"
CONTAINER_NAME=""
CUSTOM_FILE=""
MODE="auto" # auto | docker-compose | docker-exec | direct

# ------------------------------------------------------------------------------
# Usage & Help
# ------------------------------------------------------------------------------
show_help() {
    cat << 'EOF'
OpenBar Database Backup Utility

Usage:
  ./scripts/backup-db.sh [options]

Options:
  -d, --db <name>            Database name (default: openbar)
  -u, --user <username>      Database username (default: openbar)
  -h, --host <hostname>      Database host (default: localhost)
  -p, --port <port>          Database port (default: 5432)
  -o, --output-dir <dir>     Output directory for backups (default: ./backups)
  -f, --file <path>          Custom output filename (.sql.gz)
  -c, --container <name>     Direct Docker container name to execute pg_dump in
      --compose-file <file>  Docker Compose file (default: docker-compose.prod.yml)
      --mode <mode>          Execution mode: auto | docker-compose | docker-exec | direct
      --help                 Show this help message

Examples:
  ./scripts/backup-db.sh
  ./scripts/backup-db.sh --output-dir /var/backups/openbar
  ./scripts/backup-db.sh --mode docker-compose --db openbar
EOF
}

# ------------------------------------------------------------------------------
# Load environment variables if available
# ------------------------------------------------------------------------------
if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    set -a
    . "${ROOT_DIR}/.env"
    set +a
elif [ -f "${ROOT_DIR}/backend/.env" ]; then
    # shellcheck disable=SC1091
    set -a
    . "${ROOT_DIR}/backend/.env"
    set +a
fi

# Re-evaluate defaults in case env files defined values
[ "${DB_NAME}" = "${DEFAULT_DB}" ] && DB_NAME="${POSTGRES_DB:-$DEFAULT_DB}"
[ "${DB_USER}" = "${DEFAULT_USER}" ] && DB_USER="${POSTGRES_USER:-$DEFAULT_USER}"
[ "${DB_PORT}" = "${DEFAULT_PORT}" ] && DB_PORT="${POSTGRES_PORT:-$DEFAULT_PORT}"

# ------------------------------------------------------------------------------
# Parse command-line arguments
# ------------------------------------------------------------------------------
while [ $# -gt 0 ]; do
    case "$1" in
        -d|--db)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -o|--output-dir)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -f|--file)
            CUSTOM_FILE="$2"
            shift 2
            ;;
        -c|--container)
            CONTAINER_NAME="$2"
            MODE="docker-exec"
            shift 2
            ;;
        --compose-file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        --mode)
            MODE="$2"
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

START_TIME=$(date +%s)
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
mkdir -p "${OUTPUT_DIR}"

if [ -n "${CUSTOM_FILE}" ]; then
    BACKUP_FILE="${CUSTOM_FILE}"
else
    BACKUP_FILE="${OUTPUT_DIR}/${DB_NAME}_backup_${TIMESTAMP}.sql.gz"
fi

echo "================================================================="
echo "   OpenBar Database Backup Utility"
echo "================================================================="
echo "Database   : ${DB_NAME}"
echo "User       : ${DB_USER}"
echo "Target File: ${BACKUP_FILE}"
echo "Mode       : ${MODE}"
echo "Timestamp  : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "-----------------------------------------------------------------"

# ------------------------------------------------------------------------------
# Execution Strategy
# ------------------------------------------------------------------------------
execute_backup() {
    local target_mode="${MODE}"

    # Auto-detect mode if set to 'auto'
    if [ "${target_mode}" = "auto" ]; then
        if [ -f "${COMPOSE_FILE}" ] && docker compose -f "${COMPOSE_FILE}" ps postgres 2>/dev/null | grep -q "postgres"; then
            target_mode="docker-compose"
        elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qE "openbar.*postgres|gestion_cocktail_db|postgres"; then
            target_mode="docker-exec"
        elif command -v pg_dump >/dev/null 2>&1; then
            target_mode="direct"
        else
            target_mode="docker-compose"
        fi
    fi

    echo "Executing backup using mode: ${target_mode}"

    case "${target_mode}" in
        docker-compose)
            if [ ! -f "${COMPOSE_FILE}" ]; then
                echo "Error: Docker Compose file not found: ${COMPOSE_FILE}" >&2
                return 1
            fi
            docker compose -f "${COMPOSE_FILE}" exec -T -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres \
                pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
            ;;
        docker-exec)
            local target_c="${CONTAINER_NAME}"
            if [ -z "${target_c}" ]; then
                target_c=$(docker ps --format '{{.Names}}' | grep -E "openbar.*postgres|gestion_cocktail_db|postgres" | head -n 1)
            fi
            if [ -z "${target_c}" ]; then
                echo "Error: Could not detect running PostgreSQL container. Use -c <container_name>" >&2
                return 1
            fi
            echo "Using PostgreSQL container: ${target_c}"
            docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD}" "${target_c}" \
                pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
            ;;
        direct)
            if ! command -v pg_dump >/dev/null 2>&1; then
                echo "Error: pg_dump utility is not installed on host." >&2
                return 1
            fi
            PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
                -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
                --clean --if-exists --no-owner --no-privileges | gzip -9 > "${BACKUP_FILE}"
            ;;
        *)
            echo "Error: Unsupported mode '${target_mode}'" >&2
            return 1
            ;;
    esac
}

# Perform the backup
if execute_backup; then
    # Validate file existence and size
    if [ ! -f "${BACKUP_FILE}" ] || [ ! -s "${BACKUP_FILE}" ]; then
        echo "Error: Backup file was created but is empty or missing: ${BACKUP_FILE}" >&2
        rm -f "${BACKUP_FILE}"
        exit 1
    fi

    # Test gzip integrity
    if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
        echo "Error: Backup archive corrupted or invalid gzip stream: ${BACKUP_FILE}" >&2
        rm -f "${BACKUP_FILE}"
        exit 1
    fi

    # Calculate metrics
    FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    CHECKSUM="N/A"
    if command -v sha256sum >/dev/null 2>&1; then
        CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
        CHECKSUM=$(shasum -a 256 "${BACKUP_FILE}" | awk '{print $1}')
    fi

    echo "-----------------------------------------------------------------"
    echo "✅ Database backup created successfully!"
    echo "Location : ${BACKUP_FILE}"
    echo "Size     : ${FILE_SIZE}"
    echo "SHA-256  : ${CHECKSUM}"
    echo "Duration : ${DURATION}s"
    echo "================================================================="
    exit 0
else
    echo "Error: Failed to create database backup." >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi
