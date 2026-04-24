# CI/CD

This document describes the Station release pipeline introduced for issue `#90`.

## Release Flow

```text
release/v0.2.0 push
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
| `VPS_HOST`    | VPS public IP or hostname             |
| `VPS_USER`    | SSH user, expected to be `deploy`     |

## Staging

Staging runs on the same VPS with separate ports and env file:

- backend: `127.0.0.1:3002 -> 3001`
- frontend: `127.0.0.1:3003 -> 80`
- env file: `/opt/station/.env.staging`
- compose file: `/opt/station/docker-compose.staging.yml`

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
- CI workflows ignore `release/**` pushes so the release workflow remains the single deployment path.
