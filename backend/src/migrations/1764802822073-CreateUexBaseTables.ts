import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates base UEX tables: categories and companies
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates uex_categories and uex_companies tables with soft-delete
 * support, audit timestamps, and performance indexes.
 *
 * Estimated duration: < 5 seconds
 * Rollback safe: Yes - drops tables entirely
 */
export class CreateUexBaseTables1764802822073 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create uex_categories table
    await queryRunner.query(`
      CREATE TABLE "uex_categories" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "type" VARCHAR(50),
        "section" VARCHAR(100),
        "name" VARCHAR(255) NOT NULL,
        "is_game_related" BOOLEAN DEFAULT FALSE,
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

    // Create uex_companies table
    await queryRunner.query(`
      CREATE TABLE "uex_companies" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
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

    // Create indexes for uex_categories
    await queryRunner.query(`
      CREATE INDEX "idx_uex_categories_active"
      ON "uex_categories"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_categories_type"
      ON "uex_categories"("type")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_categories_sync"
      ON "uex_categories"("uex_date_modified")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for uex_companies
    await queryRunner.query(`
      CREATE INDEX "idx_uex_companies_active"
      ON "uex_companies"("uex_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_companies_code"
      ON "uex_companies"("code")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_companies_sync"
      ON "uex_companies"("uex_date_modified")
      WHERE "deleted" = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first (reverse order)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_companies_sync"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_companies_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_companies_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_categories_sync"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_categories_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_categories_active"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_companies"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_categories"`);
  }
}
