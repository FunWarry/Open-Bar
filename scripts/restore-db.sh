#!/usr/bin/env bash
# ==============================================================================
# OpenBar — PostgreSQL Database Disaster Recovery & Restore Script
# Restores an OpenBar PostgreSQL database snapshot with pre-flight safety checks.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Default configuration values
DEFAULT_DB="${POSTGRES_DB:-openbar}"
DEFAULT_USER="${POSTGRES_USER:-openbar}"
DEFAULT_HOST="${POSTGRES_HOST:-localhost}"
DEFAULT_PORT="${POSTGRES_PORT:-5432}"
DEFAULT_COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

DB_NAME="${DEFAULT_DB}"
DB_USER="${DEFAULT_USER}"
DB_HOST="${DEFAULT_HOST}"
DB_PORT="${DEFAULT_PORT}"
COMPOSE_FILE="${DEFAULT_COMPOSE_FILE}"
CONTAINER_NAME=""
BACKUP_FILE=""
FORCE=false
SKIP_SAFETY_BACKUP=false
MODE="auto" # auto | docker-compose | docker-exec | direct

# ------------------------------------------------------------------------------
# Usage & Help
# ------------------------------------------------------------------------------
show_help() {
    cat << 'EOF'
OpenBar Database Restore Utility

Usage:
  ./scripts/restore-db.sh -f <backup_file> [options]

Options:
  -f, --file <path>          Path to backup file (.sql.gz or .sql) [REQUIRED]
  -d, --db <name>            Target database name (default: openbar)
  -u, --user <username>      Database username (default: openbar)
  -h, --host <hostname>      Database host (default: localhost)
  -p, --port <port>          Database port (default: 5432)
  -c, --container <name>     Direct Docker container name to execute psql in
      --compose-file <file>  Docker Compose file (default: docker-compose.prod.yml)
      --mode <mode>          Execution mode: auto | docker-compose | docker-exec | direct
  -y, --yes, --force         Skip confirmation prompt
      --no-safety-backup     Skip automatic pre-restore safety backup
      --help                 Show this help message

Examples:
  ./scripts/restore-db.sh -f ./backups/openbar_backup_2026-08-29_030000.sql.gz
  ./scripts/restore-db.sh -f ./backups/snapshot.sql.gz --yes
  ./scripts/restore-db.sh -f ./backups/snapshot.sql.gz --mode docker-compose --db openbar
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
        -f|--file)
            BACKUP_FILE="$2"
            shift 2
            ;;
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
        -y|--yes|--force)
            FORCE=true
            shift
            ;;
        --no-safety-backup)
            SKIP_SAFETY_BACKUP=true
            shift
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

# ------------------------------------------------------------------------------
# Pre-Flight Checks
# ------------------------------------------------------------------------------
if [ -z "${BACKUP_FILE}" ]; then
    echo "Error: Missing required backup file argument (-f/--file)." >&2
    show_help
    exit 1
fi

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

if [ ! -s "${BACKUP_FILE}" ]; then
    echo "Error: Backup file is empty: ${BACKUP_FILE}" >&2
    exit 1
fi

# Verify gzip archive integrity if .gz
IS_GZIPPED=false
if [[ "${BACKUP_FILE}" == *.gz ]]; then
    IS_GZIPPED=true
    if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
        echo "Error: Corrupted gzip archive or invalid checksum: ${BACKUP_FILE}" >&2
        exit 1
    fi
fi

START_TIME=$(date +%s)
FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)

echo "================================================================="
echo "   OpenBar Database Restore Utility"
echo "================================================================="
echo "Target DB  : ${DB_NAME}"
echo "User       : ${DB_USER}"
echo "Source File: ${BACKUP_FILE}"
echo "File Size  : ${FILE_SIZE}"
echo "Compressed : ${IS_GZIPPED}"
echo "Mode       : ${MODE}"
echo "Timestamp  : $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "-----------------------------------------------------------------"

# Confirmation prompt
if [ "${FORCE}" != "true" ]; then
    echo "⚠️  WARNING: This operation will OVERWRITE existing data in '${DB_NAME}'!"
    read -r -p "Are you sure you want to proceed with restore? [y/N]: " CONFIRMATION
    case "${CONFIRMATION}" in
        [yY][eE][sS]|[yY])
            echo "Confirmation received. Proceeding with database restore..."
            ;;
        *)
            echo "Database restoration aborted by user."
            exit 0
            ;;
    esac
fi

# ------------------------------------------------------------------------------
# Safety Backup Prior to Restore
# ------------------------------------------------------------------------------
if [ "${SKIP_SAFETY_BACKUP}" != "true" ] && [ -x "${SCRIPT_DIR}/backup-db.sh" ]; then
    echo "Creating pre-restore safety snapshot..."
    SAFETY_FILE="${ROOT_DIR}/backups/pre_restore_safety_${DB_NAME}_$(date +'%Y-%m-%d_%H%M%S').sql.gz"
    "${SCRIPT_DIR}/backup-db.sh" -d "${DB_NAME}" -u "${DB_USER}" -f "${SAFETY_FILE}" --compose-file "${COMPOSE_FILE}" || {
        echo "Warning: Safety backup failed. Continuing with restore at your own risk..." >&2
    }
fi

# ------------------------------------------------------------------------------
# Execution Strategy
# ------------------------------------------------------------------------------
execute_restore() {
    local target_mode="${MODE}"

    # Auto-detect mode if set to 'auto'
    if [ "${target_mode}" = "auto" ]; then
        if [ -f "${COMPOSE_FILE}" ] && docker compose -f "${COMPOSE_FILE}" ps postgres 2>/dev/null | grep -q "postgres"; then
            target_mode="docker-compose"
        elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qE "openbar.*postgres|gestion_cocktail_db|postgres"; then
            target_mode="docker-exec"
        elif command -v psql >/dev/null 2>&1; then
            target_mode="direct"
        else
            target_mode="docker-compose"
        fi
    fi

    echo "Executing restore using mode: ${target_mode}"

    local decompress_cmd="cat"
    if [ "${IS_GZIPPED}" = "true" ]; then
        decompress_cmd="gzip -dc"
    fi

    case "${target_mode}" in
        docker-compose)
            if [ ! -f "${COMPOSE_FILE}" ]; then
                echo "Error: Docker Compose file not found: ${COMPOSE_FILE}" >&2
                return 1
            fi
            # Terminate active client connections to avoid deadlock
            docker compose -f "${COMPOSE_FILE}" exec -T -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres \
                psql -U "${DB_USER}" -d postgres -c \
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

            # Pipe decompressed SQL into target database
            ${decompress_cmd} "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T \
                -e PGPASSWORD="${POSTGRES_PASSWORD}" postgres \
                psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1
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
                psql -U "${DB_USER}" -d postgres -c \
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

            ${decompress_cmd} "${BACKUP_FILE}" | docker exec -i \
                -e PGPASSWORD="${POSTGRES_PASSWORD}" "${target_c}" \
                psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1
            ;;
        direct)
            if ! command -v psql >/dev/null 2>&1; then
                echo "Error: psql utility is not installed on host." >&2
                return 1
            fi
            PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres -c \
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true

            ${decompress_cmd} "${BACKUP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" \
                psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1
            ;;
        *)
            echo "Error: Unsupported mode '${target_mode}'" >&2
            return 1
            ;;
    esac
}

# Perform restore
if execute_restore; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo "-----------------------------------------------------------------"
    echo "✅ Database restore completed successfully!"
    echo "Target DB  : ${DB_NAME}"
    echo "Restored In: ${DURATION}s"
    echo "================================================================="
    exit 0
else
    echo "Error: Failed to restore database from: ${BACKUP_FILE}" >&2
    exit 1
fi
