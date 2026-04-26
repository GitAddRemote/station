#!/bin/bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <b2-path-to-backup>" >&2
  echo "Example: $0 postgres/202605/20260510_030000_nightly.sql.gz" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATION_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${STATION_ROOT}/.env.production"
COMPOSE_FILE="${STATION_ROOT}/docker-compose.prod.yml"
RCLONE_CONFIG_FILE="${STATION_ROOT}/rclone.conf"
LOG_PREFIX="[restore]"
BACKUP_PATH="$1"
LOCAL_FILE="/tmp/restore_$(date +%s).sql.gz"

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

export RCLONE_CONFIG="${RCLONE_CONFIG_FILE}"

echo "${LOG_PREFIX} Downloading ${BACKUP_PATH} from b2:${B2_BUCKET}"
rclone copyto "b2:${B2_BUCKET}/${BACKUP_PATH}" "${LOCAL_FILE}" \
  --b2-chunk-size 96M

echo "${LOG_PREFIX} WARNING: backend writes will be stopped during restore"
echo "${LOG_PREFIX} Starting in 5 seconds. Press Ctrl+C to abort."
sleep 5

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" stop backend
gunzip -c "${LOCAL_FILE}" | docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" start backend

rm -f "${LOCAL_FILE}"
echo "${LOG_PREFIX} Restore complete"
