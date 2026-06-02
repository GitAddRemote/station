import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateTablePksToUuidV71780030000000
  implements MigrationInterface
{
  name = 'MigrateTablePksToUuidV71780030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------------------
    // station_* tables — pure SQL tables, no TypeORM entity management
    // Order: leaf tables first, then tables with FKs pointing at them
    // -------------------------------------------------------------------------

    // Drop FK constraints on station_terminal before altering referenced tables
    await queryRunner.query(`
      ALTER TABLE station_terminal
        DROP CONSTRAINT IF EXISTS station_terminal_star_system_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_planet_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_orbit_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_moon_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_space_station_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_outpost_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_poi_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_city_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_faction_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_company_id_fkey
    `);

    // Drop FK on station_terminal_distance before altering station_terminal
    await queryRunner.query(`
      ALTER TABLE station_terminal_distance
        DROP CONSTRAINT IF EXISTS station_terminal_distance_terminal_origin_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_distance_terminal_destination_id_fkey
    `);

    const stationTables = [
      'station_faction',
      'station_jurisdiction',
      'station_company',
      'station_star_system',
      'station_orbit',
      'station_orbit_distance',
      'station_planet',
      'station_moon',
      'station_city',
      'station_space_station',
      'station_outpost',
      'station_poi',
      'station_terminal',
      'station_terminal_distance',
    ];

    for (const table of stationTables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
          ALTER COLUMN id SET DEFAULT gen_random_uuid()
      `);
    }

    // Convert station_terminal FK columns from BIGINT to UUID
    const terminalFkCols = [
      'star_system_id',
      'planet_id',
      'orbit_id',
      'moon_id',
      'space_station_id',
      'outpost_id',
      'poi_id',
      'city_id',
      'faction_id',
      'company_id',
    ];
    for (const col of terminalFkCols) {
      await queryRunner.query(`
        ALTER TABLE station_terminal
          ALTER COLUMN ${col} TYPE UUID USING NULL::UUID
      `);
    }

    // Convert station_terminal_distance FK columns
    await queryRunner.query(`
      ALTER TABLE station_terminal_distance
        ALTER COLUMN terminal_origin_id TYPE UUID USING NULL::UUID,
        ALTER COLUMN terminal_destination_id TYPE UUID USING NULL::UUID
    `);

    // Restore FKs on station_terminal
    await queryRunner.query(`
      ALTER TABLE station_terminal
        ADD CONSTRAINT station_terminal_star_system_id_fkey
          FOREIGN KEY (star_system_id) REFERENCES station_star_system(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_planet_id_fkey
          FOREIGN KEY (planet_id) REFERENCES station_planet(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_orbit_id_fkey
          FOREIGN KEY (orbit_id) REFERENCES station_orbit(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_moon_id_fkey
          FOREIGN KEY (moon_id) REFERENCES station_moon(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_space_station_id_fkey
          FOREIGN KEY (space_station_id) REFERENCES station_space_station(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_outpost_id_fkey
          FOREIGN KEY (outpost_id) REFERENCES station_outpost(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_poi_id_fkey
          FOREIGN KEY (poi_id) REFERENCES station_poi(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_city_id_fkey
          FOREIGN KEY (city_id) REFERENCES station_city(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_faction_id_fkey
          FOREIGN KEY (faction_id) REFERENCES station_faction(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_company_id_fkey
          FOREIGN KEY (company_id) REFERENCES station_company(id) ON DELETE SET NULL
    `);

    // Restore FKs on station_terminal_distance
    await queryRunner.query(`
      ALTER TABLE station_terminal_distance
        ADD CONSTRAINT station_terminal_distance_terminal_origin_id_fkey
          FOREIGN KEY (terminal_origin_id) REFERENCES station_terminal(id) ON DELETE CASCADE,
        ADD CONSTRAINT station_terminal_distance_terminal_destination_id_fkey
          FOREIGN KEY (terminal_destination_id) REFERENCES station_terminal(id) ON DELETE CASCADE
    `);

    // -------------------------------------------------------------------------
    // uex_* tables — TypeORM-managed entities
    // These tables have no cross-table FKs on the id column (relations join on
    // uex_id, not id), so they can be altered independently.
    // -------------------------------------------------------------------------

    const uexTables = [
      'uex_star_system',
      'uex_planet',
      'uex_moon',
      'uex_city',
      'uex_space_station',
      'uex_outpost',
      'uex_poi',
      'uex_company',
      'uex_category',
      'uex_commodity',
      'uex_item',
    ];

    for (const table of uexTables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE UUID USING gen_random_uuid(),
          ALTER COLUMN id SET DEFAULT gen_random_uuid()
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop restored FKs
    await queryRunner.query(`
      ALTER TABLE station_terminal
        DROP CONSTRAINT IF EXISTS station_terminal_star_system_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_planet_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_orbit_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_moon_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_space_station_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_outpost_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_poi_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_city_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_faction_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_company_id_fkey
    `);

    await queryRunner.query(`
      ALTER TABLE station_terminal_distance
        DROP CONSTRAINT IF EXISTS station_terminal_distance_terminal_origin_id_fkey,
        DROP CONSTRAINT IF EXISTS station_terminal_distance_terminal_destination_id_fkey
    `);

    // Revert station_terminal FK columns to BIGINT
    const terminalFkCols = [
      'star_system_id',
      'planet_id',
      'orbit_id',
      'moon_id',
      'space_station_id',
      'outpost_id',
      'poi_id',
      'city_id',
      'faction_id',
      'company_id',
    ];
    for (const col of terminalFkCols) {
      await queryRunner.query(`
        ALTER TABLE station_terminal
          ALTER COLUMN ${col} TYPE BIGINT USING NULL::BIGINT
      `);
    }

    await queryRunner.query(`
      ALTER TABLE station_terminal_distance
        ALTER COLUMN terminal_origin_id TYPE BIGINT USING NULL::BIGINT,
        ALTER COLUMN terminal_destination_id TYPE BIGINT USING NULL::BIGINT
    `);

    // Revert station_* PKs to BIGSERIAL
    const stationTables = [
      'station_terminal_distance',
      'station_terminal',
      'station_poi',
      'station_outpost',
      'station_space_station',
      'station_city',
      'station_moon',
      'station_planet',
      'station_orbit_distance',
      'station_orbit',
      'station_star_system',
      'station_company',
      'station_jurisdiction',
      'station_faction',
    ];

    for (const table of stationTables) {
      await queryRunner.query(`
        CREATE SEQUENCE IF NOT EXISTS "${table}_id_seq";
        ALTER TABLE "${table}"
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE BIGINT USING NULL::BIGINT,
          ALTER COLUMN id SET DEFAULT nextval('"${table}_id_seq"')
      `);
    }

    // Revert uex_* PKs
    const uexTables = [
      'uex_item',
      'uex_commodity',
      'uex_category',
      'uex_company',
      'uex_poi',
      'uex_outpost',
      'uex_space_station',
      'uex_city',
      'uex_moon',
      'uex_planet',
      'uex_star_system',
    ];

    for (const table of uexTables) {
      await queryRunner.query(`
        CREATE SEQUENCE IF NOT EXISTS "${table}_id_seq";
        ALTER TABLE "${table}"
          ALTER COLUMN id DROP DEFAULT,
          ALTER COLUMN id TYPE BIGINT USING NULL::BIGINT,
          ALTER COLUMN id SET DEFAULT nextval('"${table}_id_seq"')
      `);
    }

    // Restore FKs on station_terminal
    await queryRunner.query(`
      ALTER TABLE station_terminal
        ADD CONSTRAINT station_terminal_star_system_id_fkey
          FOREIGN KEY (star_system_id) REFERENCES station_star_system(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_planet_id_fkey
          FOREIGN KEY (planet_id) REFERENCES station_planet(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_orbit_id_fkey
          FOREIGN KEY (orbit_id) REFERENCES station_orbit(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_moon_id_fkey
          FOREIGN KEY (moon_id) REFERENCES station_moon(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_space_station_id_fkey
          FOREIGN KEY (space_station_id) REFERENCES station_space_station(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_outpost_id_fkey
          FOREIGN KEY (outpost_id) REFERENCES station_outpost(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_poi_id_fkey
          FOREIGN KEY (poi_id) REFERENCES station_poi(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_city_id_fkey
          FOREIGN KEY (city_id) REFERENCES station_city(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_faction_id_fkey
          FOREIGN KEY (faction_id) REFERENCES station_faction(id) ON DELETE SET NULL,
        ADD CONSTRAINT station_terminal_company_id_fkey
          FOREIGN KEY (company_id) REFERENCES station_company(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE station_terminal_distance
        ADD CONSTRAINT station_terminal_distance_terminal_origin_id_fkey
          FOREIGN KEY (terminal_origin_id) REFERENCES station_terminal(id) ON DELETE CASCADE,
        ADD CONSTRAINT station_terminal_distance_terminal_destination_id_fkey
          FOREIGN KEY (terminal_destination_id) REFERENCES station_terminal(id) ON DELETE CASCADE
    `);
  }
}
