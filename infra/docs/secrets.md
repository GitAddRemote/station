# Secrets Management

Station writes runtime environment files to the VPS during each deploy. Secrets stay in GitHub environment-scoped secrets and are never committed to the repository.

## Secret Inventory

Use GitHub repository environments for `staging` and `production`. Store the following environment-scoped secrets in each environment:

| Secret | staging | production | Notes |
| --- | --- | --- | --- |
| `VPS_HOST` | Yes | Yes | VPS public IP or hostname. Can be the same value in both environments. |
| `VPS_USER` | Yes | Yes | Deploy user, typically `deploy`. |
| `VPS_SSH_KEY` | Yes | Yes | Private SSH key for the deploy user. |
| `VPS_KNOWN_HOSTS` | Yes | Yes | Pinned host key entries for the deploy target. |
| `DATABASE_HOST` | Yes | Yes | For the current compose stack, use `postgres`. |
| `DATABASE_PORT` | Yes | Yes | For the current compose stack, use `5432`. |
| `DATABASE_USER` | Yes | Yes | Database role used by the backend and Postgres container bootstrap. |
| `DATABASE_PASSWORD` | Yes | Yes | Generate with `openssl rand -base64 32`. |
| `DATABASE_NAME` | Yes | Yes | Example: `stationDb` / `stationStagingDb`. |
| `JWT_SECRET` | Yes | Yes | Generate with `openssl rand -base64 48`. Minimum 32 characters. |
| `REDIS_PASSWORD` | Yes | Yes | Generate with `openssl rand -base64 24`. |
| `ALLOWED_ORIGIN` | Yes | Yes | `https://staging.station.drdnt.org` / `https://station.drdnt.org`. |
| `FRONTEND_URL` | Yes | Yes | Used in password-reset links. Should match the frontend URL. |
| `B2_ACCOUNT_ID` | Optional | Optional | Needed for backup work. |
| `B2_APPLICATION_KEY` | Optional | Optional | Needed for backup work. |
| `B2_BUCKET` | Optional | Optional | Example: `station-backups`. |
| `SENTRY_DSN` | Optional | Optional | Needed once Sentry is enabled. |
| `LOGTAIL_SOURCE_TOKEN` | Optional | Optional | Needed once log aggregation is enabled. |
| `BACKUP_HEALTHCHECK_URL` | Optional | Recommended | Production backup dead-man switch URL. Leave blank in staging if unused. |
| `UEX_API_KEY` | Optional | Optional | Leave blank unless the upstream API requires it. |

## Deploy-Time Environment Files

The release workflow writes:

- `/opt/station/.env.staging` during the `deploy-staging` job
- `/opt/station/.env.production` during the `deploy-production` job

Both files are recreated on every deploy and then locked down with `chmod 600`.

Verify file permissions on the VPS:

```bash
ssh deploy@<vps-host>
ls -la /opt/station/.env.production /opt/station/.env.staging
```

Expected mode:

```text
-rw------- 1 deploy deploy ...
```

## Generic Rotation Procedure

1. Generate the new secret value or retrieve it from the upstream service.
2. Update the GitHub Environment secret in `staging` or `production`.
3. Push a release branch or re-run the release workflow for the target environment.
4. Confirm the workflow rewrites the `.env` file on the VPS.
5. Verify the target environment is healthy.

## JWT Secret Rotation

Rotating `JWT_SECRET` invalidates every active access token and refresh token.

1. Generate a new value: `openssl rand -base64 48`
2. Update `JWT_SECRET` in the GitHub environment.
3. Deploy the target environment.
4. Expect users on that environment to sign in again.
5. Verify `/health` and a fresh login flow both succeed.

## Database Password Rotation

1. Generate a new value: `openssl rand -base64 32`
2. Update the Postgres role inside the running container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres \
  psql -U "${DATABASE_USER}" -d postgres -c "ALTER USER ${DATABASE_USER} WITH PASSWORD '<new-password>';"
```

3. Update `DATABASE_PASSWORD` in the GitHub environment.
4. Deploy the environment so the backend picks up the new password.
5. Verify `/health` and basic authenticated API access.

## SSH Key Rotation

1. Generate a new deploy key pair: `ssh-keygen -t ed25519 -f deploy_key_new`
2. Add the new public key to `/home/deploy/.ssh/authorized_keys` on the VPS.
3. Update `VPS_SSH_KEY` in the GitHub environment with the new private key.
4. Run a staging deploy to verify the new key works.
5. Remove the old public key from the VPS after the new deploy succeeds.
