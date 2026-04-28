# Infrastructure

This directory holds the infrastructure-as-code and VPS provisioning assets for Station.

## Terraform Setup

Issue `#106` establishes the Linode foundation as code. The Terraform configuration manages:

- the existing Linode VPS instance through `terraform import`
- the Linode firewall allowing only TCP ports `22`, `80`, and `443`
- the DNS records for `api.drdnt.org`, `station.drdnt.org`, and `bot.drdnt.org`

### Files

- `terraform/main.tf`: provider, instance, and firewall configuration
- `terraform/dns.tf`: Linode domain and A records
- `terraform/variables.tf`: required input variables
- `terraform/outputs.tf`: useful outputs for the VPS IP and FQDNs
- `terraform/terraform.tfvars.example`: example input values

### Workflow

```bash
cd infra/terraform
terraform init
terraform import linode_instance.vps <linode-instance-id>
terraform import linode_domain.drdnt_org <linode-domain-id>
terraform plan
terraform apply
```

Review `terraform plan` before every apply. The existing VPS must be imported rather than recreated.

### Variables

- `linode_token`: Linode API token
- `vps_ip`: optional fallback public IPv4 of the VPS if the imported instance IP is not yet available
- `vps_label`: Linode label of the imported VPS
- `vps_region`: Linode region slug of the imported VPS
- `vps_type`: Linode plan type of the imported VPS
- `vps_image`: base image recorded for the imported VPS
- `ssh_public_key`: optional deploy SSH public key for initial instance configuration; authorized keys are not continuously managed after import

Keep real values in `infra/terraform/terraform.tfvars`, which is gitignored.

## VPS Baseline

Issue `#107` builds on the Terraform layer after DNS from issue `#106` has propagated.

1. Copy the repository or the `infra/` directory to the VPS.
2. Export `DEPLOY_SSH_PUBLIC_KEY` as the deploy user's public SSH key, then run `infra/scripts/bootstrap-vps.sh` as `root`.
3. If you did not set `DEPLOY_SSH_PUBLIC_KEY`, manually append the deploy public key to `/home/deploy/.ssh/authorized_keys` after the script finishes.
4. Review and install the Nginx site configs from `infra/nginx/`.
5. Run `infra/scripts/issue-certs.sh` to request the initial certificates.
6. Verify renewal with `certbot renew --dry-run`.

After setup, the VPS layout should look like:

```text
/opt/station/
  docker-compose.prod.yml
  .env.production
  logs/
```

The scripts here are designed to establish the baseline only:

- `infra/scripts/bootstrap-vps.sh`: installs Docker, Nginx, Certbot, the `deploy` user, `/opt/station`, and swap.
- `infra/scripts/setup-swap.sh`: creates and enables a persistent 2 GB swap file.
- `infra/scripts/issue-certs.sh`: requests the initial Let's Encrypt certificates for Station domains.

The Nginx configs in `infra/nginx/` are plain HTTP bootstrap configs. Certbot updates them with HTTPS and redirect blocks after certificates are issued.

## Secrets

Issue `#128` documents environment-scoped secret management in `infra/docs/secrets.md`.

- GitHub `staging` and `production` environments hold the deploy-time secrets.
- The release workflow writes `/opt/station/.env.staging` and `/opt/station/.env.production` on the VPS during deploys.
- Those files are recreated on every deploy and locked down with `chmod 600`.

## Backups

Issue `#125` adds the production backup contract:

- `infra/scripts/backup-db.sh`: creates a gzip-compressed `pg_dump` from the running production Postgres container and uploads it to Backblaze B2 via `rclone`
- `infra/scripts/restore-db.sh`: downloads a backup from B2 and restores it into the production Postgres container
- `infra/logrotate/station-backup`: rotates `/opt/station/logs/backup.log`

The production release workflow writes `/opt/station/rclone.conf` from GitHub environment secrets and runs a pre-deploy backup before rolling the backend forward.

Issue `#133` adds backup failure alerting via a healthchecks.io dead-man's switch:

- `backup-db.sh` pings `BACKUP_HEALTHCHECK_URL` after a successful upload; if the ping is absent, healthchecks.io fires an alert
- `BACKUP_HEALTHCHECK_URL` is a production-only GitHub environment secret written into `.env.production` at deploy time
- See `infra/docs/backups.md` for operational procedures: verification, alert response, retention policy, and restore steps

## Redis Persistence

Issue `#126` enables Redis AOF persistence in both compose stacks and documents verification/recovery in `infra/docs/redis.md`.

- production uses the `redis_aof` volume
- staging uses the `redis_staging_aof` volume
- both Redis services run with `--appendonly yes --appendfsync everysec`
