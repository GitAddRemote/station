#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root."
  exit 1
fi

if swapon --show | grep -q '^/swapfile'; then
  echo "/swapfile is already active."
  exit 0
fi

if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi

swapon /swapfile

if ! grep -q '^/swapfile none swap sw 0 0$' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "Swap is active:"
swapon --show
