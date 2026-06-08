import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpgradeStationUnitOfMeasureReferenceData1780100000000
  implements MigrationInterface
{
  name = 'UpgradeStationUnitOfMeasureReferenceData1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        RENAME COLUMN "code" TO "abbreviation"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        RENAME CONSTRAINT "uq_station_unit_of_measure_code"
        TO "uq_station_unit_of_measure_abbreviation"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        RENAME COLUMN "label" TO "name"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        DROP COLUMN "description"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        ADD COLUMN "catalog_kind" VARCHAR(20) NULL,
        ADD COLUMN "scale_factor" NUMERIC(18,6) NOT NULL DEFAULT 1,
        ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        ADD CONSTRAINT "chk_station_unit_of_measure_catalog_kind"
          CHECK ("catalog_kind" IN ('item', 'commodity', 'vehicle') OR "catalog_kind" IS NULL)
    `);

    await queryRunner.query(`
      UPDATE "station_unit_of_measure"
      SET
        "abbreviation" = CASE
          WHEN "abbreviation" = 'unit' THEN 'unit'
          WHEN "abbreviation" = 'scu' THEN 'SCU'
          WHEN "abbreviation" = 'cscu' THEN 'cSCU'
          WHEN "abbreviation" = 'uscu' THEN 'μSCU'
          ELSE "abbreviation"
        END,
        "catalog_kind" = CASE
          WHEN "abbreviation" IN ('scu', 'cscu', 'uscu') THEN 'commodity'
          ELSE NULL
        END,
        "scale_factor" = CASE
          WHEN "abbreviation" = 'cscu' THEN 0.010000
          WHEN "abbreviation" = 'uscu' THEN 0.000001
          ELSE 1.000000
        END,
        "sort_order" = CASE
          WHEN "abbreviation" = 'unit' THEN 1
          WHEN "abbreviation" = 'scu' THEN 2
          WHEN "abbreviation" = 'cscu' THEN 3
          WHEN "abbreviation" = 'uscu' THEN 4
          ELSE 100
        END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        DROP CONSTRAINT IF EXISTS "chk_station_unit_of_measure_catalog_kind"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        DROP COLUMN "is_active",
        DROP COLUMN "sort_order",
        DROP COLUMN "scale_factor",
        DROP COLUMN "catalog_kind"
    `);

    await queryRunner.query(`
      UPDATE "station_unit_of_measure"
      SET
        "abbreviation" = CASE
          WHEN "abbreviation" = 'SCU' THEN 'scu'
          WHEN "abbreviation" = 'cSCU' THEN 'cscu'
          WHEN "abbreviation" = 'μSCU' THEN 'uscu'
          ELSE "abbreviation"
        END
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        ADD COLUMN "description" TEXT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        RENAME COLUMN "name" TO "label"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        RENAME CONSTRAINT "uq_station_unit_of_measure_abbreviation"
        TO "uq_station_unit_of_measure_code"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_unit_of_measure"
        RENAME COLUMN "abbreviation" TO "code"
    `);
  }
}
