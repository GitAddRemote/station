import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Resizes the `alias` column on `station_inventory_item` from VARCHAR(255) to
 * VARCHAR(64) to match the 64-character limit enforced by the application layer.
 * The column is nullable so existing NULL values are unaffected; any existing
 * non-null values longer than 64 characters are truncated on `up()` and the
 * original bound is restored on `down()`.
 */
export class AddAliasToInventoryItem1780180000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Truncate any values that exceed the new limit before altering the type.
    await queryRunner.query(`
      UPDATE "station_inventory_item"
      SET    "alias" = LEFT("alias", 64)
      WHERE  "alias" IS NOT NULL
        AND  LENGTH("alias") > 64
    `);

    await queryRunner.query(`
      ALTER TABLE "station_inventory_item"
        ALTER COLUMN "alias" TYPE VARCHAR(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_inventory_item"
        ALTER COLUMN "alias" TYPE VARCHAR(255)
    `);
  }
}
