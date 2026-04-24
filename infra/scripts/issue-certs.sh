#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root."
  exit 1
fi

certbot --nginx \
  -d api.drdnt.org \
  -d station.drdnt.org \
  -d bot.drdnt.org

certbot renew --dry-run
