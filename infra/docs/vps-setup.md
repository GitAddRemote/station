# VPS Setup — Deploy User Hardening

## Overview

The deploy SSH key lives in GitHub Secrets and is used on every deployment. If it were leaked, the attacker should only be able to run deploy-related Docker operations — nothing more. This is achieved with rootless Docker: the deploy user runs their own Docker daemon entirely within their user namespace, with no root socket and no docker group membership. A compromised key cannot escalate to root or affect any other service on the host.

## Approach: rootless Docker

The deploy user's Docker daemon runs unprivileged inside a user namespace. There is no `/var/run/docker.sock` accessible to the deploy user — the socket lives at `/run/user/<uid>/docker.sock` and is owned entirely by that user.

`bootstrap-vps.sh` handles the full setup:

- Installs `uidmap` and `dbus-user-session` prerequisites
- Enables linger so the deploy user's systemd session persists without an active login
- Sets `DOCKER_HOST` and `PATH` in `~deploy/.bashrc`
- Installs rootless Docker via `curl -fsSL https://get.docker.com/rootless | sh` (run as the deploy user)
- Enables and starts the `docker` systemd user service

The deploy scripts (`deploy.sh`, `backup-db.sh`, etc.) call `docker compose` directly — no `sudo` required.

## Pre-check results (recorded 2026-05-07)

| Check                                         | Result                                  |
| --------------------------------------------- | --------------------------------------- |
| `/proc/sys/kernel/unprivileged_userns_clone`  | `1` ✓                                   |
| `newuidmap` installed                         | No — installed via `uidmap` apt package |
| `unshare --user sh -c "echo namespaces work"` | `namespaces work` ✓                     |

## Verification

After running `bootstrap-vps.sh`, SSH in as the deploy user and confirm:

```bash
# Docker daemon is running
systemctl --user status docker

# Docker works without sudo or docker group
docker run hello-world

# No root socket access
ls /var/run/docker.sock   # deploy user should get permission denied
groups                    # should NOT include 'docker'
```

## Security properties

| Capability                     | Before (docker group) | After (rootless) |
| ------------------------------ | --------------------- | ---------------- |
| Run containers                 | ✓                     | ✓                |
| Access root Docker socket      | ✓ (root-equivalent)   | ✗                |
| Escalate to root via Docker    | ✓                     | ✗                |
| Affect other users' containers | ✓                     | ✗                |
| Survive deploy key compromise  | ✗                     | ✓                |

## Reproducing on a fresh VPS

`bootstrap-vps.sh` is fully automated. Prerequisites, linger, rootless install, and service enable/start are all handled. After the script completes, verify with the commands above.

---

## Migrating an existing VPS to rootless Docker

Use these steps when Docker is already running on a VPS (e.g. station-bot is live) and you need to move the deploy user's containers from the root daemon to rootless without data loss. Expected downtime: 2–3 minutes.

### Phase 1 — Install prerequisites (no downtime)

**As root:**

```bash
apt install -y uidmap dbus-user-session
loginctl enable-linger deploy
```

### Phase 2 — Install rootless Docker (no downtime)

**As deploy (new SSH session):**

```bash
curl -fsSL https://get.docker.com/rootless | sh
```

### Phase 3 — Dump postgres data (no downtime)

**As deploy — do NOT source .bashrc yet, commands must reach the root daemon:**

```bash
set -a; source /opt/station-bot/.env.production; set +a
docker exec station-bot-postgres pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" > /tmp/station_bot_backup.sql
echo "Dump size: $(wc -c < /tmp/station_bot_backup.sql) bytes"
```

### Phase 4 — Cut over to rootless (downtime starts)

**As deploy:**

```bash
# Bring down root-daemon containers
cd /opt/station-bot
docker compose -f docker-compose.prod.yml down

# Activate rootless in this session
export PATH=${HOME}/bin:${PATH}
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock

# Enable and start rootless service
systemctl --user enable docker
systemctl --user start docker

# Confirm rootless is active
docker info | grep -i rootless
```

### Phase 5 — Restore data and bring services back up (downtime ends)

**As deploy:**

```bash
# Make DOCKER_HOST permanent
cat >> ~/.bashrc << 'RCEOF'

# rootless docker
export PATH=${HOME}/bin:${PATH}
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
RCEOF

# Start postgres under rootless daemon
cd /opt/station-bot
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for healthy
until docker compose -f docker-compose.prod.yml ps | grep -q "healthy"; do sleep 2; done

# Restore data
docker exec -i station-bot-postgres psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" < /tmp/station_bot_backup.sql

# Start the bot
docker compose -f docker-compose.prod.yml up -d discord-bot

# Verify
docker compose -f docker-compose.prod.yml ps
docker logs station-bot --tail 20
```

### Phase 6 — Remove docker group access (only after confirming services are healthy)

**As root:**

```bash
gpasswd -d deploy docker
```

**As deploy (fresh SSH session to confirm clean environment):**

```bash
docker compose -f /opt/station-bot/docker-compose.prod.yml ps
groups  # docker should not appear
```
