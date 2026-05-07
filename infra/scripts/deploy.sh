#!/bin/bash
set -euo pipefail

cd /opt/station
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml ps
