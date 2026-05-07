#!/bin/bash
set -euo pipefail

cd /opt/station
sudo docker compose --env-file .env.production -f docker-compose.prod.yml pull
sudo docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-deps backend frontend
sudo docker compose --env-file .env.production -f docker-compose.prod.yml ps
