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
DOCKER_HOST="${DOCKER_HOST:-unix:///run/user/$(id -u)/docker.sock}"
export DOCKER_HOST

if [ ! -f "${ENV_FILE}" ]; then
  echo "${LOG_PREFIX} Missing ${ENV_FILE}" >&2
  exit 1
fi

if [ ! -f "${RCLONE_CONFIG_FILE}" ]; then
  echo "${LOG_PREFIX} Missing ${RCLONE_CONFIG_FILE}" >&2
  exit 1
fi

DATABASE_USER="$(grep '^DATABASE_USER=' "${ENV_FILE}" | cut -d= -f2- || true)"
DATABASE_NAME="$(grep '^DATABASE_NAME=' "${ENV_FILE}" | cut -d= -f2- || true)"
B2_BUCKET="$(grep '^B2_BUCKET=' "${ENV_FILE}" | cut -d= -f2- || true)"

: "${DATABASE_USER:?DATABASE_USER is required}"
: "${DATABASE_NAME:?DATABASE_NAME is required}"
: "${B2_BUCKET:?B2_BUCKET is required}"

export RCLONE_CONFIG="${RCLONE_CONFIG_FILE}"
BACKEND_STOPPED=0
cleanup() {
  rm -f "${LOCAL_FILE}"
  if [ "${BACKEND_STOPPED}" -eq 1 ]; then
    echo "${LOG_PREFIX} Ensuring backend is started after exit..." >&2
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" start backend || true
  fi
}
trap cleanup EXIT

echo "${LOG_PREFIX} Downloading ${BACKUP_PATH} from b2:${B2_BUCKET}"
rclone copyto "b2:${B2_BUCKET}/${BACKUP_PATH}" "${LOCAL_FILE}" \
  --b2-chunk-size 96M

echo "${LOG_PREFIX} WARNING: backend writes will be stopped during restore"
echo "${LOG_PREFIX} WARNING: this restore replays the SQL dump into the existing database."
echo "${LOG_PREFIX} WARNING: if you need a clean replacement, drop and recreate the target database first."
echo "${LOG_PREFIX} Starting in 5 seconds. Press Ctrl+C to abort."
sleep 5

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" stop backend
BACKEND_STOPPED=1
gunzip -c "${LOCAL_FILE}" | docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" start backend
BACKEND_STOPPED=0

echo "${LOG_PREFIX} Restore complete"
