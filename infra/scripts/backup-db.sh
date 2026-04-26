#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATION_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${STATION_ROOT}/.env.production"
COMPOSE_FILE="${STATION_ROOT}/docker-compose.prod.yml"
RCLONE_CONFIG_FILE="${STATION_ROOT}/rclone.conf"
LOG_PREFIX="[backup]"

if [ ! -f "${ENV_FILE}" ]; then
  echo "${LOG_PREFIX} Missing ${ENV_FILE}" >&2
  exit 1
fi

if [ ! -f "${RCLONE_CONFIG_FILE}" ]; then
  echo "${LOG_PREFIX} Missing ${RCLONE_CONFIG_FILE}" >&2
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${B2_BUCKET:?B2_BUCKET is required}"

LABEL="${1:-${BACKUP_LABEL:-nightly}}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="/tmp/station_backup_${TIMESTAMP}_${LABEL}.sql.gz"
REMOTE_PATH="postgres/${TIMESTAMP:0:6}/${TIMESTAMP}_${LABEL}.sql.gz"

export RCLONE_CONFIG="${RCLONE_CONFIG_FILE}"

echo "${LOG_PREFIX} Starting backup at ${TIMESTAMP} (${LABEL})"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${DATABASE_USER}" -d "${DATABASE_NAME}" \
  | gzip > "${BACKUP_FILE}"

echo "${LOG_PREFIX} Created ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

rclone copyto "${BACKUP_FILE}" "b2:${B2_BUCKET}/${REMOTE_PATH}" \
  --b2-chunk-size 96M

echo "${LOG_PREFIX} Uploaded to b2:${B2_BUCKET}/${REMOTE_PATH}"

rm -f "${BACKUP_FILE}"
echo "${LOG_PREFIX} Complete"
