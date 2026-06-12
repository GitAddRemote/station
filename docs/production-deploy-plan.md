# Production Deployment Plan

## Target Architecture

```
/opt/station/               ← Station repo clone + ALL shared infrastructure
  docker-compose.prod.yml   ← postgres, redis, backend, frontend, loki, grafana, promtail
  .env.production
  rclone.conf
  infra/scripts/

/opt/station-bot/           ← Bot repo clone (application only)
  docker-compose.prod.yml   ← discord-bot only, joins station network as external
  .env.production
  logs/
```

Station owns all shared services. The bot is a tenant — it deploys independently but connects to Station's Postgres and Redis via the shared Docker network. Each application's compose can be updated and redeployed without touching the other.

---

## Shared Infrastructure (Station-owned)

| Service  | Purpose                            | Port (host-local) |
| -------- | ---------------------------------- | ----------------- |
| postgres | Shared database for all apps       | (internal only)   |
| redis    | Shared cache/session store         | (internal only)   |
| backend  | NestJS API                         | 127.0.0.1:3001    |
| frontend | React SPA                          | 127.0.0.1:3000    |
| loki     | Log aggregation                    | 127.0.0.1:3100    |
| promtail | Log shipper (reads Docker sockets) | (internal only)   |
| grafana  | Metrics/log dashboards             | 127.0.0.1:3010    |

Bot service (separate compose, same network):

| Service     | Purpose         | Port (host-local) |
| ----------- | --------------- | ----------------- |
| discord-bot | Station Bot app | (internal only)   |

---

## Docker Network

A single bridge network named `station` is declared in Station's compose. The bot's compose references it as `external: true`. All containers resolve each other by service name (e.g., the bot connects to Postgres at host `postgres`).

---

## Domain & Nginx Layout

| Domain                      | Routes to                         | Notes                     |
| --------------------------- | --------------------------------- | ------------------------- |
| `drdnt.org`                 | frontend (127.0.0.1:3000)         | Apex domain → Station SPA |
| `api.drdnt.org`             | backend (127.0.0.1:3001)          | REST API                  |
| `bot.drdnt.org`             | (placeholder / future)            | Reserved, currently 3999  |
| `grafana.drdnt.org`         | grafana (127.0.0.1:3010)          | Monitoring dashboard      |
| `staging.station.drdnt.org` | staging frontend (127.0.0.1:3003) | Staging SPA               |
| `staging.api.drdnt.org`     | staging backend (127.0.0.1:3002)  | Staging API               |

DNS is managed at Namecheap (not Terraform/Linode DNS). All records are `A` records pointing to the Linode VPS IP. Certbot (Let's Encrypt) handles TLS — nginx configs start as HTTP and are updated by Certbot in place.

---

## GHCR Image Names (post Presstronic transfer)

```
ghcr.io/presstronic/station-backend
ghcr.io/presstronic/station-frontend
ghcr.io/presstronic/station-bot
```

---

## Code Changes Required (before first deploy)

1. **`docker-compose.prod.yml` (Station)** — update image names from `gitaddremote` to `presstronic`, add explicit `station` network to all services, declare the network at the bottom.
2. **`docker-compose.prod.yml` (Station-bot)** — remove `postgres` service, remove `bot-network`, replace with external `station` network. Update `DATABASE_URL` host to still use `postgres` (same service name, works because they share the network).
3. **Nginx** — add `drdnt.org` apex config pointing to the frontend container. Update `station.drdnt.org.conf` if needed (may be retired in favor of apex).
4. **`.github/workflows/release.yml`** — update `BACKEND_IMAGE` and `FRONTEND_IMAGE` env vars to `ghcr.io/presstronic/...`.
5. **`infra/scripts/deploy.sh`** — currently only handles Station services. Will need to remain Station-only; the bot has its own separate deploy.

---

## Postgres Migration Plan (one-time, ~5 min downtime)

The bot currently runs `station-bot-postgres` with data in a Docker named volume `station-bot_postgres-data`. We need to move ownership to Station's compose.

Steps (to be executed on VPS):

1. Take a `pg_dump` from the running bot Postgres container — safety net.
2. Stop `discord-bot` container (Postgres can stay up during dump).
3. `pg_dump` from `station-bot-postgres` into a file.
4. Bring up Station's `postgres` service (new container, empty volume).
5. `pg_restore` / `psql` the dump into Station's Postgres.
6. Create the Station application database and user inside the same Postgres instance.
7. Update the bot's `.env.production` so `DATABASE_URL` points to `postgres` (same hostname — no change needed since both composes share the `station` network and the service is still named `postgres`).
8. Remove the old `station-bot-postgres` container and `station-bot_postgres-data` volume after verifying the bot is healthy on the new instance.

---

## Manual First-Deploy Sequence (before CD is wired up)

This is the ordered sequence for the very first Station deployment. CD automation comes after this works manually.

### Phase 0 — Pre-flight (local machine)

1. Transfer GitHub repo ownership from `GitAddRemote` to `Presstronic`.
2. Update `BACKEND_IMAGE` / `FRONTEND_IMAGE` in `release.yml` and image refs in `docker-compose.prod.yml` to `ghcr.io/presstronic/...`.
3. Update Station-bot `docker-compose.prod.yml` to remove its `postgres` service and join the `station` external network.
4. Add apex domain nginx config (`drdnt.org`).
5. Commit and push all of the above to `main`.

### Phase 1 — DNS (Namecheap)

Add the following `A` records pointing to your Linode VPS IP:

| Host              | Type | Value      |
| ----------------- | ---- | ---------- |
| `@`               | A    | `<VPS IP>` |
| `api`             | A    | `<VPS IP>` |
| `bot`             | A    | `<VPS IP>` |
| `grafana`         | A    | `<VPS IP>` |
| `staging.station` | A    | `<VPS IP>` |
| `staging.api`     | A    | `<VPS IP>` |

Allow up to 30 minutes to propagate. Verify with: `dig +short api.drdnt.org`

### Phase 2 — VPS setup verification

SSH in as `deploy` and run these to confirm current state:

```bash
# Verify SSH password auth is disabled
sudo sshd -T | grep -E "passwordauthentication|permitrootlogin|pubkeyauthentication"

# Confirm rootless Docker is healthy
systemctl --user status docker

# Confirm what's running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Confirm nginx is installed and running
sudo systemctl status nginx

# Check if certbot is available
certbot --version
```

### Phase 3 — Clone Station repo & create env file

```bash
# As deploy user
cd /opt
git clone https://github.com/Presstronic/station.git station
cd /opt/station

# Create .env.production from example — fill in all values
cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
```

### Phase 4 — Postgres migration (bot → Station)

```bash
# Dump the bot's existing database (bot can keep running during this)
docker exec station-bot-postgres pg_dump \
  -U station_bot -d station_bot \
  > /tmp/station_bot_backup_$(date +%Y%m%d_%H%M%S).sql

# Stop the bot (not Postgres yet)
cd /opt/station-bot
docker compose -f docker-compose.prod.yml stop discord-bot

# Bring up Station's Postgres
cd /opt/station
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
# Wait for healthy:
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# Create the bot's database and user inside Station's Postgres
# (Station's own DB is created automatically by POSTGRES_DB env var)
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U <DATABASE_USER> -c "CREATE USER station_bot WITH PASSWORD '<bot_pg_password>';"
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U <DATABASE_USER> -c "CREATE DATABASE station_bot OWNER station_bot;"

# Restore bot data into new Postgres
cat /tmp/station_bot_backup_*.sql | docker exec -i \
  $(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q postgres) \
  psql -U station_bot -d station_bot

# Run Station's own TypeORM migrations
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm backend node dist/main migration:run
```

### Phase 5 — Install nginx configs and issue TLS certs

```bash
# As root (sudo -i or sudo su)
# Copy all nginx configs
for conf in api.drdnt.org station.drdnt.org bot.drdnt.org grafana.drdnt.org \
            staging.api.drdnt.org staging.station.drdnt.org drdnt.org; do
  cp /opt/station/infra/nginx/${conf}.conf /etc/nginx/sites-available/${conf}
  ln -sf /etc/nginx/sites-available/${conf} /etc/nginx/sites-enabled/${conf}
done

# Test and reload
nginx -t && systemctl reload nginx

# Issue TLS certs (DNS must be propagated first — verify with dig)
certbot --nginx \
  -d drdnt.org \
  -d api.drdnt.org \
  -d bot.drdnt.org \
  -d grafana.drdnt.org \
  -d staging.api.drdnt.org \
  -d staging.station.drdnt.org
```

### Phase 6 — Build Station images (trigger CI)

On local machine:

```bash
git checkout -b release/v0.1.0
git push origin release/v0.1.0
```

This triggers the GitHub Actions release workflow: lint → test → build → push to GHCR. Watch it at: `https://github.com/Presstronic/station/actions`

Once images are pushed to GHCR, the CD steps in the workflow will attempt to deploy — those will fail until the VPS is fully wired up (GitHub Secrets not yet set). That's expected for the first manual run.

### Phase 7 — Pull images and start Station

```bash
# As deploy user on VPS
cd /opt/station
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"

# Authenticate Docker with GHCR
echo <your_github_pat> | docker login ghcr.io -u <github_username> --password-stdin

# Pull all images
docker compose --env-file .env.production -f docker-compose.prod.yml pull

# Start monitoring stack first
docker compose --env-file .env.production -f docker-compose.prod.yml up -d loki grafana promtail

# Start Redis
docker compose --env-file .env.production -f docker-compose.prod.yml up -d redis

# Start backend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend

# Watch logs until healthy
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend

# Start frontend
docker compose --env-file .env.production -f docker-compose.prod.yml up -d frontend
```

### Phase 8 — Reconnect the bot

Update `/opt/station-bot/.env.production` — `DATABASE_URL` host stays `postgres` (same service name on shared network). Then:

```bash
cd /opt/station-bot
docker compose -f docker-compose.prod.yml up -d discord-bot
docker logs station-bot --tail=50
```

### Phase 9 — Verify everything

```bash
# Health checks
curl -f https://api.drdnt.org/health && echo "API OK"
curl -f https://drdnt.org && echo "Frontend OK"

# All containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Clean up old bot Postgres volume (only after confirming bot is healthy for 30+ min)
docker rm station-bot-postgres
docker volume rm station-bot_postgres-data
```

---

## Backblaze B2 Backup Setup

### Verify existing B2 config

```bash
# Check if rclone config exists
ls -la /opt/station-bot/rclone.conf 2>/dev/null || echo "no rclone config found"

# If it exists, verify B2 connectivity
RCLONE_CONFIG=/opt/station-bot/rclone.conf rclone lsd b2:
```

### Set up B2 for Station

Create a dedicated application key in the Backblaze B2 console scoped to a `station-backups` bucket. Then:

```bash
# Create rclone.conf for Station (CD will overwrite this on every deploy)
cat > /opt/station/rclone.conf <<EOF
[b2]
type = b2
account = <B2_ACCOUNT_ID>
key = <B2_APPLICATION_KEY>
hard_delete = false
EOF
chmod 600 /opt/station/rclone.conf

# Test connectivity
RCLONE_CONFIG=/opt/station/rclone.conf rclone lsd b2:station-backups

# Trigger a manual backup to verify end-to-end
cd /opt/station
bash infra/scripts/backup-db.sh manual
```

### Verify nightly cron is scheduled

```bash
# Check deploy user's crontab
crontab -l | grep backup
```

Expected entry (added by bootstrap script):

```
0 3 * * * cd /opt/station && bash infra/scripts/backup-db.sh >> /opt/station/logs/backup.log 2>&1
```

If missing, add it:

```bash
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/station && bash infra/scripts/backup-db.sh >> /opt/station/logs/backup.log 2>&1") | crontab -
```

---

## Security Audit Checklist (deferred — after Station is deployed)

Items to address in a follow-up pass:

- [ ] `deploy` user is in `sudo` group — assess whether this is needed and restrict if not
- [ ] SSH: verify `PasswordAuthentication no` and `PermitRootLogin no` are enforced (`sudo sshd -T | grep -E "passwordauthentication|permitrootlogin"`)
- [ ] UFW/firewall: verify only ports 22, 80, 443 are open (`sudo ufw status verbose`)
- [ ] Postgres: not exposed on any host port (confirm `docker ps` shows no `0.0.0.0:5432` binding)
- [ ] Redis: not exposed on any host port, password-protected
- [ ] Container capabilities: review whether `cap_drop: ALL` should be applied to Station backend/frontend containers (bot already has this)
- [ ] Container filesystems: review `read_only: true` for Station containers
- [ ] Grafana: confirm anonymous access is disabled, admin password is strong
- [ ] Certbot auto-renewal: verify `systemctl status certbot.timer` is active
- [ ] Docker secrets vs env files: assess migrating to Docker secrets for database passwords

---

## Q&A Log

### My questions → Your answers

**Q1: Shared Postgres or separate?**
A: Shared. Station Bot is secondary functionality; Station owns the shared infrastructure. Both apps use the same Postgres instance, same Redis instance. Bot will eventually use Station's tables/APIs directly where it makes sense (inventory, source data, etc.).

**Q2: GHCR org — `presstronic` vs `gitaddremote`?**
A: Presstronic is the correct org going forward. Transfer of Station repo from GitAddRemote to Presstronic is happening today. Station-bot is already at `ghcr.io/presstronic/station-bot`.

**Q3: Is Station Bot currently running from `/opt/station-bot`?**
A: Yes, actively running from that directory.

**Q4: DNS — who manages `drdnt.org`?**
A: Namecheap registrar. DNS records need to be created manually in Namecheap (not via Terraform/Linode DNS). Subdomains needed: `api`, `bot`, `grafana`, `staging.station`, `staging.api`, and the apex `@` record.

**Q5: Does the bot currently use Redis?**
A: No. It may in the future and will share Station's Redis instance when it does.

**Q6: Two migration tools acceptable (node-pg-migrate + TypeORM)?**
A: Yes, acceptable for now. Bot will be migrated to TypeORM in the near future.

**Q7: VPS state — is bootstrap already done?**
A: Mostly yes. Key facts from VPS output:

- Ubuntu 24.04.4 LTS
- Docker 29.4.3, Docker Compose v5.1.0
- Rootless Docker running as `deploy` (UID 1000), healthy since May 17
- Running containers: `station-bot` and `station-bot-postgres` on `station-bot_bot-network`
- `/opt/station-bot/` exists (compose files, certs, logs) — no Station directory yet
- `deploy` user is in `sudo` group (flagged for security audit)

**Q8: Backblaze B2 for backups?**
A: Account exists. Unsure if backups are currently running. Not a blocker for Alpha → Beta milestone, but setup + verification steps are wanted so both apps are properly backed up.

**Q9: Apex domain routing?**
A: `drdnt.org` → Station dashboard (if valid session) or Station login (expired session) or Station landing page (no session). Standard SPA auth routing handled client-side. All served from the same React frontend container.

**Q10: VPS SSH verification command?**
A: `sudo sshd -T | grep -E "passwordauthentication|permitrootlogin|pubkeyauthentication"` — reads the active merged SSHD config, not just the file.

### Your questions → My answers

**Q: Is the plan missing a step?**
A: Plan is solid. Two additions: (1) creating the Station database/user inside the existing Postgres before running migrations; (2) the Postgres migration step to move from the bot's container to Station's container. The full ordered sequence is the "Manual First-Deploy Sequence" section above.

**Q: Shared network security — is putting bot and Station on the same Docker network okay?**
A: Yes. Shared network with no exposed ports between containers is a smaller attack surface than exposing Postgres on a port for cross-network access. The bot can reach `postgres` and `redis` by service name; it cannot reach anything outside the network. Standard production pattern for multi-app monorepo deployments.

**Q: Should Station and Bot be in the same directory or separate?**
A: Separate directories (`/opt/station` and `/opt/station-bot`). Each has its own compose, env file, and logs. Station owns shared infrastructure; bot's compose joins the Station network as `external: true`. Independent deploys, shared services.
