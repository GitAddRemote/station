#!/bin/bash

###############################################################################
# Post-Migration Health Check Script
###############################################################################
#
# Description:
#   Validates database state after migration execution
#
# Usage:
#   ./src/database/scripts/health-check.sh [migration-name]
#
# Arguments:
#   migration-name - Optional: specific migration to validate
#
# Exit Codes:
#   0 - All checks passed
#   1 - One or more checks failed
#
###############################################################################

set -u
set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Load environment
ENV_FILE="${PROJECT_ROOT}/.env"
if [ -f "${ENV_FILE}" ]; then
    while IFS='=' read -r key value; do
        [[ -z "$key" || "$key" =~ ^#.* ]] && continue
        value="${value%\"}"
        value="${value#\"}"
        export "$key=$value"
    done < "${ENV_FILE}"
fi

# Database connection
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-stationDb}"
DB_USER="${DATABASE_USER:-stationDbUser}"
DB_PASSWORD="${DATABASE_PASSWORD}"

# Check counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

###############################################################################
# Functions
###############################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           Database Health Check                               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_check() {
    echo -e "${BLUE}▶${NC} Checking: $1"
}

pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

warn() {
    echo -e "  ${YELLOW}⚠${NC}  $1"
    ((WARNINGS++))
}

run_query() {
    export PGPASSWORD="${DB_PASSWORD}"
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -A -c "$1" 2>/dev/null || echo ""
}

check_connection() {
    print_check "Database connection"

    export PGPASSWORD="${DB_PASSWORD}"

    if pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" > /dev/null 2>&1; then
        pass "Database is accessible at ${DB_HOST}:${DB_PORT}"
        return 0
    else
        fail "Cannot connect to database"
        return 1
    fi
}

check_required_tables() {
    print_check "Required tables exist"

    # Core tables that should always exist
    REQUIRED_TABLES=(
        "user"
        "role"
        "organization"
        "user_organization_role"
        "refresh_tokens"
        "audit_log"
    )

    local all_exist=true

    for table in "${REQUIRED_TABLES[@]}"; do
        RESULT=$(run_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}')")

        if [ "${RESULT}" = "t" ]; then
            pass "Table '${table}' exists"
        else
            fail "Table '${table}' is missing"
            all_exist=false
        fi
    done

    return 0
}

check_foreign_keys() {
    print_check "Foreign key constraints"

    INVALID_FKS=$(run_query "
        SELECT COUNT(*)
        FROM pg_constraint
        WHERE contype = 'f'
        AND confrelid IS NULL
    ")

    if [ "${INVALID_FKS}" = "0" ]; then
        pass "All foreign key constraints are valid"
    else
        fail "Found ${INVALID_FKS} invalid foreign key constraint(s)"
    fi
}

check_indexes() {
    print_check "Database indexes"

    INDEX_COUNT=$(run_query "
        SELECT COUNT(*)
        FROM pg_indexes
        WHERE schemaname = 'public'
    ")

    if [ -n "${INDEX_COUNT}" ] && [ "${INDEX_COUNT}" -gt 0 ]; then
        pass "Found ${INDEX_COUNT} index(es)"
    else
        warn "No indexes found (may impact performance)"
    fi
}

check_migrations() {
    print_check "Migration history"

    MIGRATIONS_TABLE_EXISTS=$(run_query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migrations')")

    if [ "${MIGRATIONS_TABLE_EXISTS}" = "t" ]; then
        MIGRATION_COUNT=$(run_query "SELECT COUNT(*) FROM migrations")
        pass "Migrations table exists with ${MIGRATION_COUNT} record(s)"
    else
        warn "Migrations table not found (using TypeORM synchronize?)"
    fi
}

check_data_integrity() {
    print_check "Data integrity"

    # Check for orphaned records (examples)

    # Check for users without roles
    USERS_WITHOUT_ROLES=$(run_query "
        SELECT COUNT(*)
        FROM \"user\" u
        LEFT JOIN user_organization_roles uor ON u.id = uor.userId
        WHERE uor.id IS NULL
    " || echo "0")

    if [ "${USERS_WITHOUT_ROLES}" = "0" ]; then
        pass "No users without organization roles"
    else
        warn "${USERS_WITHOUT_ROLES} user(s) without organization roles"
    fi
}

check_performance() {
    print_check "Query performance (sample)"

    START_TIME=$(date +%s%N)
    run_query "SELECT COUNT(*) FROM \"user\"" > /dev/null
    END_TIME=$(date +%s%N)

    DURATION=$(( (END_TIME - START_TIME) / 1000000 ))  # Convert to milliseconds

    if [ "${DURATION}" -lt 100 ]; then
        pass "Simple query executed in ${DURATION}ms"
    elif [ "${DURATION}" -lt 1000 ]; then
        warn "Simple query took ${DURATION}ms (acceptable but slow)"
    else
        fail "Simple query took ${DURATION}ms (performance issue)"
    fi
}

check_database_size() {
    print_check "Database size"

    DB_SIZE=$(run_query "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'))")

    if [ -n "${DB_SIZE}" ]; then
        pass "Database size: ${DB_SIZE}"
    else
        warn "Could not determine database size"
    fi
}

print_summary() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  Health Check Summary                                         ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${GREEN}Passed:${NC}   ${CHECKS_PASSED}"
    echo -e "  ${RED}Failed:${NC}   ${CHECKS_FAILED}"
    echo -e "  ${YELLOW}Warnings:${NC} ${WARNINGS}"
    echo ""

    if [ "${CHECKS_FAILED}" -eq 0 ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  All critical checks passed!                                  ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"

        if [ "${WARNINGS}" -gt 0 ]; then
            echo -e "${YELLOW}Note: ${WARNINGS} warning(s) detected. Review above for details.${NC}"
        fi

        return 0
    else
        echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  Health check failed! Database may not be stable.             ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
        echo -e "${RED}Consider rolling back the migration if issues persist.${NC}"
        return 1
    fi
}

###############################################################################
# Main execution
###############################################################################

main() {
    print_header

    echo "Database: ${DB_NAME}"
    echo "Host: ${DB_HOST}:${DB_PORT}"
    echo ""

    check_connection || exit 1
    check_required_tables
    check_foreign_keys
    check_indexes
    check_migrations
    check_data_integrity
    check_performance
    check_database_size

    print_summary
    exit $?
}

# Run main function
main "$@"
