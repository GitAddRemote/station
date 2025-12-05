import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates org inventory items table for organization-owned assets
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates the org_inventory_items table for tracking org-owned
 * inventory with per-location quantities, soft-delete support, and audit trails.
 * This is distinct from user_inventory_items (which tracks user-owned items
 * that can be shared with orgs for visibility).
 *
 * Estimated duration: < 15 seconds
 * Rollback safe: Yes - drops table entirely (no data loss if no inventory created)
 */
export class CreateOrgInventoryItemsTable1764964935270
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create org_inventory_items table
    await queryRunner.query(`
      CREATE TABLE "org_inventory_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Core ownership and item references
        "org_id" INTEGER NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "game_id" INTEGER NOT NULL REFERENCES "games"("id"),
        "uex_item_id" INTEGER NOT NULL REFERENCES "uex_items"("uex_id"),
        "location_id" BIGINT NOT NULL REFERENCES "locations"("id"),

        -- Quantity and notes
        "quantity" DECIMAL(12,2) NOT NULL CHECK ("quantity" > 0),
        "notes" TEXT,

        -- Status flags
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,

        -- Audit fields
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "added_by" BIGINT NOT NULL REFERENCES "user"("id"),
        "modified_by" BIGINT NOT NULL REFERENCES "user"("id")
      )
    `);

    // Create indexes for common query patterns

    // Fast org inventory list by org and game
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_org_game"
      ON "org_inventory_items"("org_id", "game_id", "deleted")
      WHERE "deleted" = FALSE
    `);

    // Item lookup queries
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_item"
      ON "org_inventory_items"("uex_item_id")
      WHERE "deleted" = FALSE
    `);

    // Location-based queries
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_location"
      ON "org_inventory_items"("location_id")
      WHERE "deleted" = FALSE
    `);

    // Recently modified for activity feeds
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_recent"
      ON "org_inventory_items"("org_id", "date_modified" DESC)
      WHERE "deleted" = FALSE
    `);

    // Active items filter
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_active"
      ON "org_inventory_items"("org_id", "active")
      WHERE "deleted" = FALSE
    `);

    // Create quantity validation trigger (reuse existing function from user inventory)
    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_org_inventory_quantity
        BEFORE INSERT OR UPDATE ON "org_inventory_items"
        FOR EACH ROW
        EXECUTE FUNCTION validate_inventory_quantity();
    `);

    // Create auto-update modified timestamp trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_org_inventory_modified_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.date_modified = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_update_org_inventory_modified
        BEFORE UPDATE ON "org_inventory_items"
        FOR EACH ROW
        EXECUTE FUNCTION update_org_inventory_modified_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers and functions
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_update_org_inventory_modified ON "org_inventory_items"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_org_inventory_modified_timestamp()`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_validate_org_inventory_quantity ON "org_inventory_items"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_recent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_item"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_org_game"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "org_inventory_items"`);
  }
}
