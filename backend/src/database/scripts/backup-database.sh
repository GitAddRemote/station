#!/bin/bash

###############################################################################
# Database Backup Script
###############################################################################
#
# Description:
#   Creates a timestamped backup of the PostgreSQL database before migrations
#
# Usage:
#   ./src/database/scripts/backup-database.sh [environment]
#
# Arguments:
#   environment - Optional: 'dev', 'test', 'prod' (default: from .env)
#
# Examples:
#   ./src/database/scripts/backup-database.sh
#   ./src/database/scripts/backup-database.sh prod
#
# Output:
#   Creates backup in ./backups/ directory with timestamp
#   Verifies backup integrity
#   Keeps last 7 backups (auto-cleanup)
#
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"

# Load environment variables
ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${RED}Error: .env file not found at ${ENV_FILE}${NC}"
    exit 1
fi

# Source environment file carefully
# Use export to avoid issues with unquoted values
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^#.* ]] && continue
    # Remove any quotes from value
    value="${value%\"}"
    value="${value#\"}"
    export "$key=$value"
done < "${ENV_FILE}"

# Override with environment argument if provided
if [ $# -gt 0 ]; then
    case "$1" in
        dev|test|prod)
            ENV_FILE="${PROJECT_ROOT}/.env.$1"
            if [ -f "${ENV_FILE}" ]; then
                set -a
                source "${ENV_FILE}"
                set +a
            fi
            ;;
        *)
            echo -e "${RED}Error: Invalid environment '$1'. Use 'dev', 'test', or 'prod'${NC}"
            exit 1
            ;;
    esac
fi

# Database connection parameters
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-stationDb}"
DB_USER="${DATABASE_USER:-stationDbUser}"
DB_PASSWORD="${DATABASE_PASSWORD}"

# Backup configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${DB_NAME}_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
KEEP_BACKUPS=7  # Number of backups to retain

###############################################################################
# Functions
###############################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           Station Database Backup Script                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

create_backup_directory() {
    print_step "Creating backup directory..."
    mkdir -p "${BACKUP_DIR}"
    print_success "Backup directory ready: ${BACKUP_DIR}"
}

check_database_connection() {
    print_step "Checking database connection..."

    export PGPASSWORD="${DB_PASSWORD}"

    if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; then
        print_success "Database is accessible"
    else
        print_error "Cannot connect to database at ${DB_HOST}:${DB_PORT}"
        print_warning "Make sure the database container is running: docker-compose up -d database"
        exit 1
    fi
}

create_backup() {
    print_step "Creating database backup..."

    export PGPASSWORD="${DB_PASSWORD}"

    # Create backup with pg_dump
    if pg_dump -h "${DB_HOST}" \
               -p "${DB_PORT}" \
               -U "${DB_USER}" \
               -d "${DB_NAME}" \
               -F p \
               --no-owner \
               --no-acl \
               -f "${BACKUP_PATH}"; then
        print_success "Backup created: ${BACKUP_FILENAME}"
    else
        print_error "Backup creation failed"
        exit 1
    fi

    unset PGPASSWORD
}

verify_backup() {
    print_step "Verifying backup integrity..."

    # Check if file exists and has content
    if [ ! -f "${BACKUP_PATH}" ]; then
        print_error "Backup file not found: ${BACKUP_PATH}"
        exit 1
    fi

    # Check file size (should be > 0)
    BACKUP_SIZE=$(stat -f%z "${BACKUP_PATH}" 2>/dev/null || stat -c%s "${BACKUP_PATH}" 2>/dev/null)

    if [ "${BACKUP_SIZE}" -eq 0 ]; then
        print_error "Backup file is empty"
        exit 1
    fi

    # Check if file is valid SQL
    if head -n 5 "${BACKUP_PATH}" | grep -q "PostgreSQL"; then
        print_success "Backup file is valid (${BACKUP_SIZE} bytes)"
    else
        print_warning "Backup file may not be a valid PostgreSQL dump"
    fi

    # Display human-readable size
    if command -v numfmt > /dev/null 2>&1; then
        HUMAN_SIZE=$(numfmt --to=iec-i --suffix=B "${BACKUP_SIZE}")
    else
        HUMAN_SIZE="${BACKUP_SIZE} bytes"
    fi

    echo "  Size: ${HUMAN_SIZE}"
}

cleanup_old_backups() {
    print_step "Cleaning up old backups (keeping last ${KEEP_BACKUPS})..."

    # Count existing backups
    BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql" 2>/dev/null | wc -l | tr -d ' ')

    if [ "${BACKUP_COUNT}" -gt "${KEEP_BACKUPS}" ]; then
        # Delete oldest backups beyond retention limit
        find "${BACKUP_DIR}" -name "${DB_NAME}_backup_*.sql" -type f -print0 \
            | xargs -0 ls -t \
            | tail -n +$((KEEP_BACKUPS + 1)) \
            | xargs rm -f

        DELETED=$((BACKUP_COUNT - KEEP_BACKUPS))
        print_success "Removed ${DELETED} old backup(s)"
    else
        print_success "No cleanup needed (${BACKUP_COUNT} backups)"
    fi
}

print_restore_instructions() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  To restore this backup, run:                                 ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${YELLOW}export PGPASSWORD='${DB_PASSWORD}'${NC}"
    echo -e "  ${YELLOW}psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} < ${BACKUP_PATH}${NC}"
    echo ""
    echo -e "${BLUE}  Or use the restore script:${NC}"
    echo -e "  ${YELLOW}./src/database/scripts/restore-database.sh ${BACKUP_FILENAME}${NC}"
    echo ""
}

###############################################################################
# Main execution
###############################################################################

main() {
    print_header

    echo "Database: ${DB_NAME}"
    echo "Host: ${DB_HOST}:${DB_PORT}"
    echo "User: ${DB_USER}"
    echo ""

    create_backup_directory
    check_database_connection
    create_backup
    verify_backup
    cleanup_old_backups
    print_restore_instructions

    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  Backup completed successfully!                               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    exit 0
}

# Run main function
main "$@"
