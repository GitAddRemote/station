# Backup Operations

## What is backed up

PostgreSQL data only. The database is backed up:

- **Nightly** at 3 AM UTC (cron job on the VPS)
- **Pre-deploy** before every production release (triggered by `release.yml`)

Redis is not backed up — its contents are derived from the database and repopulate automatically.

## Where backups live

Backblaze B2 bucket: `station-backups`

Path structure: `postgres/YYYYMM/YYYYMMDD_HHMMSS_<label>.sql.gz`

Examples:

```
postgres/202604/20260428_030000_nightly.sql.gz
postgres/202604/20260428_141200_pre-deploy-a3f9c12.sql.gz
```

## Verifying backups are running

Check the backup log on the VPS:

```bash
ssh deploy@<vps-host>
tail -50 /opt/station/logs/backup.log
```

A successful run ends with `[backup] Complete`. A failure will show the error from the failing command and no `Complete` line.

Also check the [healthchecks.io dashboard](https://healthchecks.io) — the **Station — nightly backup** check should show green. A grey or red status means a run was missed or failed.

## What to do when a backup alert fires

An alert from healthchecks.io means the backup script either failed or did not run at all. Work through this checklist:

1. SSH into the VPS and check the log:
   ```bash
   tail -100 /opt/station/logs/backup.log
   ```
2. Confirm the PostgreSQL container is running:
   ```bash
   cd /opt/station && docker compose -f docker-compose.prod.yml ps
   ```
3. Check B2 credentials are valid — re-run the backup manually:
   ```bash
   cd /opt/station && bash infra/scripts/backup-db.sh
   ```
4. If credentials expired, rotate `B2_ACCOUNT_ID` and `B2_APPLICATION_KEY` in GitHub environment secrets, then redeploy to refresh `.env.production`.
5. Confirm the cron job is still installed:
   ```bash
   crontab -l -u deploy
   ```
   Expected entry: `0 3 * * * cd /opt/station && bash infra/scripts/backup-db.sh >> /opt/station/logs/backup.log 2>&1`

## Retention policy

Backblaze B2 is configured with a **180-day lifecycle rule** on the `station-backups` bucket. Backups older than 180 days are deleted automatically.

## Silencing a false alarm

If you know a backup will be delayed (e.g. planned maintenance window), log into healthchecks.io, open the **Station — nightly backup** check, and click **Pause** or **Mute for X hours** before the scheduled run time. Re-enable it once the maintenance window closes.

## How to restore

Use `infra/scripts/restore-db.sh` with the B2 path to the backup file:

```bash
cd /opt/station
bash infra/scripts/restore-db.sh postgres/202604/20260428_030000_nightly.sql.gz
```

The script will:

1. Download the backup from B2
2. Stop the backend container
3. Replay the SQL dump into the running PostgreSQL container
4. Restart the backend

Press `Ctrl+C` within the 5-second countdown to abort safely. The backend is stopped only after the countdown completes.

To list available backups:

```bash
rclone --config /opt/station/rclone.conf ls b2:station-backups/postgres/
```
