#!/bin/bash
set -euo pipefail

STATION_ROOT="/opt/station"
DOCKER_HOST="${DOCKER_HOST:-unix:///run/user/$(id -u)/docker.sock}"
export DOCKER_HOST

docker compose --project-name station-staging --env-file "${STATION_ROOT}/.env.staging" -f "${STATION_ROOT}/docker-compose.staging.yml" pull
docker compose --project-name station-staging --env-file "${STATION_ROOT}/.env.staging" -f "${STATION_ROOT}/docker-compose.staging.yml" up -d --no-deps backend frontend
docker compose --project-name station-staging --env-file "${STATION_ROOT}/.env.staging" -f "${STATION_ROOT}/docker-compose.staging.yml" ps
