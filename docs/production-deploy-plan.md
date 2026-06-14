# Production Deployment Plan

## Target Architecture

```
/opt/station/               ← infra scaffold (no git clone — app code runs from GHCR images)
  docker-compose.prod.yml   ← postgres, redis, backend, frontend, loki, grafana, promtail
  .env.production
  rclone.conf
  infra/nginx/              ← nginx configs (copied from repo on local machine)
  infra/scripts/            ← backup script (copied from repo on local machine)
  infra/loki/
  infra/promtail/
  infra/grafana/

/opt/station-bot/           ← Bot infra scaffold (no git clone — app code runs from GHCR images)
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

| Domain                      | Routes to                         | Notes                      |
| --------------------------- | --------------------------------- | -------------------------- |
| `drdnt.org`                 | frontend (127.0.0.1:3000)         | Apex domain → Station SPA  |
| `api.drdnt.org`             | backend (127.0.0.1:3001)          | REST API                   |
| `discord.drdnt.org`         | nginx 301 redirect                | → https://discord.gg/drdnt |
| `bot.drdnt.org`             | (placeholder / future)            | Reserved, currently 3999   |
| `grafana.drdnt.org`         | grafana (127.0.0.1:3010)          | Monitoring dashboard       |
| `staging.station.drdnt.org` | staging frontend (127.0.0.1:3003) | Staging SPA                |
| `staging.api.drdnt.org`     | staging backend (127.0.0.1:3002)  | Staging API                |

DNS is managed by Terraform via the Linode DNS provider (`infra/terraform/dns.tf`). All records are `A` records pointing to the Linode VPS IP. Namecheap is the registrar — its nameservers must be switched to Linode's (`ns1–ns5.linode.com`) as part of the pre-flight steps below. Certbot (Let's Encrypt) handles TLS — nginx configs start as HTTP and are updated by Certbot in place.

The `discord.drdnt.org` redirect previously lived as a Namecheap URL redirect. After the nameserver switch it is served by nginx (`infra/nginx/discord.drdnt.org.conf`).

---

## GHCR Image Names

Images push to the Presstronic org on GHCR:

```
ghcr.io/presstronic/station-backend
ghcr.io/presstronic/station-frontend
ghcr.io/presstronic/station-bot
```

---

## Code Changes Required (before first deploy)

1. **`docker-compose.prod.yml` (Station)** — add explicit `station` network to all services, declare the network at the bottom.
2. **`docker-compose.prod.yml` (Station-bot)** — remove `postgres` service, remove `bot-network`, replace with external `station` network. Update `DATABASE_URL` host to still use `postgres` (same service name, works because they share the network).
3. **Nginx** — add `drdnt.org` apex config pointing to the frontend container. The file does **not** yet exist in `infra/nginx/` — only these configs are present: `api.drdnt.org.conf`, `bot.drdnt.org.conf`, `grafana.drdnt.org.conf`, `staging.api.drdnt.org.conf`, `staging.station.drdnt.org.conf`, `station.drdnt.org.conf`. Need to add `drdnt.org.conf`.
4. **`.github/workflows/release.yml`** — add SSH deploy step and required GitHub Secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`). Image refs are already `ghcr.io/presstronic/...`.
5. **`infra/scripts/deploy.sh`** — currently only handles Station services. Will need to remain Station-only; the bot has its own separate deploy.
6. **GitHub Secrets** — the release workflow currently only uses `secrets.GITHUB_TOKEN` (built-in). No custom VPS deploy step exists yet — CD automation (SSH deploy, migration run, container restart) has not been written into the workflow. This is the largest missing piece for full CD.

---

## Deploy Model

There is **no git clone on the VPS**. The VPS only needs:

- `/opt/station/docker-compose.prod.yml` — the compose file (copied once, updated manually on breaking changes)
- `/opt/station/.env.production` — all secrets and env vars (created once, never in git)
- `/opt/station/infra/` — nginx configs, loki/promtail/grafana config files (copied once from the repo on your local machine)

All application code runs from Docker images pulled from GHCR. CD automation (once written) will SSH in, set `STATION_VERSION`, and run `docker compose pull && docker compose up -d`. The VPS never touches the git repo.

---

## Pre-Flight Checklist (local machine — do this first)

These are one-time code changes that must be merged to `main` before the first deploy:

- [x] Transfer GitHub repo from `GitAddRemote` → `Presstronic` _(done 2026-06-13)_
- [x] Update `BACKEND_IMAGE` / `FRONTEND_IMAGE` in `release.yml` to `ghcr.io/presstronic/...` _(done 2026-06-13)_
- [x] Update image refs in `docker-compose.prod.yml` and `docker-compose.staging.yml` to `ghcr.io/presstronic/...` _(done 2026-06-13)_
- [ ] Add `station` network declaration to `docker-compose.prod.yml` and attach all services to it
- [ ] Update Station-bot `docker-compose.prod.yml`: remove its `postgres` service, replace `bot-network` with external `station` network
- [x] Add `infra/nginx/discord.drdnt.org.conf` (replaces Namecheap URL redirect) _(done 2026-06-14)_
- [ ] Add `infra/nginx/drdnt.org.conf` (apex domain → frontend)
- [x] Add missing DNS records to `infra/terraform/dns.tf`: apex, discord, grafana, staging.api, staging.station _(done 2026-06-14)_
- [ ] Write the CD deploy job in `release.yml` (SSH → pull → migrate → restart)
- [ ] Add GitHub Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`
- [ ] Switch Namecheap nameservers to Linode (`ns1–ns5.linode.com`) and run `terraform apply`
- [ ] Push a `release/vX.Y.Z` branch to trigger CI → build → GHCR push

---

## VPS Manual Steps (one-time bootstrap)

Everything below is run on the VPS over SSH. After this is done once, CD handles all future deploys automatically.

### Step 1 — Verify VPS state

```bash
# Confirm rootless Docker is healthy
systemctl --user status docker

# Confirm what's currently running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Confirm nginx is installed and running
sudo systemctl status nginx

# Check certbot is available
certbot --version

# Verify SSH is locked down
sudo sshd -T | grep -E "passwordauthentication|permitrootlogin|pubkeyauthentication"
```

Expected: `station-bot` and `station-bot-postgres` running, nginx active, certbot available.

### Step 2 — Switch Nameservers to Linode and Apply Terraform

DNS is managed by Terraform via the Linode DNS provider. Before `terraform apply` can create records that resolve, Namecheap must delegate to Linode's nameservers.

**In Namecheap → Domain → Nameservers**, switch from "Namecheap PremiumDNS" to "Custom DNS" and enter:

```
ns1.linode.com
ns2.linode.com
ns3.linode.com
ns4.linode.com
ns5.linode.com
```

> **Note:** The `discord.drdnt.org` Namecheap URL redirect stops working the moment you save this. The nginx-based redirect (`infra/nginx/discord.drdnt.org.conf`) takes over once Terraform creates the DNS record and nginx is configured in Step 6. Downtime window is nameserver propagation time (~5–30 min).

Then run Terraform from your local machine:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in: linode_token, vps_label, vps_region, vps_type, vps_image, vps_ip
terraform init
terraform apply
```

**Verify:**

```bash
# Wait for propagation (can take 5–30 min after nameserver switch)
dig +short api.drdnt.org       # should return VPS IP
dig +short grafana.drdnt.org   # should return VPS IP
dig +short discord.drdnt.org   # should return VPS IP
```

### Step 3 — Create `/opt/station` scaffold

No git clone. The VPS only needs the compose file, env file, and infra configs. Copy from your local machine:

```bash
# On local machine — from the root of the station repo
scp docker-compose.prod.yml deploy@<VPS_IP>:/opt/station/docker-compose.prod.yml
scp -r infra/ deploy@<VPS_IP>:/opt/station/infra/
```

Then on the VPS, create the env file:

```bash
ssh deploy@<VPS_IP>
mkdir -p /opt/station/logs
nano /opt/station/.env.production   # fill in all values
chmod 600 /opt/station/.env.production
```

> On subsequent deploys, the CD workflow writes `.env.production` from GitHub Secrets automatically. The `scp` above is only needed once for the initial bootstrap.

**Verify:**

```bash
ls -la /opt/station/
# Expected: docker-compose.prod.yml  .env.production  infra/  logs/
```

### Step 4 — Authenticate Docker with GHCR

```bash
# On VPS as deploy user
echo <github_pat> | docker login ghcr.io -u <github_username> --password-stdin
```

The PAT needs `read:packages` scope. This is a one-time login — credentials are cached in `~/.docker/config.json`.

### Step 5 — Postgres migration (bot → Station)

The bot currently runs its own `station-bot-postgres` container. We move the data into Station's Postgres, which becomes the single shared instance.

```bash
# Dump the bot's database (bot stays running during this)
docker exec station-bot-postgres pg_dump \
  -U station_bot -d station_bot \
  > /tmp/station_bot_backup_$(date +%Y%m%d_%H%M%S).sql

# Stop just the bot application (leave its Postgres up for the dump)
cd /opt/station-bot
docker compose -f docker-compose.prod.yml stop discord-bot

# Bring up Station's Postgres only
cd /opt/station
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
docker compose --env-file .env.production -f docker-compose.prod.yml ps  # wait for healthy

# Create the bot's DB and user inside Station's Postgres
# (Station's own DB is auto-created by POSTGRES_DB env var on first start)
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U ${DATABASE_USER} -c "CREATE USER station_bot WITH PASSWORD '<bot_pg_password>';"
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U ${DATABASE_USER} -c "CREATE DATABASE station_bot OWNER station_bot;"

# Restore bot data
cat /tmp/station_bot_backup_*.sql | docker exec -i \
  $(docker compose --env-file .env.production -f docker-compose.prod.yml ps -q postgres) \
  psql -U station_bot -d station_bot

# Run Station's TypeORM migrations (creates the Station schema)
docker compose --env-file .env.production -f docker-compose.prod.yml \
  run --rm backend node dist/main migration:run
```

### Step 6 — Install nginx configs and issue TLS certs

```bash
# As root
sudo bash

for conf in api.drdnt.org station.drdnt.org bot.drdnt.org grafana.drdnt.org \
            staging.api.drdnt.org staging.station.drdnt.org drdnt.org; do
  cp /opt/station/infra/nginx/${conf}.conf /etc/nginx/sites-available/${conf}
  ln -sf /etc/nginx/sites-available/${conf} /etc/nginx/sites-enabled/${conf}
done

nginx -t && systemctl reload nginx

# Issue TLS certs (DNS must be propagated — verify with dig first)
certbot --nginx \
  -d drdnt.org \
  -d api.drdnt.org \
  -d bot.drdnt.org \
  -d grafana.drdnt.org \
  -d staging.api.drdnt.org \
  -d staging.station.drdnt.org
```

### Step 7 — Pull images and start Station

```bash
# On VPS as deploy user
cd /opt/station

# Pull all images (STATION_VERSION must match the tag pushed to GHCR)
STATION_VERSION=v0.4.0-alpha docker compose --env-file .env.production -f docker-compose.prod.yml pull

# Start in dependency order
docker compose --env-file .env.production -f docker-compose.prod.yml up -d loki
docker compose --env-file .env.production -f docker-compose.prod.yml up -d grafana promtail
docker compose --env-file .env.production -f docker-compose.prod.yml up -d redis
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend

# Watch until healthy before starting frontend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend

docker compose --env-file .env.production -f docker-compose.prod.yml up -d frontend
```

### Step 8 — Reconnect the bot

The bot's `DATABASE_URL` host stays `postgres` — same service name, now on the shared `station` network.

```bash
# Update bot's compose to use the station external network (if not already done in pre-flight)
cd /opt/station-bot
nano docker-compose.prod.yml   # remove postgres service, update network to station external

docker compose -f docker-compose.prod.yml up -d discord-bot
docker logs station-bot --tail=50
```

### Step 9 — Verify everything

```bash
curl -sf https://api.drdnt.org/health && echo "API OK"
curl -sf https://drdnt.org && echo "Frontend OK"

docker ps --format "table {{.Names}}\t{{.Status}}"

# Only after bot has been healthy for 30+ min:
docker stop station-bot-postgres
docker rm station-bot-postgres
docker volume rm station-bot_postgres-data
```

### Step 10 — Set up nightly backup cron

> **Pre-req:** Create a dedicated application key in the Backblaze B2 console scoped to a `station-backups` bucket, then write `/opt/station/rclone.conf`:
>
> ```ini
> [b2]
> type = b2
> account = <B2_ACCOUNT_ID>
> key = <B2_APPLICATION_KEY>
> hard_delete = false
> ```
>
> `chmod 600 /opt/station/rclone.conf`

```bash
# Verify B2 is reachable
RCLONE_CONFIG=/opt/station/rclone.conf rclone lsd b2:station-backups

# Add cron job (as deploy user)
(crontab -l 2>/dev/null; echo "0 3 * * * cd /opt/station && bash infra/scripts/backup-db.sh >> /opt/station/logs/backup.log 2>&1") | crontab -

# Trigger a manual backup to verify end-to-end
bash /opt/station/infra/scripts/backup-db.sh manual
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
A: Presstronic. Station repo was transferred from GitAddRemote to Presstronic on 2026-06-13. All image refs updated to `ghcr.io/presstronic/...`.

**Q3: Is Station Bot currently running from `/opt/station-bot`?**
A: Yes, actively running from that directory.

**Q4: DNS — who manages `drdnt.org`?**
A: Namecheap is the registrar, but DNS records are managed by Terraform via the Linode DNS provider. Nameservers on Namecheap must be switched from "Namecheap PremiumDNS" to `ns1–ns5.linode.com` as a one-time step before `terraform apply` creates resolving records. The existing `discord.drdnt.org` URL redirect (Namecheap-proprietary) is replaced by an nginx 301 in `infra/nginx/discord.drdnt.org.conf`.

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
