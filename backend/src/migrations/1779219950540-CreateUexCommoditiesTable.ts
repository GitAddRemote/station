import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates UEX commodities table
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates uex_commodities table for storing commodity data
 * synced from the UEX /commodities endpoint, with soft-delete support,
 * audit timestamps, and performance indexes for commodity management screens.
 *
 * Estimated duration: < 5 seconds
 * Rollback safe: Yes - drops table entirely
 *
 * Dependencies: Requires CreateUexBaseTables migration to be run first
 */
export class CreateUexCommoditiesTable1779219950540
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "uex_commodities" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "id_category" INTEGER REFERENCES "uex_categories"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "kind" VARCHAR(50),
        "section" VARCHAR(100),
        "is_raw" BOOLEAN DEFAULT FALSE,
        "is_harvestable" BOOLEAN DEFAULT FALSE,
        "is_buyable" BOOLEAN DEFAULT FALSE,
        "is_sellable" BOOLEAN DEFAULT FALSE,
        "is_illegal" BOOLEAN DEFAULT FALSE,
        "is_fuel" BOOLEAN DEFAULT FALSE,
        "price_buy" DECIMAL(14,2),
        "price_sell" DECIMAL(14,2),
        "scu" DECIMAL(10,2),
        "mass" DECIMAL(10,2),
        "star_citizen_uuid" VARCHAR(255),
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_added" TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodities_active"
      ON "uex_commodities"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodities_category"
      ON "uex_commodities"("id_category")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodities_buyable"
      ON "uex_commodities"("is_buyable")
      WHERE "deleted" = FALSE AND "is_buyable" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodities_sellable"
      ON "uex_commodities"("is_sellable")
      WHERE "deleted" = FALSE AND "is_sellable" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodities_sync"
      ON "uex_commodities"("uex_date_modified")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_commodities_name"
      ON "uex_commodities"("name")
      WHERE "deleted" = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_commodities_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_commodities_sync"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_commodities_sellable"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_commodities_buyable"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_commodities_category"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_commodities_active"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_commodities"`);
  }
}
