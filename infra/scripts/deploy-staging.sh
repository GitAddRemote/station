#!/bin/bash
set -euo pipefail

cd /opt/station
docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml pull
docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml up -d --no-deps backend frontend
docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml ps
