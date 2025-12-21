import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates UEX orbits table
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Adds uex_orbits for resolving orbit references in locations sync.
 *
 * Estimated duration: < 5 seconds
 * Rollback safe: Yes - drops table entirely
 */
export class CreateUexOrbitsTable1767050000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "uex_orbits" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "star_system_id" INTEGER NOT NULL REFERENCES "uex_star_systems"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE,
        "is_visible" BOOLEAN DEFAULT TRUE,
        "is_default" BOOLEAN DEFAULT FALSE,
        "is_lagrange" BOOLEAN DEFAULT FALSE,
        "is_man_made" BOOLEAN DEFAULT FALSE,
        "is_asteroid" BOOLEAN DEFAULT FALSE,
        "is_planet" BOOLEAN DEFAULT FALSE,
        "is_star" BOOLEAN DEFAULT FALSE,
        "is_jump_point" BOOLEAN DEFAULT FALSE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_orbits_active"
      ON "uex_orbits"("uex_id")
      WHERE deleted = FALSE AND active = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_orbits_system"
      ON "uex_orbits"("star_system_id")
      WHERE deleted = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_orbits_code"
      ON "uex_orbits"("code")
      WHERE deleted = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_orbits_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_orbits_system"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_orbits_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_orbits"`);
  }
}
