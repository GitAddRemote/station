# Migration Templates

This directory contains templates and checklists for safe database migrations.

## Files

### migration-template.ts

A comprehensive TypeORM migration template with:

- Detailed documentation structure
- Example implementations for common operations
- Safety warnings and best practices
- Clear separation of up/down methods

**Usage**:

```bash
# Create a new migration
npm run typeorm migration:create src/migrations/YourMigrationName

# Copy the template structure from migration-template.ts
# Implement your up() and down() methods
```

### PRE_MIGRATION_CHECKLIST.md

A complete checklist to fill out before running any migration in production.

**Usage**:

1. Copy this file for each production migration
2. Fill out all sections before running the migration
3. Archive the completed checklist for audit purposes

## Quick Reference

### Safe Migration Workflow

1. **Create Migration**

   ```bash
   npm run typeorm migration:create src/migrations/YourMigrationName
   ```

2. **Implement Up/Down Methods**
   - Use `migration-template.ts` as a guide
   - Ensure `down()` successfully reverses `up()`

3. **Test in Development**

   ```bash
   npm run typeorm migration:run
   npm run typeorm migration:revert  # Test rollback
   ```

4. **Before Production**
   - Fill out `PRE_MIGRATION_CHECKLIST.md`
   - Create backup: `npm run db:backup`
   - Verify backup

5. **Run in Production**

   ```bash
   npm run typeorm migration:run
   ```

6. **Verify Success**
   ```bash
   npm run db:health-check
   ```

## Documentation

For complete migration best practices, see:

- [Migration Guide](../../../docs/database/migrations.md)

## Support

If you encounter issues, refer to the troubleshooting section in the migration guide or consult the rollback decision tree.
