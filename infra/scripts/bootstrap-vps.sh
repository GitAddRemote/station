#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this script as root."
  exit 1
fi

DEPLOY_USER="deploy"
DEPLOY_HOME="/home/${DEPLOY_USER}"
STATION_ROOT="/opt/station"

apt update
apt upgrade -y

apt install -y ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.asc ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo \
  "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin \
  nginx \
  certbot \
  python3-certbot-nginx

systemctl enable --now docker
systemctl enable --now nginx

if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
fi

usermod -aG docker "${DEPLOY_USER}"

install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh"
touch "${DEPLOY_HOME}/.ssh/authorized_keys"
chmod 600 "${DEPLOY_HOME}/.ssh/authorized_keys"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh/authorized_keys"

if [ -n "${DEPLOY_SSH_PUBLIC_KEY:-}" ]; then
  if ! grep -Fqx "${DEPLOY_SSH_PUBLIC_KEY}" "${DEPLOY_HOME}/.ssh/authorized_keys"; then
    echo "${DEPLOY_SSH_PUBLIC_KEY}" >> "${DEPLOY_HOME}/.ssh/authorized_keys"
    chown "${DEPLOY_USER}:${DEPLOY_USER}" "${DEPLOY_HOME}/.ssh/authorized_keys"
  fi
else
  echo "DEPLOY_SSH_PUBLIC_KEY is not set. Add the deploy key to ${DEPLOY_HOME}/.ssh/authorized_keys manually."
fi

install -d -m 755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${STATION_ROOT}"
install -d -m 755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${STATION_ROOT}/logs"

bash "$(dirname "$0")/setup-swap.sh"

echo
echo "Bootstrap complete."
echo "- Install Nginx configs from infra/nginx/ into /etc/nginx/sites-available/"
echo "- Enable the sites and reload Nginx."
echo "- Run infra/scripts/issue-certs.sh once DNS is live."
echo "- Confirm the deploy user can SSH and run Docker commands without sudo."
