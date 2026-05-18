#!/bin/bash
set -euo pipefail

STATION_ROOT="/opt/station"
DOCKER_HOST="${DOCKER_HOST:-unix:///run/user/$(id -u)/docker.sock}"
export DOCKER_HOST

docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" pull
docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" up -d loki grafana promtail
docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" up -d --no-deps backend frontend
docker compose --env-file "${STATION_ROOT}/.env.production" -f "${STATION_ROOT}/docker-compose.prod.yml" ps
