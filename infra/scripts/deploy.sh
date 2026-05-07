#!/bin/bash
set -euo pipefail

STATION_ROOT="/opt/station"

docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" pull
docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" up -d --no-deps backend frontend
docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" ps
