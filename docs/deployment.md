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

For the full procedure — including how to list and download backups, run a zero-risk restore drill, and verify row counts after a restore — see **[infra/docs/restore.md](../infra/docs/restore.md)**.

---

## What to do if things go wrong

| Scenario                                       | Action                                                                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Rows accidentally deleted (schema intact)      | Live restore — [infra/docs/restore.md §4b](../infra/docs/restore.md#4b-live-restore--production-only-for-actual-data-loss)       |
| Bad migration / schema corruption              | Check migration rollback first (`cd /opt/station/backend && pnpm migration:revert`); if that fails, live restore                 |
| Disk failure / volume deleted                  | Provision new VPS → bootstrap → live restore — [infra/docs/restore.md §6](../infra/docs/restore.md#6-decision-tree)              |
| Confirming backups are valid (quarterly drill) | Restore drill — [infra/docs/restore.md §4a](../infra/docs/restore.md#4a-restore-drill--throwaway-container-zero-production-risk) |
