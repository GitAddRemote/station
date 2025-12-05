import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates user inventory items table with location support and sharing
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates the user_inventory_items table for tracking user-owned
 * inventory with per-location quantities, soft-delete support, and optional
 * organization sharing capabilities.
 *
 * Estimated duration: < 15 seconds
 * Rollback safe: Yes - drops table entirely (no data loss if no inventory created)
 */
export class CreateUserInventoryItemsTable1764950546163
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_inventory_items table
    await queryRunner.query(`
      CREATE TABLE "user_inventory_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        -- Core ownership and item references
        "user_id" BIGINT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "game_id" INTEGER NOT NULL REFERENCES "games"("id"),
        "uex_item_id" INTEGER NOT NULL REFERENCES "uex_items"("uex_id"),
        "location_id" BIGINT NOT NULL REFERENCES "locations"("id"),

        -- Quantity and notes
        "quantity" DECIMAL(12,2) NOT NULL CHECK ("quantity" > 0),
        "notes" TEXT,

        -- Organization sharing (nullable - NULL means not shared)
        "shared_org_id" INTEGER REFERENCES "organization"("id") ON DELETE SET NULL,

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

    // Fast user inventory list
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_list"
      ON "user_inventory_items"("user_id", "game_id", "deleted", "active")
      WHERE "deleted" = FALSE
    `);

    // Org shared items view (for organization inventory dashboard)
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_org_view"
      ON "user_inventory_items"("shared_org_id", "uex_item_id")
      WHERE "deleted" = FALSE AND "shared_org_id" IS NOT NULL
    `);

    // Item aggregation queries (total quantity per item)
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_item_agg"
      ON "user_inventory_items"("user_id", "uex_item_id", "deleted")
      WHERE "deleted" = FALSE
    `);

    // Recently modified for activity feeds
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_recent"
      ON "user_inventory_items"("user_id", "date_modified" DESC)
      WHERE "deleted" = FALSE
    `);

    // Location-based queries
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_location"
      ON "user_inventory_items"("location_id")
      WHERE "deleted" = FALSE
    `);

    // Org-specific shared inventory (optimized for org inventory views)
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_org_shared"
      ON "user_inventory_items"("shared_org_id", "uex_item_id", "location_id")
      WHERE "deleted" = FALSE AND "active" = TRUE AND "shared_org_id" IS NOT NULL
    `);

    // Create quantity validation trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_inventory_quantity()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.quantity <= 0 THEN
          RAISE EXCEPTION 'Quantity must be greater than zero';
        END IF;

        IF NEW.quantity > 999999999.99 THEN
          RAISE EXCEPTION 'Quantity exceeds maximum allowed value';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_quantity
        BEFORE INSERT OR UPDATE ON "user_inventory_items"
        FOR EACH ROW
        EXECUTE FUNCTION validate_inventory_quantity();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_validate_quantity ON "user_inventory_items"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS validate_inventory_quantity()`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_org_shared"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_recent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_item_agg"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_org_view"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_list"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_inventory_items"`);
  }
}
