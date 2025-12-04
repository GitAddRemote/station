import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates UEX items table
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates uex_items table with foreign key references to categories
 * and companies, soft-delete support, audit timestamps, and performance indexes.
 *
 * Estimated duration: < 5 seconds
 * Rollback safe: Yes - drops table entirely
 *
 * Dependencies: Requires CreateUexBaseTables migration to be run first
 */
export class CreateUexItemsTable1764802975691 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create uex_items table
    await queryRunner.query(`
      CREATE TABLE "uex_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "star_citizen_uuid" VARCHAR(255),
        "id_category" INTEGER REFERENCES "uex_categories"("uex_id"),
        "id_company" INTEGER REFERENCES "uex_companies"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "section" VARCHAR(100),
        "category" VARCHAR(100),
        "company_name" VARCHAR(255),
        "size" VARCHAR(50),
        "weight_scu" DECIMAL(10,2),
        "is_commodity" BOOLEAN DEFAULT FALSE,
        "is_buyable" BOOLEAN DEFAULT FALSE,
        "is_sellable" BOOLEAN DEFAULT FALSE,
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

    // Create performance indexes
    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_active"
      ON "uex_items"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_category"
      ON "uex_items"("id_category")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_company"
      ON "uex_items"("id_company")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_sc_uuid"
      ON "uex_items"("star_citizen_uuid")
      WHERE "deleted" = FALSE AND "star_citizen_uuid" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_search"
      ON "uex_items"("name")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_sync"
      ON "uex_items"("uex_date_modified")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_items_commodity"
      ON "uex_items"("is_commodity")
      WHERE "deleted" = FALSE AND "is_commodity" = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first (reverse order)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_commodity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_sync"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_search"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_sc_uuid"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_items_active"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_items"`);
  }
}
