# Deployment Runbook

## Prerequisites

Before a first-time deploy you need:

- A Linode account with an API token (DNS for `drdnt.org` is managed in Terraform — see `infra/terraform/dns.tf`)
- A Backblaze B2 account with a bucket and application key
- A GitHub repository with Actions enabled and a GHCR package registry
- All GitHub Secrets configured — see [docs/cicd.md](cicd.md) for the full secrets table

---

## First-time setup

### 1. Provision the VPS with Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in linode_token, vps_ip, ssh_public_key, etc.
terraform init
terraform apply
```

Terraform creates the VPS. Note the public IP from the output.

### 2. Bootstrap the VPS

SSH in as root (first login only) and run the bootstrap script:

```bash
ssh root@<vps-ip>
# bootstrap-vps.sh reads DEPLOY_SSH_PUBLIC_KEY to populate authorized_keys for the deploy user.
# Without it, the deploy user's authorized_keys will be empty and SSH deploys will fail.
export DEPLOY_SSH_PUBLIC_KEY="ssh-ed25519 AAAA... your-deploy-public-key"
bash /opt/station/infra/scripts/bootstrap-vps.sh
```

The script installs rootless Docker, sets up the `deploy` user, enables linger, and starts the rootless Docker daemon. It also creates `/opt/station` with `deploy` ownership. See [infra/docs/vps-setup.md](../infra/docs/vps-setup.md) for security properties.

Clone the repository **as the deploy user** after the bootstrap completes, so that all files are deploy-user-owned from the start. SSH deploys and git operations run as `deploy` and will fail if the repo is root-owned.

```bash
# After bootstrap, clone as the deploy user:
ssh deploy@<vps-ip>
git clone https://github.com/GitAddRemote/station.git /opt/station
```

> If the repo was already cloned as root (e.g., to run bootstrap), fix ownership before deploying:
> `chown -R deploy:deploy /opt/station`

### 3. Set up Nginx and TLS

```bash
# As root on the VPS
apt install -y nginx certbot python3-certbot-nginx

# Copy all Nginx configs
for conf in api.drdnt.org station.drdnt.org bot.drdnt.org staging.api.drdnt.org staging.station.drdnt.org grafana.drdnt.org; do
  cp /opt/station/infra/nginx/${conf}.conf /etc/nginx/sites-available/${conf}
  ln -s /etc/nginx/sites-available/${conf} /etc/nginx/sites-enabled/${conf}
done
nginx -t && systemctl reload nginx

# Issue TLS certificates for the Terraform-managed domains (api, station, bot
# all have A records after `terraform apply` in step 1)
certbot --nginx -d api.drdnt.org -d station.drdnt.org -d bot.drdnt.org

# staging.* and grafana.drdnt.org are NOT in infra/terraform/dns.tf yet.
# Add their A records to dns.tf and re-run `terraform apply` before step 5, then:
# certbot --nginx -d staging.api.drdnt.org -d staging.station.drdnt.org -d grafana.drdnt.org
```

> **Important:** The release workflow's staging job hits `https://staging.api.drdnt.org/health`
> before gating production. `staging.api.drdnt.org` must resolve and have a valid TLS certificate
> before you push the first release branch. Add `staging.api.drdnt.org` and
> `staging.station.drdnt.org` A records to `infra/terraform/dns.tf` and run `terraform apply`,
> then run the `certbot` command above, before triggering the first deploy in step 5.

### 4. Configure GitHub Secrets

In the GitHub repository settings, create both a `staging` and a `production` environment and add all secrets listed in [docs/cicd.md](cicd.md) and [infra/docs/secrets.md](../infra/docs/secrets.md) to each. The deploy workflow runs staging first; production is gated on the staging health check passing.

Include `INTERNAL_API_KEY` (min 32 chars; the backend validation schema requires it in production — generate with `openssl rand -base64 32`).

### 5. Start the stateful services on the VPS

The deploy scripts use `--no-deps backend frontend` — they do not start PostgreSQL or Redis. The pre-deploy backup step also runs `docker compose exec postgres`, which will fail if that container has never been started. Before triggering the first deploy, SSH in as the `deploy` user and bring up the stateful services:

```bash
ssh deploy@<vps-ip>
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
cd /opt/station
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
```

Wait for postgres to report healthy before proceeding (`docker compose ... ps`).

### 6. Trigger the first deploy

Push a `release/vX.Y.Z` branch to trigger the release workflow:

```bash
git checkout -b release/v0.1.0
git push origin release/v0.1.0
```

The workflow derives the version from the branch name, validates, builds images, pushes to GHCR, takes a pre-deploy backup, deploys to the VPS, creates the git tag, and verifies the container is running.

---

## Routine deploys

Deploys are triggered by pushing a `release/vX.Y.Z` branch. The workflow derives the version from the branch name — no `package.json` bump is required by the workflow itself.

```bash
git checkout -b release/v0.2.0
git push origin release/v0.2.0
```

What happens in GitHub Actions:

1. Run quality gate (lint, typecheck, tests against Postgres)
2. Build Docker images and push to GHCR
3. Write `.env.production` from GitHub Secrets to the VPS
4. Take a pre-deploy PostgreSQL backup (labelled with the git SHA)
5. Verify the backup exists in Backblaze B2
6. Run `deploy.sh` on the VPS (pulls new images, restarts containers — migrations must be run manually before or after if needed)
7. Verify the backend container is running and healthy
8. Create a GitHub Release with auto-generated release notes

Watch the workflow: **Actions → Release → [your release branch]**

---

## Rollback

If a deploy goes wrong, redeploy the last known-good tag:

```bash
# Find the previous release tag on GitHub
PREVIOUS_TAG="v0.1.9"

# On the VPS (as the deploy user):
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
STATION_VERSION="${PREVIOUS_TAG}" \
  docker compose \
    --env-file /opt/station/.env.production \
    -f /opt/station/docker-compose.prod.yml \
    up -d
```

If the rollback involves a bad migration, follow the migration rollback runbook first: [infra/docs/migration-rollback.md](../infra/docs/migration-rollback.md).

---

## Secrets management

Secrets live in two places:

| Location                                | Contents                                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Secrets (production environment) | VPS SSH key, database credentials, JWT secret, Redis password, B2 keys, CORS origins, `INTERNAL_API_KEY` (required — min 32 chars, protects the OAuth client admin endpoint) |
| `/opt/station/.env.production` on VPS   | Written by the deploy workflow from GitHub Secrets on every deploy                                                                                                           |

The `.env.production` file is created with `chmod 600` and owned by the `deploy` user. It is never committed to the repository.

For per-secret rotation procedures (including safe ordering for database passwords and JWT secrets), see [infra/docs/secrets.md](../infra/docs/secrets.md).

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

Production deploys create a pre-deploy PostgreSQL backup before the backend rollout starts. Nightly backups also run on the VPS at `03:00 UTC` via the `deploy` user's cron.

### Verify nightly backups

```bash
ssh deploy@<vps-host>
tail -f /opt/station/logs/backup.log
```

### List backups in Backblaze B2

See **[infra/docs/restore.md §2](../infra/docs/restore.md#2-list-available-backups)** for the full listing command, including how to derive `B2_BUCKET` from `.env.production`.

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

The restore script stops the backend, restores into the running production Postgres container, and starts the backend again after the import finishes. It replays the SQL dump into the current database. If you need a clean replacement restore, drop and recreate the target database first.

For the full procedure — including how to list and download backups, run a zero-risk restore drill, and verify row counts after a restore — see **[infra/docs/restore.md](../infra/docs/restore.md)**.

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
