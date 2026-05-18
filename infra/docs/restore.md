# PostgreSQL Restore Runbook

Use this document whenever you need to recover data from a Backblaze B2 backup — whether it is a drill, accidental deletion, a bad migration, or a full VPS rebuild.

---

## 1. Prerequisites

Before starting any restore:

- `rclone` is configured on the VPS with B2 credentials at `/opt/station/rclone.conf`
- Docker is running: `docker ps` returns no error
- `/opt/station/.env.production` is present
- Enough disk space: `df -h /tmp` should show at least 3× the compressed backup size free (nightly backups are typically 1–5 MB compressed; allow 50 MB to be safe)
- You are SSH'd in as the `deploy` user on the production VPS

---

## 2. List available backups

```bash
export RCLONE_CONFIG=/opt/station/rclone.conf
B2_BUCKET="$(grep '^B2_BUCKET=' /opt/station/.env.production | cut -d= -f2-)"

# List all backups, most recent first
rclone ls "b2:${B2_BUCKET}" --include "postgres/**" | sort -k2 -r | head -20
```

Example output:

```
45231234 postgres/202605/20260510_030000_nightly.sql.gz
44891234 postgres/202605/20260509_030000_nightly.sql.gz
44123456 postgres/202605/20260508_150000_pre-deploy-abc1234.sql.gz
```

**Naming convention:** `YYYYMMDD_HHMMSS_<label>.sql.gz`

- `nightly` — automated 03:00 UTC cron backup
- `pre-deploy-<sha>` — taken automatically before each production release

For data loss from a bad migration, prefer the `pre-deploy-<sha>` backup taken just before the offending release.

---

## 3. Download a backup

```bash
BACKUP_PATH="postgres/202605/20260510_030000_nightly.sql.gz"

cd /opt/station
export RCLONE_CONFIG=/opt/station/rclone.conf
B2_BUCKET="$(grep '^B2_BUCKET=' .env.production | cut -d= -f2-)"

rclone copyto "b2:${B2_BUCKET}/${BACKUP_PATH}" /tmp/restore.sql.gz \
  --b2-chunk-size 96M --progress

echo "Downloaded: $(du -sh /tmp/restore.sql.gz | cut -f1)"
```

---

## 4a. Restore drill — throwaway container (zero production risk)

Run this quarterly to confirm backups are valid and you know the procedure.

```bash
source /opt/station/.env.production
export DOCKER_HOST="unix:///run/user/$(id -u)/docker.sock"

# Spin up a throwaway Postgres container
docker run --rm -d \
  --name station-restore-drill \
  -e POSTGRES_USER="${DATABASE_USER}" \
  -e POSTGRES_PASSWORD=drillonly \
  -e POSTGRES_DB="${DATABASE_NAME}" \
  postgres:16-alpine

# Wait for Postgres to be ready (up to 30 s)
for i in $(seq 1 30); do
  docker exec station-restore-drill pg_isready -U "${DATABASE_USER}" -d "${DATABASE_NAME}" -q && break
  [ "$i" -eq 30 ] && { echo "Postgres did not become ready in 30 s"; docker stop station-restore-drill; exit 1; }
  sleep 1
done

# Restore into it
gunzip -c /tmp/restore.sql.gz | \
  docker exec -i station-restore-drill \
    psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}"

# Verify key tables (adjust if schema has changed)
docker exec station-restore-drill \
  psql -U "${DATABASE_USER}" -d "${DATABASE_NAME}" -c "
    SELECT 'users'         AS table_name, COUNT(*) FROM users
    UNION ALL
    SELECT 'organizations',               COUNT(*) FROM organizations
    UNION ALL
    SELECT 'roles',                        COUNT(*) FROM roles;
  "

# Tear down
docker stop station-restore-drill
rm /tmp/restore.sql.gz
echo "Drill complete. Throwaway container removed. Record result in Section 8."
```

---

## 4b. Live restore — production (only for actual data loss)

> **Warning:** This replays the SQL dump into the live database. If you need a clean schema replacement, manually drop and recreate the database inside the Postgres container before piping the dump. The restore script handles stopping and restarting the backend.

```bash
cd /opt/station
bash infra/scripts/restore-db.sh postgres/202605/20260510_030000_nightly.sql.gz
```

The script will:

1. Download the backup from B2
2. Wait 5 seconds (press `Ctrl+C` to abort safely)
3. Stop the `backend` container to prevent writes during restore
4. Pipe the decompressed dump into the running `postgres` container
5. Restart the `backend` container
6. Clean up the local temp file

The `backend` is guaranteed to restart even if the restore fails — a `trap` in the script handles cleanup on exit.

---

## 5. Post-restore verification

Run these after any restore (drill or live):

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

# Application health (live restore only)
curl -f https://api.drdnt.org/health && echo "Backend is healthy"
```

---

## 6. Decision tree

```
Need to restore?
│
├─ Rows accidentally deleted (data loss, schema intact)?
│   └─ Live restore (Section 4b)
│       Stop backend → restore → restart → verify (Section 5)
│
├─ Bad migration / schema corruption?
│   └─ Check backend/docs/database/migrations.md first
│       TypeORM revert may be faster and safer
│       If that fails → live restore (Section 4b)
│
├─ Disk failure / volume deleted (data AND schema gone)?
│   └─ Provision new VPS → sudo bash infra/scripts/bootstrap-vps.sh (must run as root)
│       → copy .env.production and rclone.conf
│       → live restore (Section 4b) → verify
│
└─ Confirming backups are valid?
    └─ Restore drill (Section 4a) — zero production risk
```

---

## 7. Estimated downtime

| Scenario                                    | Estimated downtime          |
| ------------------------------------------- | --------------------------- |
| Drill (throwaway container)                 | Zero — production untouched |
| Live restore, small DB (<100 MB compressed) | 5–10 minutes                |
| Live restore, medium DB (100 MB–1 GB)       | 15–30 minutes               |
| Full VPS rebuild + restore                  | 45–90 minutes               |

These estimates assume the backup file is already downloaded. Download time from B2 depends on file size and network — factor in an additional 1–2 minutes for typical nightly backups.

---

## 8. Drill log

Append a row after each quarterly drill. The first entry establishes the baseline for how long a restore takes.

| Date | Backup tested | Download time | Restore time | Row counts verified | Notes |
| ---- | ------------- | ------------- | ------------ | ------------------- | ----- |
|      |               |               |              |                     |       |

**Drill cadence:** quarterly (every 3 months). Schedule the next drill after completing each entry.
