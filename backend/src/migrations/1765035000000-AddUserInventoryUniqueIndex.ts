import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ensures a user cannot have multiple active, non-deleted records for the same item and location (per shared org).
 */
export class AddUserInventoryUniqueIndex1765035000000
  implements MigrationInterface
{
  name = 'AddUserInventoryUniqueIndex1765035000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate active records before enforcing the unique index.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY user_id, game_id, uex_item_id, location_id, COALESCE(shared_org_id, -1)
            ORDER BY date_modified DESC
          ) AS rn
        FROM user_inventory_items
        WHERE deleted = FALSE
          AND active = TRUE
      )
      DELETE FROM user_inventory_items
      WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_inventory_unique_location
      ON user_inventory_items (
        user_id,
        game_id,
        uex_item_id,
        location_id,
        COALESCE(shared_org_id, -1),
        active,
        deleted
      )
      WHERE deleted = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_user_inventory_unique_location
    `);
  }
}
