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
  -> create git tag and GitHub Release
```

## GitHub Environments

Create two repository environments in GitHub settings:

- `staging`: no protection rules
- `production`: require reviewer approval before deploy

## Required Secrets

| Secret        | Description                           |
| ------------- | ------------------------------------- |
| `VPS_SSH_KEY` | Private SSH key for the `deploy` user |
| `VPS_KNOWN_HOSTS` | Pinned SSH host key entries for the deploy target |
| `VPS_HOST`    | VPS public IP or hostname             |
| `VPS_USER`    | SSH user, expected to be `deploy`     |

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

## Production

Production deploys through:

```bash
cd /opt/station
bash infra/scripts/deploy.sh
```

## Rollback

1. Identify the last known good release tag in GitHub.
2. Re-run the release workflow from the matching `release/*` branch or repoint the `STATION_VERSION` on the VPS to the prior version tag.
3. Re-run the deploy script for staging or production.

## Notes

- The workflow currently writes a placeholder release notes file and should be upgraded with the release-notes generation from issue `#124`.
- The release workflow now runs its own backend/frontend validation before image build and deploy, so release branches are gated inside the same workflow that ships them.
- Release runs are serialized per release branch with a workflow-level concurrency group so repeated pushes or reruns on the same release branch queue behind the in-flight run instead of canceling it mid-deploy.
- The shared staging and production deploy jobs also use a global `station-deploy` concurrency group so different release branches cannot race each other on the same VPS or image promotion path.
- Release deployments pin the target host through `VPS_KNOWN_HOSTS` and use `StrictHostKeyChecking=yes` instead of trusting first use.
- Backend and frontend CI still run on `release/**` pushes, but the release workflow no longer depends on those separate runs to gate deploys because it executes the same validation steps itself.
- The release workflow shell-quotes `STATION_VERSION` before sending it over SSH so the remote deploy treats the version as data rather than shell syntax.
- Health-check polling bounds each `curl` attempt with explicit connect and total timeouts so a single hung request cannot stall the full deploy window.
- Release validation runs against `postgres:16-alpine` so the test database matches the same Postgres major version used by staging and production compose stacks.
- The frontend runtime derives the API host from the current hostname by default (`station.drdnt.org -> api.drdnt.org`, `staging.station.drdnt.org -> staging.api.drdnt.org`), while still allowing `VITE_API_URL` to override that mapping when needed. Unknown non-localhost hosts fall back to the same hostname on port `3001`, which keeps preview and LAN-accessed environments functional without baking a frontend-only localhost default.
