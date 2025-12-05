import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates inventory audit log table for tracking sharing events
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates the inventory_audit_log table for tracking all inventory
 * sharing events including manual shares/unshares and automatic unsharing when
 * users are removed from organizations.
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - drops table entirely (audit log data will be lost)
 */
export class CreateInventoryAuditLogTable1764950688227
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory_audit_log table
    await queryRunner.query(`
      CREATE TABLE "inventory_audit_log" (
        "id" BIGSERIAL PRIMARY KEY,

        -- Event classification
        "event_type" VARCHAR(100) NOT NULL,

        -- Related entities (nullable to support various event types)
        "user_id" BIGINT REFERENCES "user"("id") ON DELETE SET NULL,
        "org_id" INTEGER REFERENCES "organization"("id") ON DELETE SET NULL,
        "inventory_item_id" UUID REFERENCES "user_inventory_items"("id") ON DELETE SET NULL,

        -- Event details
        "records_affected" INTEGER,
        "reason" TEXT,
        "metadata" JSONB,

        -- Timestamp
        "date_created" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for common audit queries

    // Query by user and date (user activity timeline)
    await queryRunner.query(`
      CREATE INDEX "idx_inv_audit_user"
      ON "inventory_audit_log"("user_id", "date_created" DESC)
    `);

    // Query by organization (org audit trail)
    await queryRunner.query(`
      CREATE INDEX "idx_inv_audit_org"
      ON "inventory_audit_log"("org_id", "date_created" DESC)
    `);

    // Query by event type (e.g., find all auto-unshares)
    await queryRunner.query(`
      CREATE INDEX "idx_inv_audit_type"
      ON "inventory_audit_log"("event_type", "date_created" DESC)
    `);

    // Query by inventory item (item history)
    await queryRunner.query(`
      CREATE INDEX "idx_inv_audit_item"
      ON "inventory_audit_log"("inventory_item_id", "date_created" DESC)
      WHERE "inventory_item_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inv_audit_item"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inv_audit_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inv_audit_org"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inv_audit_user"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_audit_log"`);
  }
}
