#!/bin/bash
set -euo pipefail

cd /opt/station
docker compose --env-file .env.staging -f docker-compose.staging.yml pull
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d --no-deps backend frontend
docker compose --env-file .env.staging -f docker-compose.staging.yml ps
