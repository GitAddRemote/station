# Deployment Runbook

## Prerequisites

Before a first-time deploy you need:

- SSH access to the Linode VPS as the `deploy` user
- DNS access in Namecheap for `drdnt.org`
- A Backblaze B2 account with a `station-backups` bucket and application key
- A GitHub PAT with `read:packages` scope (for GHCR pulls on the VPS)
- All GitHub Secrets configured — see [docs/cicd.md](cicd.md) for the full secrets table

> **Deploy model:** There is no git clone on the VPS. Application code runs from Docker images
> pulled from GHCR (`ghcr.io/presstronic/station-backend`, `ghcr.io/presstronic/station-frontend`).
> Only infra scaffold files (`docker-compose.prod.yml`, `.env.production`, nginx configs, etc.)
> live on the VPS and are copied there once from your local machine.

---

## First-time setup

### 1. DNS (Namecheap)

Add these `A` records in Namecheap pointing to the Linode VPS IP. Do this first — propagation
can take up to 30 minutes.

| Host              | Type | Value      |
| ----------------- | ---- | ---------- |
| `@`               | A    | `<VPS IP>` |
| `api`             | A    | `<VPS IP>` |
| `bot`             | A    | `<VPS IP>` |
| `grafana`         | A    | `<VPS IP>` |
| `staging.station` | A    | `<VPS IP>` |
| `staging.api`     | A    | `<VPS IP>` |

Verify propagation before continuing:

```bash
dig +short api.drdnt.org
```

### 2. Create `/opt/station` scaffold on the VPS

No git clone. Copy the necessary files from your local machine:

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

### 3. Authenticate Docker with GHCR

```bash
# On VPS as deploy user
echo <github_pat> | docker login ghcr.io -u <github_username> --password-stdin
```

The PAT needs `read:packages` scope. Credentials are cached in `~/.docker/config.json`.

### 4. Set up Nginx and TLS

```bash
# As root on the VPS
sudo bash

for conf in api.drdnt.org station.drdnt.org bot.drdnt.org grafana.drdnt.org \
            staging.api.drdnt.org staging.station.drdnt.org drdnt.org; do
  cp /opt/station/infra/nginx/${conf}.conf /etc/nginx/sites-available/${conf}
  ln -sf /etc/nginx/sites-available/${conf} /etc/nginx/sites-enabled/${conf}
done

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

### 5. Configure GitHub Secrets

In the GitHub repository settings, create both a `staging` and a `production` environment.
Follow the per-environment requirements in [docs/cicd.md](cicd.md) and
[infra/docs/secrets.md](../infra/docs/secrets.md). Required secrets for CD:
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`.

### 6. Start stateful services

The deploy scripts use `--no-deps backend frontend` — they do not start PostgreSQL or Redis.
Bootstrap them manually before the first deploy:

```bash
ssh deploy@<VPS_IP>
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
cd /opt/station

# Bring up staging postgres and redis only (app images don't exist yet)
docker compose --project-name station-staging --env-file .env.staging \
  -f docker-compose.staging.yml up -d postgres redis

# Bring up production postgres and redis
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
```

Wait for both postgres containers to report healthy (`docker compose ... ps`) before continuing.

### 7. Trigger the first deploy

Push a `release/vX.Y.Z` branch to trigger the release workflow:

```bash
git checkout -b release/v0.1.0
git push origin release/v0.1.0
```

The workflow validates, builds images, pushes to GHCR, creates a GitHub Release, then SSHes
into the VPS to pull new images and restart containers.

---

## Routine deploys

Deploys are triggered by pushing a `release/vX.Y.Z` branch. The workflow derives the version
from the branch name — no `package.json` bump is required.

```bash
git checkout -b release/v0.2.0
git push origin release/v0.2.0
```

What happens in GitHub Actions:

1. Run quality gate (lint, typecheck, unit tests, E2E tests against Postgres)
2. Build Docker images and push to GHCR (`ghcr.io/presstronic/station-backend:vX.Y.Z`)
3. SSH into VPS — pull new images, run migrations, restart containers
4. Create a GitHub Release with auto-generated release notes (git-cliff)

Watch the workflow: **Actions → Release → [your release branch]**

---

## Rollback

If a deploy goes wrong, redeploy the last known-good tag:

```bash
# On the VPS (as the deploy user):
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
STATION_VERSION="v0.1.9" \
  docker compose \
    --env-file /opt/station/.env.production \
    -f /opt/station/docker-compose.prod.yml \
    up -d
```

If the rollback involves a bad migration, follow the migration rollback runbook first:
[infra/docs/migration-rollback.md](../infra/docs/migration-rollback.md).

---

## Secrets management

Secrets live in two places:

| Location                                | Contents                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Secrets (production environment) | VPS SSH key, database credentials, JWT secret, Redis password, B2 keys, CORS origins, `INTERNAL_API_KEY` (required — min 32 chars, protects the OAuth client admin endpoint) |
| `/opt/station/.env.production` on VPS   | Written by the deploy workflow from GitHub Secrets on every deploy                                                                                                           |

The `.env.production` file is created with `chmod 600` and owned by the `deploy` user. It is
never committed to the repository.

For per-secret rotation procedures (including safe ordering for database passwords and JWT
secrets), see [infra/docs/secrets.md](../infra/docs/secrets.md).

---

## Monitoring basics

```bash
ssh deploy@<vps-host>
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
cd /opt/station

# Service status
docker compose --env-file .env.production -f docker-compose.prod.yml ps

# Live logs
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f frontend

# Resource usage
free -h          # memory
df -h /          # disk
top              # CPU

# Health endpoint
curl -f https://api.drdnt.org/health && echo OK
```

---

## Backups

Production deploys create a pre-deploy PostgreSQL backup before the backend rollout starts.
Nightly backups also run on the VPS at `03:00 UTC` via the `deploy` user's cron.

### Verify nightly backups

```bash
ssh deploy@<vps-host>
tail -f /opt/station/logs/backup.log
```

### List backups in Backblaze B2

See **[infra/docs/restore.md §2](../infra/docs/restore.md#2-list-available-backups)** for the
full listing command, including how to derive `B2_BUCKET` from `.env.production`.

### Trigger a manual backup

```bash
ssh deploy@<vps-host>
cd /opt/station
bash infra/scripts/backup-db.sh manual
```

### Restore from a backup

```bash
ssh deploy@<vps-host>
cd /opt/station
bash infra/scripts/restore-db.sh postgres/202605/20260510_030000_nightly.sql.gz
```

The restore script stops the backend, restores into the running production Postgres container,
and starts the backend again after the import finishes. For the full procedure — including how
to list and download backups, run a zero-risk restore drill, and verify row counts after a
restore — see **[infra/docs/restore.md](../infra/docs/restore.md)**.

---

## Common issues

| Symptom                    | Action                                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container crash loop       | `docker compose --env-file .env.production -f docker-compose.prod.yml logs backend --tail=100` — look for startup error, missing env var, or migration failure |
| Out of memory              | `free -h` — if used >90%, consider adding swap or resizing the VPS                                                                                             |
| Disk full                  | `df -h /` — prune old Docker images: `docker image prune -f`                                                                                                   |
| TLS cert expired           | `certbot renew --nginx` (normally auto-renewed by systemd timer)                                                                                               |
| Migration failed           | Follow [infra/docs/migration-rollback.md](../infra/docs/migration-rollback.md)                                                                                 |
| Backup not appearing in B2 | Check `tail /opt/station/logs/backup.log`; then run the B2 verify snippet below                                                                                |

**B2 verify:**

```bash
B2_BUCKET=$(grep ^B2_BUCKET= /opt/station/.env.production | cut -d= -f2)
RCLONE_CONFIG=/opt/station/rclone.conf rclone lsd "b2:${B2_BUCKET}"
```

---

## What to do if things go wrong

| Scenario                                       | Action                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Rows accidentally deleted (schema intact)      | Live restore — [infra/docs/restore.md §4b](../infra/docs/restore.md#4b-live-restore--production-only-for-actual-data-loss)            |
| Bad migration / schema corruption              | Check migration rollback first — [infra/docs/migration-rollback.md](../infra/docs/migration-rollback.md); if that fails, live restore |
| Disk failure / volume deleted                  | Provision new VPS → bootstrap → live restore — [infra/docs/restore.md §6](../infra/docs/restore.md#6-decision-tree)                   |
| Confirming backups are valid (quarterly drill) | Restore drill — [infra/docs/restore.md §4a](../infra/docs/restore.md#4a-restore-drill--throwaway-container-zero-production-risk)      |
