# CI/CD

This document describes the Station release pipeline introduced for issue `#90`.

## Release Flow

```text
release/v0.2.0 push
  -> run backend/frontend validation inside release workflow
  -> build and push GHCR images
  -> deploy staging automatically
  -> wait for production approval
  -> deploy production
  -> create git tag, CHANGELOG.md update, and GitHub Release
```

## GitHub Environments

Create two repository environments in GitHub settings:

- `staging`: no protection rules
- `production`: require reviewer approval before deploy

The deploy jobs use GitHub environment-scoped secrets and recreate `/opt/station/.env.staging` or `/opt/station/.env.production` on every deploy.

## Required Secrets

Store these secrets in both the `staging` and `production` GitHub environments unless otherwise noted:

| Secret | Description |
| --- | --- |
| `VPS_HOST` | VPS public IP or hostname |
| `VPS_USER` | SSH user, expected to be `deploy` |
| `VPS_SSH_KEY` | Private SSH key for the `deploy` user |
| `VPS_KNOWN_HOSTS` | Pinned SSH host key entries for the deploy target |
| `DATABASE_HOST` | For the current compose stack, use `postgres` |
| `DATABASE_PORT` | For the current compose stack, use `5432` |
| `DATABASE_USER` | Database role used by the backend |
| `DATABASE_PASSWORD` | Database password |
| `DATABASE_NAME` | Database name |
| `JWT_SECRET` | JWT signing secret, minimum 32 characters |
| `REDIS_PASSWORD` | Redis auth password |
| `ALLOWED_ORIGIN` | Frontend origin allowed by backend CORS |
| `FRONTEND_URL` | Frontend base URL used in password-reset links |
| `B2_ACCOUNT_ID` | Backblaze B2 account id |
| `B2_APPLICATION_KEY` | Backblaze B2 application key |
| `B2_BUCKET` | Backblaze B2 bucket name |
| `SENTRY_DSN` | Sentry DSN for backend error reporting |
| `LOGTAIL_SOURCE_TOKEN` | Logtail ingestion token |
| `BACKUP_HEALTHCHECK_URL` | Production backup healthcheck URL; can be blank in staging |
| `UEX_API_KEY` | Optional UEX upstream API key |

See [infra/docs/secrets.md](/tmp/station-issue-128/infra/docs/secrets.md) for the full inventory and rotation procedures.

## Staging

Staging runs on the same VPS with separate ports and env file:

- backend: `127.0.0.1:3002 -> 3001`
- frontend: `127.0.0.1:3003 -> 80`
- env file: `/opt/station/.env.staging`
- compose file: `/opt/station/docker-compose.staging.yml`
- compose project: `station-staging` so staging commands do not target the production stack in the same directory

Useful commands:

```bash
cd /opt/station
bash infra/scripts/staging-up.sh
bash infra/scripts/staging-down.sh
bash infra/scripts/deploy-staging.sh
```

The release workflow rewrites `/opt/station/.env.staging` before every staging deploy and locks it down with `chmod 600`.

## Production

Production deploys through:

```bash
cd /opt/station
bash infra/scripts/deploy.sh
```

The release workflow rewrites `/opt/station/.env.production` before every production deploy and locks it down with `chmod 600`.
It also writes `/opt/station/rclone.conf` from the production B2 secrets and runs a pre-deploy PostgreSQL backup before the backend rollout begins.

## Rollback

1. Identify the last known good release tag in GitHub.
2. Re-run the release workflow from the matching `release/*` branch or repoint the `STATION_VERSION` on the VPS to the prior version tag.
3. Re-run the deploy script for staging or production.

## Notes

- The release workflow now runs its own backend/frontend validation before image build and deploy, so release branches are gated inside the same workflow that ships them.
- Release runs are serialized per release branch with a workflow-level concurrency group so repeated pushes or reruns on the same release branch queue behind the in-flight run instead of canceling it mid-deploy.
- The shared staging and production deploy jobs also use a global `station-deploy` concurrency group so different release branches cannot race each other on the same VPS or image promotion path.
- Release deployments pin the target host through `VPS_KNOWN_HOSTS` and use `StrictHostKeyChecking=yes` instead of trusting first use.
- Production deploys fail closed if the pre-deploy backup cannot be created and uploaded to Backblaze B2.
- Backend and frontend CI still run on `release/**` pushes, but the release workflow no longer depends on those separate runs to gate deploys because it executes the same validation steps itself.
- The release workflow shell-quotes `STATION_VERSION` before sending it over SSH so the remote deploy treats the version as data rather than shell syntax.
- Health-check polling bounds each `curl` attempt with explicit connect and total timeouts so a single hung request cannot stall the full deploy window.
- Release validation runs against `postgres:16-alpine` so the test database matches the same Postgres major version used by staging and production compose stacks.
- The frontend runtime derives the API host from the current hostname by default (`station.drdnt.org -> api.drdnt.org`, `staging.station.drdnt.org -> staging.api.drdnt.org`), while still allowing `VITE_API_URL` to override that mapping when needed. Unknown non-localhost hosts fall back to the same hostname on port `3001`, which keeps preview and LAN-accessed environments functional without baking a frontend-only localhost default.

## Release Notes

Release notes are generated from conventional commits with `git-cliff`:

- `cliff.toml` defines the changelog groups and rendering template.
- The release workflow generates `RELEASE_NOTES.md` for the current tag and uses it as the GitHub Release body and downloadable asset.
- The same release job regenerates the cumulative root `CHANGELOG.md` and commits it back to `main`.
- `.github/workflows/release-notes.yml` exists as a manual `workflow_dispatch` escape hatch for regenerating the release body for an existing tag without re-running the full deploy.

If you need to change how commits are grouped, edit `cliff.toml` and keep the group names aligned with the conventional commit types used in this repository.
