# Deployment Runbook

## Prerequisites

Before a first-time deploy you need:

- SSH access to the Linode VPS as the `deploy` user
- A Linode API token with DNS + Linodes read/write scope (for Terraform)
- Namecheap access to `drdnt.org` to switch nameservers (one-time)
- A Backblaze B2 account with a `station-backups` bucket and application key
- A GitHub PAT with `read:packages` scope (for GHCR pulls on the VPS)
- All GitHub Secrets configured — see [docs/cicd.md](cicd.md) for the full secrets table

> **Deploy model:** There is no git clone on the VPS. Application code runs from Docker images
> pulled from GHCR (`ghcr.io/presstronic/station-backend`, `ghcr.io/presstronic/station-frontend`).
> Infra scaffold files (`docker-compose.prod.yml`, `.env.production`, nginx/loki/grafana configs)
> live on the VPS and are copied there once. All subsequent deploys are fully automated via
> GitHub Actions → SSH → `docker compose pull && up -d`.

> **Infrastructure as code:** The Linode VPS, firewall, and all DNS records for `drdnt.org` are
> managed by Terraform in `infra/terraform/`. Never create or edit DNS records manually in the
> Linode Cloud Manager — let Terraform own them.

---

## First-time setup

### 1. Switch Nameservers to Linode

DNS is managed by Terraform via the Linode DNS provider. Before Terraform can create records
that resolve, Namecheap must delegate to Linode's nameservers.

In **Namecheap → Domain → Nameservers**, switch from "Namecheap PremiumDNS" to "Custom DNS":

```
ns1.linode.com
ns2.linode.com
ns3.linode.com
ns4.linode.com
ns5.linode.com
```

> The `discord.drdnt.org` Namecheap URL redirect stops working immediately. The nginx-based
> redirect (`infra/nginx/discord.drdnt.org.conf`) takes over once nginx is configured in step 4.
> Downtime is nameserver propagation time (~5–30 min).

### 2. Run Terraform

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Fill in: linode_token, vps_label, vps_region, vps_type, vps_image, vps_ip
terraform init
terraform apply
```

Terraform creates/imports the VPS, applies the firewall, and creates all DNS records.

**Verify — wait for propagation, then:**

```bash
dig +short api.drdnt.org        # → VPS IP
dig +short grafana.drdnt.org    # → VPS IP
dig +short discord.drdnt.org    # → VPS IP
```

### 3. Create `/opt/station` scaffold on the VPS

Copy the compose file and infra configs from your local machine (one-time only — subsequent
deploys are handled by CI/CD):

```bash
# From the root of the station repo on your local machine
scp docker-compose.prod.yml deploy@<VPS_IP>:/opt/station/docker-compose.prod.yml
scp -r infra/ deploy@<VPS_IP>:/opt/station/infra/
```

Then create the env file on the VPS:

```bash
ssh deploy@<VPS_IP>
mkdir -p /opt/station/logs
nano /opt/station/.env.production   # fill in all values
chmod 600 /opt/station/.env.production
```

**Verify:**

```bash
ls -la /opt/station/
# Expected: docker-compose.prod.yml  .env.production  infra/  logs/
```

### 4. Set up Nginx and TLS

```bash
# As root on the VPS
sudo bash

for conf in api.drdnt.org station.drdnt.org discord.drdnt.org bot.drdnt.org \
            grafana.drdnt.org staging.api.drdnt.org staging.station.drdnt.org drdnt.org; do
  cp /opt/station/infra/nginx/${conf}.conf /etc/nginx/sites-available/${conf}
  ln -sf /etc/nginx/sites-available/${conf} /etc/nginx/sites-enabled/${conf}
done

nginx -t && systemctl reload nginx
```

**Verify nginx config and discord redirect before issuing certs:**

```bash
nginx -t                                            # must print "syntax is ok"
curl -I http://discord.drdnt.org                    # expect 301 → https://discord.gg/drdnt
```

Then issue TLS certs (DNS must be propagated — verify with `dig` first):

```bash
certbot --nginx \
  -d drdnt.org \
  -d api.drdnt.org \
  -d discord.drdnt.org \
  -d bot.drdnt.org \
  -d grafana.drdnt.org \
  -d staging.api.drdnt.org \
  -d staging.station.drdnt.org
```

**Verify TLS:**

```bash
curl -sf https://discord.drdnt.org   # expect redirect to discord.gg/drdnt
curl -sf https://api.drdnt.org/health || echo "backend not up yet — expected at this stage"
```

### 5. Configure GitHub Secrets

In the GitHub repository settings, create both a `staging` and a `production` environment.
Follow the per-environment requirements in [docs/cicd.md](cicd.md) and
[infra/docs/secrets.md](../infra/docs/secrets.md). Required for CD automation:
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`.

### 6. Start stateful services

The deploy scripts only restart app containers — they do not start PostgreSQL or Redis. Bootstrap
them manually before the first deploy:

```bash
ssh deploy@<VPS_IP>
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"
cd /opt/station

# Staging: bring up postgres and redis only (app images don't exist yet)
docker compose --project-name station-staging --env-file .env.staging \
  -f docker-compose.staging.yml up -d postgres redis

# Production: bring up postgres and redis
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres redis
```

**Verify both are healthy before continuing:**

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
# postgres and redis must show (healthy)
```

### 7. Trigger the first deploy

Push a `release/vX.Y.Z` branch to trigger the release workflow:

```bash
git checkout -b release/v0.1.0
git push origin release/v0.1.0
```

The workflow validates, builds images, pushes to GHCR, SSHes into the VPS to pull and restart
containers, runs migrations, then creates a GitHub Release.

**Verify after the workflow completes:**

```bash
curl -sf https://api.drdnt.org/health && echo "API OK"
curl -sf https://drdnt.org && echo "Frontend OK"
docker compose --env-file /opt/station/.env.production \
  -f /opt/station/docker-compose.prod.yml ps
```

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
3. SSH into VPS — write `.env.production` from GitHub Secrets, pull new images, run migrations, restart containers
4. Create a GitHub Release with auto-generated release notes (git-cliff)

Watch the workflow: **Actions → Release → [your release branch]**

---

## Infrastructure changes

When you need to change DNS records, firewall rules, or VPS config — edit `infra/terraform/`
and apply:

```bash
cd infra/terraform
terraform plan   # review what will change
terraform apply
```

Never edit records directly in the Linode Cloud Manager — they will be overwritten on the next
`terraform apply`.

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

**Verify:**

```bash
curl -sf https://api.drdnt.org/health && echo "OK"
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

For per-secret rotation procedures, see [infra/docs/secrets.md](../infra/docs/secrets.md).

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
free -h && df -h / && top

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

### Trigger a manual backup

```bash
ssh deploy@<vps-host> 'cd /opt/station && bash infra/scripts/backup-db.sh manual'
```

### Restore from a backup

See **[infra/docs/restore.md](../infra/docs/restore.md)** for the full procedure including
listing backups, restore drill, and row-count verification.

---

## Common issues

| Symptom                  | Action                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container crash loop     | `docker compose --env-file .env.production -f docker-compose.prod.yml logs backend --tail=100` — look for startup error, missing env var, or migration failure                                |
| Out of memory            | `free -h` — if >90% used, add swap or resize the VPS                                                                                                                                          |
| Disk full                | `df -h /` — prune old images: `docker image prune -f`                                                                                                                                         |
| TLS cert expired         | `certbot renew --nginx` (normally auto-renewed by systemd timer)                                                                                                                              |
| Migration failed         | Follow [infra/docs/migration-rollback.md](../infra/docs/migration-rollback.md)                                                                                                                |
| DNS record wrong/missing | Edit `infra/terraform/dns.tf` and run `terraform apply` — never edit in Linode Cloud Manager                                                                                                  |
| Backup not in B2         | `tail /opt/station/logs/backup.log`; then: `B2_BUCKET=$(grep ^B2_BUCKET= /opt/station/.env.production \| cut -d= -f2) && RCLONE_CONFIG=/opt/station/rclone.conf rclone lsd "b2:${B2_BUCKET}"` |
