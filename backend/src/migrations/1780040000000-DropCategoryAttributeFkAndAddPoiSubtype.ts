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

    await queryRunner.query(
      `ALTER TABLE "station_item_attribute"
       ALTER COLUMN "category_attribute_uex_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_item_attribute"
       ADD CONSTRAINT "station_item_attribute_category_attribute_uex_id_fkey"
       FOREIGN KEY ("category_attribute_uex_id")
       REFERENCES "station_category_attribute" ("uex_id") ON DELETE CASCADE`,
    );
  }
}
