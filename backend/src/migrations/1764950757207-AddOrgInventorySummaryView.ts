import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates materialized view for org shared inventory summary
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates a materialized view that provides fast aggregated queries
 * for organization inventory dashboards. Shows total quantities, unique items,
 * and contributing users per organization. Should be refreshed periodically
 * (e.g., via cron job or on-demand).
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - drops view (no data loss, view is regeneratable)
 */
export class AddOrgInventorySummaryView1764950757207
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create materialized view for org inventory summary
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW "org_shared_inventory_summary" AS
      SELECT
        "shared_org_id" as "org_id",
        "uex_item_id",
        "location_id",
        COUNT(DISTINCT "user_id") as "sharing_users_count",
        SUM("quantity") as "total_quantity_shared",
        MAX("date_modified") as "last_updated"
      FROM "user_inventory_items"
      WHERE "deleted" = FALSE
        AND "active" = TRUE
        AND "shared_org_id" IS NOT NULL
      GROUP BY "shared_org_id", "uex_item_id", "location_id"
    `);

    // Create index on the materialized view for fast lookups
    await queryRunner.query(`
      CREATE INDEX "idx_org_shared_summary"
      ON "org_shared_inventory_summary"("org_id", "uex_item_id")
    `);

    // Create index for location-based queries
    await queryRunner.query(`
      CREATE INDEX "idx_org_shared_summary_location"
      ON "org_shared_inventory_summary"("org_id", "location_id")
    `);

    // Note: To refresh this view, run:
    // REFRESH MATERIALIZED VIEW CONCURRENTLY "org_shared_inventory_summary"
    // This should be done periodically via a cron job or on-demand when needed
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes (will be dropped with view, but explicit for clarity)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_org_shared_summary_location"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_shared_summary"`);

    // Drop materialized view
    await queryRunner.query(
      `DROP MATERIALIZED VIEW IF EXISTS "org_shared_inventory_summary"`,
    );
  }
}
