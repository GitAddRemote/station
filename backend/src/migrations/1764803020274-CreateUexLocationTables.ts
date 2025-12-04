import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates UEX location hierarchy tables
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates location hierarchy tables for star systems, planets, moons,
 * cities, space stations, outposts, and points of interest with soft-delete support
 * and performance indexes.
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - drops tables entirely
 */
export class CreateUexLocationTables1764803020274
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create uex_star_systems table (top of hierarchy)
    await queryRunner.query(`
      CREATE TABLE "uex_star_systems" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50) NOT NULL,
        "is_available" BOOLEAN DEFAULT TRUE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    // Create uex_planets table
    await queryRunner.query(`
      CREATE TABLE "uex_planets" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "star_system_id" INTEGER NOT NULL REFERENCES "uex_star_systems"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE,
        "is_landable" BOOLEAN DEFAULT FALSE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    // Create uex_moons table
    await queryRunner.query(`
      CREATE TABLE "uex_moons" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "planet_id" INTEGER NOT NULL REFERENCES "uex_planets"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE,
        "is_landable" BOOLEAN DEFAULT FALSE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    // Create uex_cities table
    await queryRunner.query(`
      CREATE TABLE "uex_cities" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "planet_id" INTEGER REFERENCES "uex_planets"("uex_id"),
        "moon_id" INTEGER REFERENCES "uex_moons"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id"),
        CONSTRAINT "chk_city_parent" CHECK (
          (planet_id IS NOT NULL AND moon_id IS NULL) OR
          (planet_id IS NULL AND moon_id IS NOT NULL)
        )
      )
    `);

    // Create uex_space_stations table
    await queryRunner.query(`
      CREATE TABLE "uex_space_stations" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "star_system_id" INTEGER REFERENCES "uex_star_systems"("uex_id"),
        "planet_id" INTEGER REFERENCES "uex_planets"("uex_id"),
        "moon_id" INTEGER REFERENCES "uex_moons"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    // Create uex_outposts table
    await queryRunner.query(`
      CREATE TABLE "uex_outposts" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "planet_id" INTEGER REFERENCES "uex_planets"("uex_id"),
        "moon_id" INTEGER REFERENCES "uex_moons"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "is_available" BOOLEAN DEFAULT TRUE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    // Create uex_poi (Points of Interest) table
    await queryRunner.query(`
      CREATE TABLE "uex_poi" (
        "id" BIGSERIAL PRIMARY KEY,
        "uex_id" INTEGER NOT NULL UNIQUE,
        "star_system_id" INTEGER REFERENCES "uex_star_systems"("uex_id"),
        "planet_id" INTEGER REFERENCES "uex_planets"("uex_id"),
        "moon_id" INTEGER REFERENCES "uex_moons"("uex_id"),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(50),
        "type" VARCHAR(100),
        "is_available" BOOLEAN DEFAULT TRUE,
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id")
      )
    `);

    // Create indexes for star_systems
    await queryRunner.query(`
      CREATE INDEX "idx_uex_star_systems_active"
      ON "uex_star_systems"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_star_systems_code"
      ON "uex_star_systems"("code")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for planets
    await queryRunner.query(`
      CREATE INDEX "idx_uex_planets_active"
      ON "uex_planets"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_planets_system"
      ON "uex_planets"("star_system_id")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for moons
    await queryRunner.query(`
      CREATE INDEX "idx_uex_moons_active"
      ON "uex_moons"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_moons_planet"
      ON "uex_moons"("planet_id")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for cities
    await queryRunner.query(`
      CREATE INDEX "idx_uex_cities_active"
      ON "uex_cities"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_cities_planet"
      ON "uex_cities"("planet_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_cities_moon"
      ON "uex_cities"("moon_id")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for space_stations
    await queryRunner.query(`
      CREATE INDEX "idx_uex_space_stations_active"
      ON "uex_space_stations"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_space_stations_system"
      ON "uex_space_stations"("star_system_id")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for outposts
    await queryRunner.query(`
      CREATE INDEX "idx_uex_outposts_active"
      ON "uex_outposts"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_outposts_planet"
      ON "uex_outposts"("planet_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_outposts_moon"
      ON "uex_outposts"("moon_id")
      WHERE "deleted" = FALSE
    `);

    // Create indexes for POI
    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_active"
      ON "uex_poi"("uex_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_system"
      ON "uex_poi"("star_system_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_type"
      ON "uex_poi"("type")
      WHERE "deleted" = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first (reverse order)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_system"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_outposts_moon"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_outposts_planet"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_outposts_active"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_space_stations_system"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_space_stations_active"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_cities_moon"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_cities_planet"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_cities_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_moons_planet"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_moons_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_planets_system"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_planets_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_star_systems_code"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_star_systems_active"`,
    );

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_poi"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_outposts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_space_stations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_cities"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_moons"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_planets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_star_systems"`);
  }
}
