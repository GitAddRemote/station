# Migration Rollback Runbook

Use this document whenever a database migration fails during a production deploy. The goal is to restore service in under 15 minutes by following a checklist — not by improvising.

---

## 1. Before you start — assess the situation

SSH in as the `deploy` user and gather the facts before acting.

```bash
source /opt/station/.env.production
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"

# Is the backend running?
docker compose -f /opt/station/docker-compose.prod.yml ps

# What is the error?
docker compose -f /opt/station/docker-compose.prod.yml logs backend --tail=50

# Which migration ran last?
docker compose -f /opt/station/docker-compose.prod.yml \
  exec -T postgres psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}" \
  -c "SELECT name, timestamp FROM migrations ORDER BY timestamp DESC LIMIT 5;"
```

Answer these questions before choosing a path:

1. Is the backend container starting at all (even if it restarts repeatedly)?
2. What is the exact error message?
3. Which migration was running when it failed?

---

## 2. Decision tree

```
Migration failed during deploy
│
├─ Does the backend container start at all?
│   │
│   ├─ YES → Try Fast Path (Section 3)
│   │
│   └─ NO  → Go to Safe Path (Section 4)
│
└─ Did Fast Path succeed?
    │
    ├─ YES → Done. Redeploy previous image (Section 5).
    │
    └─ NO  → Go to Safe Path (Section 4)
```

---

## 3. Fast path — TypeORM revert

**Estimated time: 2–5 minutes**

This runs the `down()` method of the most recently applied migration. It only works if `down()` is correctly implemented and the database is in a consistent state.

```bash
source /opt/station/.env.production
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"

# If the backend container is running, revert inside it:
docker exec station-backend-1 sh -c \
  "cd /app && node node_modules/.bin/typeorm migration:revert -d dist/data-source.js"

# If the backend container is not running, start it temporarily with the current image:
source /opt/station/.env.production
docker run --rm \
  --env-file /opt/station/.env.production \
  --network station_default \
  ghcr.io/gitaddremote/station-backend:${STATION_VERSION} \
  sh -c "node node_modules/.bin/typeorm migration:revert -d dist/data-source.js"
```

**Verify the migration was reverted:**

```bash
docker compose -f /opt/station/docker-compose.prod.yml \
  exec -T postgres psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}" \
  -c "SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 3;"
```

The broken migration should no longer appear in the list.

If this succeeds → proceed to **Section 5** (redeploy previous image).
If this errors → proceed to **Section 4** (safe path).

---

## 4. Safe path — restore pre-deploy backup

**Estimated time: 10–20 minutes** (depending on database size)

Every production deploy creates a backup labelled with the git SHA immediately before running migrations. This is your guaranteed rollback point.

### 4a. Find the pre-deploy backup

```bash
# Get the git SHA from the failing GitHub Actions workflow run
# (visible in the Actions tab of the repository)
DEPLOY_SHA="abc1234"   # replace with the actual 7-character SHA

source /opt/station/.env.production
export RCLONE_CONFIG=/opt/station/rclone.conf
B2_BUCKET="$(grep '^B2_BUCKET=' /opt/station/.env.production | cut -d= -f2-)"

rclone ls "b2:${B2_BUCKET}/postgres/" | grep "pre-deploy-${DEPLOY_SHA}"
```

Expected output:

```
45012345 postgres/202605/20260510_150000_pre-deploy-abc1234.sql.gz
```

### 4b. Restore

```bash
BACKUP_PATH="postgres/202605/20260510_150000_pre-deploy-abc1234.sql.gz"

cd /opt/station
bash infra/scripts/restore-db.sh "${BACKUP_PATH}"
```

The script stops the backend, restores the database, and restarts the backend automatically. A `trap` ensures the backend restarts even if the restore fails.

For a step-by-step breakdown of what the script does and post-restore row count verification, see [`infra/docs/restore.md`](restore.md).

---

## 5. Redeploy the previous image

After either path, the running backend image may still be the broken one. Redeploy the last known-good release.

```bash
source /opt/station/.env.production
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"

# Find the previous release tag on GitHub:
# https://github.com/GitAddRemote/station/releases
# Use the tag immediately before the one that failed (e.g. v0.1.9)

PREVIOUS_TAG="v0.1.9"   # replace with the actual previous tag

STATION_VERSION="${PREVIOUS_TAG}" \
  docker compose \
    --env-file /opt/station/.env.production \
    -f /opt/station/docker-compose.prod.yml \
    up -d backend

# Verify health
curl -f https://api.drdnt.org/health && echo "Rollback complete"
```

---

## 6. Post-rollback checklist

Run these after completing either path:

```bash
source /opt/station/.env.production
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"

# Row counts across core tables
docker compose --env-file /opt/station/.env.production \
  -f /opt/station/docker-compose.prod.yml \
  exec -T postgres psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}" -c "
    SELECT
      (SELECT COUNT(*) FROM users)         AS users,
      (SELECT COUNT(*) FROM organizations) AS organizations,
      (SELECT COUNT(*) FROM roles)         AS roles;
  "

# Application health
curl -f https://api.drdnt.org/health && echo "Backend is healthy"
```

Then:

- [ ] Open an incident issue on GitHub: what migration failed, which path was taken, data loss window if any (safe path only)
- [ ] Fix the migration — either the `down()` method or the SQL error in `up()`
- [ ] Do **not** skip the pre-deploy backup on the retry deploy
- [ ] Re-run the fixed migration after verifying it in a dev environment with `pnpm migration:run` and `pnpm migration:revert`

---

## 7. Rehearsal log

Run a rehearsal before each major release that includes schema changes. Record results here.

### Rehearsal procedure

1. In development, intentionally write a migration whose `down()` method is broken (e.g., wrong table name)
2. Apply the migration: `pnpm migration:run`
3. Attempt the fast path revert — confirm it fails due to the broken `down()`
4. Run the safe path restore using a recent backup
5. Verify the database is back to its pre-migration state
6. Fix the migration and re-run to confirm the real `down()` works
7. Record the result in the table below

| Date | Path tested | Duration | Notes |
| ---- | ----------- | -------- | ----- |
|      |             |          |       |
