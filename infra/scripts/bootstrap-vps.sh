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

apt install -y ca-certificates curl gnupg lsb-release cron logrotate rclone uidmap dbus-user-session

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
systemctl enable --now cron

if ! id -u "${DEPLOY_USER}" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
fi

# Rootless Docker: install and configure for the deploy user.
# The deploy user runs their own Docker daemon with no access to the root
# Docker socket (which still exists at /var/run/docker.sock for system use),
# no docker group membership, and no sudo required. A leaked deploy SSH key
# cannot escalate to root or access other users' containers via Docker.
loginctl enable-linger "${DEPLOY_USER}"

# Set DOCKER_HOST and PATH in the deploy user's shell so rootless Docker is
# used automatically on interactive/login SSH sessions. Non-interactive shells
# (cron, CI) must set DOCKER_HOST themselves — the deploy/backup scripts do this.
BASHRC="${DEPLOY_HOME}/.bashrc"
if ! grep -q 'rootless docker' "${BASHRC}" 2>/dev/null; then
  cat >> "${BASHRC}" << 'RCEOF'

# rootless docker
export PATH=${HOME}/bin:${PATH}
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
RCEOF
fi
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${BASHRC}"

# Ubuntu 24.04+ restricts unprivileged user namespaces via AppArmor; rootlesskit
# requires an explicit profile to create user namespaces.
APPARMOR_RESTRICT="/proc/sys/kernel/apparmor_restrict_unprivileged_userns"
if [ -f "${APPARMOR_RESTRICT}" ] && [ "$(cat "${APPARMOR_RESTRICT}")" = "1" ]; then
  PROFILE_SLUG="$(echo "${DEPLOY_HOME}/bin/rootlesskit" | sed 's|^/||; s|/|.|g')"
  ROOTLESSKIT_PROFILE="/etc/apparmor.d/${PROFILE_SLUG}"
  if [ ! -f "${ROOTLESSKIT_PROFILE}" ]; then
    cat > "${ROOTLESSKIT_PROFILE}" << AAEOF
# ref: https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces
abi <abi/4.0>,
include <tunables/global>

${DEPLOY_HOME}/bin/rootlesskit flags=(unconfined) {
  userns,

  # Site-specific additions and overrides. See local/README for details.
  include if exists <local/${PROFILE_SLUG}>
}
AAEOF
    systemctl restart apparmor.service
  fi
fi

# Install rootless Docker as the deploy user.
runuser -l "${DEPLOY_USER}" -c "curl -fsSL https://get.docker.com/rootless | sh"

# Enable and start the rootless Docker service for the deploy user.
runuser -l "${DEPLOY_USER}" -c "systemctl --user enable docker && systemctl --user start docker"

# Remove the deploy user from the docker group if they were added by a
# previous bootstrap run (rootless Docker requires no group membership).
gpasswd -d "${DEPLOY_USER}" docker 2>/dev/null || true

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

BACKUP_CRON='0 3 * * * cd /opt/station && bash infra/scripts/backup-db.sh >> /opt/station/logs/backup.log 2>&1'
(
  crontab -u "${DEPLOY_USER}" -l 2>/dev/null | grep -Fv 'infra/scripts/backup-db.sh' || true
  echo "${BACKUP_CRON}"
) | crontab -u "${DEPLOY_USER}" -

if [ -f "$(dirname "$0")/../logrotate/station-backup" ]; then
  install -m 644 "$(dirname "$0")/../logrotate/station-backup" /etc/logrotate.d/station-backup
fi

echo
echo "Bootstrap complete."
echo "- Install Nginx configs from infra/nginx/ into /etc/nginx/sites-available/"
echo "- Enable the sites and reload Nginx."
echo "- Run infra/scripts/issue-certs.sh once DNS is live."
echo "- Confirm rootless Docker: ssh deploy@host 'docker run hello-world'"
echo "- Confirm systemctl: ssh deploy@host 'systemctl --user status docker'"
echo "- Configure B2 secrets and verify /opt/station/rclone.conf is written during deploy."
