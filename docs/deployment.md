# Deployment Runbook

## Backups

Production deploys now create a pre-deploy PostgreSQL backup before the backend rollout starts. Nightly backups also run on the VPS at `03:00` via the `deploy` user's cron.

### Verify nightly backups

```bash
ssh deploy@<vps-host>
tail -f /opt/station/logs/backup.log
```

### List backups in Backblaze B2

```bash
ssh deploy@<vps-host>
export RCLONE_CONFIG=/opt/station/rclone.conf
rclone ls "b2:${B2_BUCKET}/postgres/"
```

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

The restore script stops the backend, restores into the running production Postgres container, and starts the backend again after the import finishes.
It replays the SQL dump into the current database. If you need a clean replacement restore, drop and recreate the target database first.
