# VPS Setup — Deploy User Hardening

## Overview

The deploy SSH key lives in GitHub Secrets and is used on every deployment. If it were leaked, the attacker should only be able to run deploy-related Docker commands — nothing else. This document covers how the deploy user's Docker access is constrained.

The deploy scripts use `sudo docker compose` / `sudo docker exec`. The sudoers file at `/etc/sudoers.d/deploy-docker` permits only those two subcommands and nothing else. The deploy user is **not** in the `docker` group — group membership grants unrestricted access to the Docker socket, which is root-equivalent.

## Current approach: narrowed sudoers (Option B)

`bootstrap-vps.sh` writes `/etc/sudoers.d/deploy-docker`:

```
deploy ALL=(ALL) NOPASSWD: /usr/bin/docker compose *
deploy ALL=(ALL) NOPASSWD: /usr/bin/docker exec *
```

**What this allows:**

- `sudo docker compose ...` — all compose operations (pull, up, down, ps, exec, stop, start)
- `sudo docker exec ...` — direct exec into containers (used by backup/restore scripts)

**What this blocks:**

- `docker run`, `docker rm`, `docker network rm`, `docker system prune`, and everything else
- Any direct access to the Docker socket (`/var/run/docker.sock`)

### Verification

```bash
# As the deploy user — should succeed:
sudo docker compose -f /opt/station/docker-compose.prod.yml ps

# As the deploy user — should be denied:
sudo apt install anything
sudo rm -rf /opt
docker ps   # no docker group, no socket access
```

---

## Preferred upgrade: rootless Docker (Option A)

If the VPS kernel supports user namespaces, rootless Docker is the cleaner solution — the Docker daemon itself runs as the deploy user, so no root socket exists at all.

### Pre-check

SSH in as the deploy user and run:

```bash
curl -fsSL https://get.docker.com/rootless | sh --dry-run
```

If the output is clean, proceed. If it reports missing `newuidmap` or kernel namespace support, stay on Option B.

### Installation (as the deploy user)

```bash
curl -fsSL https://get.docker.com/rootless | sh

echo 'export PATH=/home/deploy/bin:$PATH' >> ~/.bashrc
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock' >> ~/.bashrc
source ~/.bashrc

loginctl enable-linger deploy
systemctl --user enable docker
systemctl --user start docker

docker run hello-world
```

### After switching to rootless

1. Remove the sudoers file: `sudo rm /etc/sudoers.d/deploy-docker`
2. Strip the `sudo` prefix from all deploy scripts (`deploy.sh`, `deploy-staging.sh`, `backup-db.sh`, `restore-db.sh`, `staging-up.sh`, `staging-down.sh`)
3. Update `bootstrap-vps.sh` to replace the sudoers block with the rootless install steps
4. Re-run `loginctl enable-linger deploy` and `systemctl --user enable docker` to survive reboots

### Verification

```bash
systemctl --user status docker   # should show active (running)
docker run hello-world           # should succeed without sudo
```
