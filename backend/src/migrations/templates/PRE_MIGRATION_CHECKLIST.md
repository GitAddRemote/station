# Pre-Migration Checklist

Use this checklist before running **every** migration in production.

## Migration Information

- **Migration Name**: `_______________________________`
- **Date**: `_______________________________`
- **Operator**: `_______________________________`
- **Environment**: [ ] Development [ ] Staging [ ] Production
- **Estimated Duration**: `_______________________________`

## Pre-Migration Steps

### 1. Backup & Safety

- [ ] Database backup created
  - Command used: `npm run db:backup`
  - Backup file: `_______________________________`
  - Backup size verified: `_______________________________`
- [ ] Backup restoration tested (in dev/staging)
- [ ] Rollback window defined: `_______________________________`
- [ ] Team notified of scheduled maintenance

### 2. Migration Review

- [ ] Migration code reviewed
- [ ] `up()` method implements forward changes
- [ ] `down()` method successfully reverses `up()` changes
- [ ] Migration tested in development environment
- [ ] Migration tested in staging environment (if applicable)
- [ ] No hard-coded values (uses environment variables)
- [ ] Indexes created for foreign keys
- [ ] Performance impact assessed

### 3. Dependencies

- [ ] All required previous migrations have run
- [ ] Database schema is in expected state
- [ ] No pending application deployments that conflict
- [ ] Application code is compatible with both pre and post-migration states (if possible)

### 4. Rollback Plan

- [ ] Rollback procedure documented below
- [ ] Rollback tested in development
- [ ] Data loss implications understood
- [ ] Recovery time objective (RTO) estimated: `_______________________________`

**Rollback Procedure**:

```bash
# Document exact steps to rollback this migration
npm run typeorm migration:revert
# OR restore from backup:
./src/database/scripts/restore-database.sh [backup-filename]
```

**Data Loss Impact**:

- [ ] No data loss
- [ ] Acceptable data loss: `_______________________________`
- [ ] Critical data loss: `_______________________________`

### 5. Monitoring & Validation

- [ ] Health check script ready
  - Command: `./src/database/scripts/health-check.sh`
- [ ] Post-migration validation queries prepared
- [ ] Performance benchmarks recorded (before migration)
- [ ] Alert system configured (if applicable)

### 6. Communication

- [ ] Stakeholders informed
- [ ] Maintenance window scheduled: `_______________________________`
- [ ] Runbook available and reviewed
- [ ] Escalation path defined

## Post-Migration Steps (Complete After Migration)

- [ ] Migration completed successfully
- [ ] Health check passed: `./src/database/scripts/health-check.sh`
- [ ] Application smoke tests passed
- [ ] Performance within acceptable range
- [ ] Monitoring confirms system stability
- [ ] Stakeholders notified of completion
- [ ] This checklist archived for audit

## Notes

(Add any special considerations, risks, or observations)

```

```

---

## Sign-Off

**Reviewed by**: `_______________________________`

**Approved by**: `_______________________________`

**Executed by**: `_______________________________`

**Date/Time**: `_______________________________`
