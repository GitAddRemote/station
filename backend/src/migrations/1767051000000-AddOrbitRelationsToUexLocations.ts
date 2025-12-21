import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds orbit and parent reference columns for UEX locations.
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Adds orbit relationships for space stations and POIs, and
 * allows moons to reference star systems when no planet is provided.
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - drops the new columns and indexes
 */
export class AddOrbitRelationsToUexLocations1767051000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "uex_moons"
      ADD COLUMN "star_system_id" INTEGER REFERENCES "uex_star_systems"("uex_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "uex_moons"
      ALTER COLUMN "planet_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_moons_system"
      ON "uex_moons"("star_system_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      ALTER TABLE "uex_space_stations"
      ADD COLUMN "orbit_id" INTEGER REFERENCES "uex_orbits"("uex_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_space_stations_orbit"
      ON "uex_space_stations"("orbit_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      ALTER TABLE "uex_poi"
      ADD COLUMN "orbit_id" INTEGER REFERENCES "uex_orbits"("uex_id"),
      ADD COLUMN "space_station_id" INTEGER REFERENCES "uex_space_stations"("uex_id"),
      ADD COLUMN "city_id" INTEGER REFERENCES "uex_cities"("uex_id"),
      ADD COLUMN "outpost_id" INTEGER REFERENCES "uex_outposts"("uex_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_orbit"
      ON "uex_poi"("orbit_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_station"
      ON "uex_poi"("space_station_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_city"
      ON "uex_poi"("city_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uex_poi_outpost"
      ON "uex_poi"("outpost_id")
      WHERE "deleted" = FALSE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_outpost"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_station"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_poi_orbit"`);

    await queryRunner.query(`
      ALTER TABLE "uex_poi"
      DROP COLUMN IF EXISTS "outpost_id",
      DROP COLUMN IF EXISTS "city_id",
      DROP COLUMN IF EXISTS "space_station_id",
      DROP COLUMN IF EXISTS "orbit_id"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_uex_space_stations_orbit"`,
    );

    await queryRunner.query(`
      ALTER TABLE "uex_space_stations"
      DROP COLUMN IF EXISTS "orbit_id"
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uex_moons_system"`);

    await queryRunner.query(`
      DELETE FROM "uex_moons"
      WHERE "planet_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "uex_moons"
      ALTER COLUMN "planet_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "uex_moons"
      DROP COLUMN IF EXISTS "star_system_id"
    `);
  }
}
