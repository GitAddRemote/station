#!/bin/bash
set -euo pipefail

cd /opt/station
docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml up -d
docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml ps
