#!/bin/bash
set -euo pipefail

cd /opt/station
sudo docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml pull
sudo docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml up -d --no-deps backend frontend
sudo docker compose --project-name station-staging --env-file .env.staging -f docker-compose.staging.yml ps
