import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes all org inventory sharing artefacts introduced before contract-based
 * sharing:
 *
 * 1. Drops the `org_shared_inventory_summary` view (depends on shared_org_id).
 * 2. Drops `idx_user_inv_org_view` index and the `shared_org_id` column from
 *    `user_inventory_item` (legacy integer-PK table from BigBang baseline).
 *    NOTE: the UUID-v7 migration already re-created the identity index without
 *    shared_org_id in its sentinel, so we only need to drop the org-view index.
 * 3. Drops the identity index that still embeds the shared_org_id sentinel,
 *    recreates it without that column, and drops the FK constraint.
 * 4. Drops `is_org_available` from `station_inventory_item`.
 * 5. Drops `is_shared` from `station_inventory_list`.
 * 6. Strips `can_view_member_shared_items` from every role's JSONB permissions.
 * 7. Updates seeded role descriptions to remove "member shared items" language.
 */
export class RemoveOrgInventorySharing1780170000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop the org_shared_inventory_summary view (if it exists)
    await queryRunner.query(
      `DROP VIEW IF EXISTS "org_shared_inventory_summary" CASCADE`,
    );

    // 2. Drop the org-view partial index on user_inventory_item
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_org_view"`);

    // 3. Drop the identity index that embeds shared_org_id as a sentinel,
    //    recreate it without that column, then drop the FK and column.
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_identity"`);

    // Recreate the identity index without shared_org_id
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_inv_identity"
        ON "user_inventory_item"
        ("user_id", "game_id", "uex_item_id", "unit_of_measure",
         COALESCE("location_type", ''), COALESCE("location_uex_id", -1))
        WHERE "deleted" = false AND "active" = true
    `);

    // Drop FK constraint referencing organization
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item"
         DROP CONSTRAINT IF EXISTS "user_inventory_item_shared_org_id_fkey"`,
    );

    // Drop the shared_org_id column
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" DROP COLUMN IF EXISTS "shared_org_id"`,
    );

    // 4. Drop is_org_available from station_inventory_item
    await queryRunner.query(
      `ALTER TABLE "station_inventory_item" DROP COLUMN IF EXISTS "is_org_available"`,
    );

    // 5. Drop is_shared from station_inventory_list
    await queryRunner.query(
      `ALTER TABLE "station_inventory_list" DROP COLUMN IF EXISTS "is_shared"`,
    );

    // 6. Strip can_view_member_shared_items from stored JSONB permission objects
    await queryRunner.query(`
      UPDATE "role"
      SET    "permissions" = "permissions" - 'can_view_member_shared_items'
      WHERE  "permissions" ? 'can_view_member_shared_items'
    `);

    // 7. Update seeded role descriptions
    await queryRunner.query(`
      UPDATE "role"
      SET    "description" = 'Full inventory access. Can view, edit, and administer organization inventory.'
      WHERE  "name" IN ('Owner', 'Admin', 'Director', 'Inventory Manager')
        AND  "description" LIKE '%view member shared items%'
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET    "description" = 'Standard member access. Can view organization inventory.'
      WHERE  "name" = 'Member'
        AND  "description" LIKE '%member shared items%'
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET    "description" = 'Guest-level access. Cannot view organization inventory.'
      WHERE  "name" = 'Viewer'
        AND  "description" LIKE '%member items%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 7. Restore role descriptions (best-effort; custom descriptions are lost)
    await queryRunner.query(`
      UPDATE "role"
      SET    "description" = 'Full inventory access. Can view, edit, and administer organization inventory, and view member shared items.'
      WHERE  "name" IN ('Owner', 'Admin', 'Director', 'Inventory Manager')
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET    "description" = 'Standard member access. Can view organization inventory and member shared items.'
      WHERE  "name" = 'Member'
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET    "description" = 'Guest-level access. Cannot view organization inventory or member items.'
      WHERE  "name" = 'Viewer'
    `);

    // 6. Restore can_view_member_shared_items to seeded roles
    await queryRunner.query(`
      UPDATE "role"
      SET    "permissions" = "permissions" || '{"can_view_member_shared_items": true}'::jsonb
      WHERE  "name" IN ('Owner', 'Admin', 'Director', 'Inventory Manager', 'Member')
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET    "permissions" = "permissions" || '{"can_view_member_shared_items": false}'::jsonb
      WHERE  "name" = 'Viewer'
    `);

    // 5. Restore is_shared on station_inventory_list
    await queryRunner.query(
      `ALTER TABLE "station_inventory_list"
         ADD COLUMN "is_shared" BOOLEAN NOT NULL DEFAULT FALSE`,
    );

    // 4. Restore is_org_available on station_inventory_item
    await queryRunner.query(
      `ALTER TABLE "station_inventory_item"
         ADD COLUMN "is_org_available" BOOLEAN NOT NULL DEFAULT FALSE`,
    );

    // 3. Restore shared_org_id on user_inventory_item
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item"
         ADD COLUMN "shared_org_id" UUID`,
    );

    await queryRunner.query(
      `ALTER TABLE "user_inventory_item"
         ADD CONSTRAINT "user_inventory_item_shared_org_id_fkey"
         FOREIGN KEY ("shared_org_id")
         REFERENCES "organization"("id")
         ON DELETE SET NULL`,
    );

    // Drop the simplified identity index, recreate the one with shared_org_id
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_identity"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_inv_identity"
        ON "user_inventory_item"
        ("user_id", "game_id", "uex_item_id", "unit_of_measure",
         COALESCE("location_type", ''), COALESCE("location_uex_id", -1),
         COALESCE("shared_org_id", 'ffffffff-ffff-4fff-bfff-ffffffffffff'::uuid))
        WHERE "deleted" = false AND "active" = true
    `);

    // Restore the org-view index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_inv_org_view"
        ON "user_inventory_item" ("shared_org_id", "uex_item_id")
        WHERE "deleted" = false AND "shared_org_id" IS NOT NULL
    `);

    // 1. Restore the org_shared_inventory_summary view
    await queryRunner.query(`
      CREATE VIEW "org_shared_inventory_summary" AS
      SELECT
        uii."shared_org_id"                           AS "org_id",
        si."id"                                       AS "uex_item_id",
        si."name"                                     AS "item_name",
        SUM(uii."quantity")                           AS "total_quantity",
        COUNT(DISTINCT uii."user_id")                 AS "contributor_count"
      FROM   "user_inventory_item" uii
      JOIN   "station_item"        si  ON si."id" = uii."uex_item_id"
      WHERE  uii."deleted"        = false
        AND  uii."shared_org_id"  IS NOT NULL
      GROUP BY uii."shared_org_id", si."id", si."name"
    `);
  }
}
