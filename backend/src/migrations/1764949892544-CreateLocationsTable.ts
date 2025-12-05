import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates unified locations table for polymorphic location references
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates the unified locations table that provides polymorphic
 * references to all UEX location types (star systems, planets, moons, cities,
 * space stations, outposts, POIs) with denormalized display fields for performance.
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - drops table entirely (no data loss if no inventory created)
 */
export class CreateLocationsTable1764949892544 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create locations table
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" BIGSERIAL PRIMARY KEY,
        "game_id" INTEGER NOT NULL REFERENCES "games"("id"),
        "location_type" VARCHAR(50) NOT NULL CHECK (
          "location_type" IN ('star_system', 'planet', 'moon', 'city', 'space_station', 'outpost', 'poi')
        ),

        -- Polymorphic foreign keys (only one should be non-null based on type)
        "star_system_id" INTEGER REFERENCES "uex_star_systems"("uex_id"),
        "planet_id" INTEGER REFERENCES "uex_planets"("uex_id"),
        "moon_id" INTEGER REFERENCES "uex_moons"("uex_id"),
        "city_id" INTEGER REFERENCES "uex_cities"("uex_id"),
        "space_station_id" INTEGER REFERENCES "uex_space_stations"("uex_id"),
        "outpost_id" INTEGER REFERENCES "uex_outposts"("uex_id"),
        "poi_id" INTEGER REFERENCES "uex_poi"("uex_id"),

        -- Denormalized display fields for performance
        "display_name" VARCHAR(500) NOT NULL,
        "short_name" VARCHAR(255) NOT NULL,
        "hierarchy_path" TEXT, -- JSON string for full location hierarchy

        -- Metadata
        "is_available" BOOLEAN NOT NULL DEFAULT TRUE,
        "is_landable" BOOLEAN, -- Only relevant for planets/moons
        "has_armistice" BOOLEAN, -- Only relevant for stations/cities

        -- Standard audit fields
        "active" BOOLEAN NOT NULL DEFAULT TRUE,
        "deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "date_added" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "added_by" BIGINT REFERENCES "user"("id"),
        "modified_by" BIGINT REFERENCES "user"("id"),

        -- Constraint: Ensure only one location FK is set based on type
        CONSTRAINT "chk_location_type_fk" CHECK (
          (location_type = 'star_system' AND star_system_id IS NOT NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
          (location_type = 'planet' AND star_system_id IS NULL AND planet_id IS NOT NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
          (location_type = 'moon' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NOT NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
          (location_type = 'city' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NOT NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
          (location_type = 'space_station' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NOT NULL AND outpost_id IS NULL AND poi_id IS NULL) OR
          (location_type = 'outpost' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NOT NULL AND poi_id IS NULL) OR
          (location_type = 'poi' AND star_system_id IS NULL AND planet_id IS NULL AND moon_id IS NULL AND city_id IS NULL AND space_station_id IS NULL AND outpost_id IS NULL AND poi_id IS NOT NULL)
        )
      )
    `);

    // Create indexes for query performance
    await queryRunner.query(`
      CREATE INDEX "idx_locations_game"
      ON "locations"("game_id")
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_locations_type"
      ON "locations"("location_type", "game_id")
      WHERE "deleted" = FALSE
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_locations_star_system"
      ON "locations"("star_system_id")
      WHERE "deleted" = FALSE AND "star_system_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_locations_planet"
      ON "locations"("planet_id")
      WHERE "deleted" = FALSE AND "planet_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_locations_city"
      ON "locations"("city_id")
      WHERE "deleted" = FALSE AND "city_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_planet"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_star_system"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_locations_game"`);

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "locations"`);
  }
}
