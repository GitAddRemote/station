#!/bin/bash
set -euo pipefail

cd /opt/station
docker compose --env-file .env.staging -f docker-compose.staging.yml down
