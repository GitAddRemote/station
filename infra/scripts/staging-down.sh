#!/bin/bash
set -euo pipefail

STATION_ROOT="/opt/station"

docker compose --project-name station-staging --env-file "${STATION_ROOT}/.env.staging" -f "${STATION_ROOT}/docker-compose.staging.yml" down
