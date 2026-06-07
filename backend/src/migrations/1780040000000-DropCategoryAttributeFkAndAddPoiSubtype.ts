import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropCategoryAttributeFkAndAddPoiSubtype1780040000000
  implements MigrationInterface
{
  name = 'DropCategoryAttributeFkAndAddPoiSubtype1780040000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // The UEX /categories API no longer returns attributes[], so station_category_attribute
    // is never populated. Drop the FK on station_item_attribute so item attributes can still
    // be stored with their raw id_category_attribute value without a dangling-FK failure.
    // Also relax NOT NULL since the FK reference target is now effectively always missing.
    await queryRunner.query(
      `ALTER TABLE "station_item_attribute"
       DROP CONSTRAINT IF EXISTS "station_item_attribute_category_attribute_uex_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_item_attribute"
       ALTER COLUMN "category_attribute_uex_id" DROP NOT NULL`,
    );

    // Add subtype column to station_poi (new live API field from /poi endpoint).
    await queryRunner.query(
      `ALTER TABLE "station_poi" ADD COLUMN IF NOT EXISTS "subtype" VARCHAR(80)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "station_poi" DROP COLUMN IF EXISTS "subtype"`,
    );

    // Intentionally NOT restoring the FK to station_category_attribute.
    // Once this migration has run and items-sync has ingested live data, any
    // station_item_attribute rows will contain raw UEX category_attribute_uex_id
    // values that have no matching rows in station_category_attribute (which is
    // never populated after the /categories attributes[] field was removed).
    // Re-adding the FK would fail immediately due to those orphaned IDs.
    // The column is restored to NOT NULL only; the FK is permanently dropped.
    await queryRunner.query(
      `UPDATE "station_item_attribute" SET "category_attribute_uex_id" = 0 WHERE "category_attribute_uex_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_item_attribute"
       ALTER COLUMN "category_attribute_uex_id" SET NOT NULL`,
    );
  }
}
