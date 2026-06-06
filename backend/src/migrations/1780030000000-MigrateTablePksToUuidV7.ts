import { MigrationInterface, QueryRunner } from 'typeorm';

type TerminalFkTarget = {
  column: string;
  targetTable: string;
};

const STATION_TABLES = [
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
] as const;

const UEX_TABLES = [
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
] as const;

const TERMINAL_FK_TARGETS: TerminalFkTarget[] = [
  { column: 'star_system_id', targetTable: 'station_star_system' },
  { column: 'planet_id', targetTable: 'station_planet' },
  { column: 'orbit_id', targetTable: 'station_orbit' },
  { column: 'moon_id', targetTable: 'station_moon' },
  { column: 'space_station_id', targetTable: 'station_space_station' },
  { column: 'outpost_id', targetTable: 'station_outpost' },
  { column: 'poi_id', targetTable: 'station_poi' },
  { column: 'city_id', targetTable: 'station_city' },
  { column: 'faction_id', targetTable: 'station_faction' },
  { column: 'company_id', targetTable: 'station_company' },
] as const;

export class MigrateTablePksToUuidV71780030000000
  implements MigrationInterface
{
  name = 'MigrateTablePksToUuidV71780030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);

    for (const table of STATION_TABLES) {
      await this.addLegacyAndUuidColumns(queryRunner, table);
    }

    for (const table of UEX_TABLES) {
      await this.addLegacyAndUuidColumns(queryRunner, table);
    }

    for (const { column, targetTable } of TERMINAL_FK_TARGETS) {
      const uuidColumn = `${column}_uuid`;
      await queryRunner.query(
        `ALTER TABLE "station_terminal" ADD COLUMN "${uuidColumn}" UUID`,
      );
      await queryRunner.query(`
        UPDATE "station_terminal" AS terminal
        SET "${uuidColumn}" = ref."id_uuid"
        FROM "${targetTable}" AS ref
        WHERE terminal."${column}" = ref."legacy_id"
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
      ADD COLUMN "terminal_origin_id_uuid" UUID,
      ADD COLUMN "terminal_destination_id_uuid" UUID
    `);
    await queryRunner.query(`
      UPDATE "station_terminal_distance" AS distance
      SET
        "terminal_origin_id_uuid" = origin."id_uuid",
        "terminal_destination_id_uuid" = destination."id_uuid"
      FROM "station_terminal" AS origin,
           "station_terminal" AS destination
      WHERE distance."terminal_origin_id" = origin."legacy_id"
        AND distance."terminal_destination_id" = destination."legacy_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        ALTER COLUMN "terminal_origin_id_uuid" SET NOT NULL,
        ALTER COLUMN "terminal_destination_id_uuid" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal"
        DROP CONSTRAINT IF EXISTS "station_terminal_star_system_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_planet_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_orbit_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_moon_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_space_station_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_outpost_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_poi_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_city_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_faction_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_company_id_fkey"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        DROP CONSTRAINT IF EXISTS "station_terminal_distance_terminal_origin_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_distance_terminal_destination_id_fkey"
    `);

    for (const table of STATION_TABLES) {
      await this.swapPrimaryKeyToUuid(queryRunner, table);
    }

    for (const table of UEX_TABLES) {
      await this.swapPrimaryKeyToUuid(queryRunner, table);
    }

    for (const { column } of TERMINAL_FK_TARGETS) {
      const uuidColumn = `${column}_uuid`;
      await queryRunner.query(
        `ALTER TABLE "station_terminal" DROP COLUMN "${column}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "station_terminal" RENAME COLUMN "${uuidColumn}" TO "${column}"`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        DROP COLUMN "terminal_origin_id",
        DROP COLUMN "terminal_destination_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        RENAME COLUMN "terminal_origin_id_uuid" TO "terminal_origin_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        RENAME COLUMN "terminal_destination_id_uuid" TO "terminal_destination_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal"
        ADD CONSTRAINT "station_terminal_star_system_id_fkey"
          FOREIGN KEY ("star_system_id") REFERENCES "station_star_system"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_planet_id_fkey"
          FOREIGN KEY ("planet_id") REFERENCES "station_planet"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_orbit_id_fkey"
          FOREIGN KEY ("orbit_id") REFERENCES "station_orbit"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_moon_id_fkey"
          FOREIGN KEY ("moon_id") REFERENCES "station_moon"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_space_station_id_fkey"
          FOREIGN KEY ("space_station_id") REFERENCES "station_space_station"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_outpost_id_fkey"
          FOREIGN KEY ("outpost_id") REFERENCES "station_outpost"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_poi_id_fkey"
          FOREIGN KEY ("poi_id") REFERENCES "station_poi"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_city_id_fkey"
          FOREIGN KEY ("city_id") REFERENCES "station_city"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_faction_id_fkey"
          FOREIGN KEY ("faction_id") REFERENCES "station_faction"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_company_id_fkey"
          FOREIGN KEY ("company_id") REFERENCES "station_company"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        ADD CONSTRAINT "station_terminal_distance_terminal_origin_id_fkey"
          FOREIGN KEY ("terminal_origin_id") REFERENCES "station_terminal"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "station_terminal_distance_terminal_destination_id_fkey"
          FOREIGN KEY ("terminal_destination_id") REFERENCES "station_terminal"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_star_system" ON "station_terminal" ("star_system_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_planet" ON "station_terminal" ("planet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_orbit" ON "station_terminal" ("orbit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_moon" ON "station_terminal" ("moon_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_space_station" ON "station_terminal" ("space_station_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_outpost" ON "station_terminal" ("outpost_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_city" ON "station_terminal" ("city_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_faction" ON "station_terminal" ("faction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_company" ON "station_terminal" ("company_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        ADD CONSTRAINT "station_terminal_distances_uq"
          UNIQUE ("terminal_origin_id", "terminal_destination_id")
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminal_distances_origin" ON "station_terminal_distance" ("terminal_origin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminal_distances_dest" ON "station_terminal_distance" ("terminal_destination_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_terminal"
        DROP CONSTRAINT IF EXISTS "station_terminal_star_system_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_planet_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_orbit_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_moon_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_space_station_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_outpost_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_poi_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_city_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_faction_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_company_id_fkey"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        DROP CONSTRAINT IF EXISTS "station_terminal_distance_terminal_origin_id_fkey",
        DROP CONSTRAINT IF EXISTS "station_terminal_distance_terminal_destination_id_fkey"
    `);

    for (const { column, targetTable } of TERMINAL_FK_TARGETS) {
      const legacyColumn = `${column}_legacy`;
      await queryRunner.query(
        `ALTER TABLE "station_terminal" ADD COLUMN "${legacyColumn}" BIGINT`,
      );
      await queryRunner.query(`
        UPDATE "station_terminal" AS terminal
        SET "${legacyColumn}" = ref."legacy_id"
        FROM "${targetTable}" AS ref
        WHERE terminal."${column}" = ref."id"
      `);
    }

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
      ADD COLUMN "terminal_origin_id_legacy" BIGINT,
      ADD COLUMN "terminal_destination_id_legacy" BIGINT
    `);
    await queryRunner.query(`
      UPDATE "station_terminal_distance" AS distance
      SET
        "terminal_origin_id_legacy" = origin."legacy_id",
        "terminal_destination_id_legacy" = destination."legacy_id"
      FROM "station_terminal" AS origin,
           "station_terminal" AS destination
      WHERE distance."terminal_origin_id" = origin."id"
        AND distance."terminal_destination_id" = destination."id"
    `);
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        ALTER COLUMN "terminal_origin_id_legacy" SET NOT NULL,
        ALTER COLUMN "terminal_destination_id_legacy" SET NOT NULL
    `);

    for (const table of STATION_TABLES) {
      await this.restorePrimaryKeyToBigint(queryRunner, table);
    }

    for (const table of UEX_TABLES) {
      await this.restorePrimaryKeyToBigint(queryRunner, table);
    }

    for (const { column } of TERMINAL_FK_TARGETS) {
      const legacyColumn = `${column}_legacy`;
      await queryRunner.query(
        `ALTER TABLE "station_terminal" DROP COLUMN "${column}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "station_terminal" RENAME COLUMN "${legacyColumn}" TO "${column}"`,
      );
    }

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        DROP COLUMN "terminal_origin_id",
        DROP COLUMN "terminal_destination_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        RENAME COLUMN "terminal_origin_id_legacy" TO "terminal_origin_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        RENAME COLUMN "terminal_destination_id_legacy" TO "terminal_destination_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal"
        ADD CONSTRAINT "station_terminal_star_system_id_fkey"
          FOREIGN KEY ("star_system_id") REFERENCES "station_star_system"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_planet_id_fkey"
          FOREIGN KEY ("planet_id") REFERENCES "station_planet"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_orbit_id_fkey"
          FOREIGN KEY ("orbit_id") REFERENCES "station_orbit"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_moon_id_fkey"
          FOREIGN KEY ("moon_id") REFERENCES "station_moon"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_space_station_id_fkey"
          FOREIGN KEY ("space_station_id") REFERENCES "station_space_station"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_outpost_id_fkey"
          FOREIGN KEY ("outpost_id") REFERENCES "station_outpost"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_poi_id_fkey"
          FOREIGN KEY ("poi_id") REFERENCES "station_poi"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_city_id_fkey"
          FOREIGN KEY ("city_id") REFERENCES "station_city"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_faction_id_fkey"
          FOREIGN KEY ("faction_id") REFERENCES "station_faction"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "station_terminal_company_id_fkey"
          FOREIGN KEY ("company_id") REFERENCES "station_company"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        ADD CONSTRAINT "station_terminal_distance_terminal_origin_id_fkey"
          FOREIGN KEY ("terminal_origin_id") REFERENCES "station_terminal"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "station_terminal_distance_terminal_destination_id_fkey"
          FOREIGN KEY ("terminal_destination_id") REFERENCES "station_terminal"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_star_system" ON "station_terminal" ("star_system_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_planet" ON "station_terminal" ("planet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_orbit" ON "station_terminal" ("orbit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_moon" ON "station_terminal" ("moon_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_space_station" ON "station_terminal" ("space_station_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_outpost" ON "station_terminal" ("outpost_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_city" ON "station_terminal" ("city_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_faction" ON "station_terminal" ("faction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_company" ON "station_terminal" ("company_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "station_terminal_distance"
        ADD CONSTRAINT "station_terminal_distances_uq"
          UNIQUE ("terminal_origin_id", "terminal_destination_id")
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminal_distances_origin" ON "station_terminal_distance" ("terminal_origin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminal_distances_dest" ON "station_terminal_distance" ("terminal_destination_id")`,
    );

    await queryRunner.query(`DROP FUNCTION IF EXISTS "uuid_generate_v7"()`);
  }

  private async ensureUuidV7Function(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "uuid_generate_v7"()
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        ts_hex TEXT;
        rand_hex TEXT;
        variant_nibble TEXT;
      BEGIN
        ts_hex := lpad(
          to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint),
          12,
          '0'
        );
        rand_hex := encode(gen_random_bytes(10), 'hex');
        variant_nibble := substr(
          '89ab',
          (get_byte(gen_random_bytes(1), 0) % 4) + 1,
          1
        );

        RETURN (
          substr(ts_hex, 1, 8) || '-' ||
          substr(ts_hex, 9, 4) || '-' ||
          '7' || substr(rand_hex, 1, 3) || '-' ||
          variant_nibble || substr(rand_hex, 4, 3) || '-' ||
          substr(rand_hex, 7, 12)
        )::uuid;
      END;
      $$
    `);
  }

  private async addLegacyAndUuidColumns(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "${table}"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid" UUID
    `);
    await queryRunner.query(`
      UPDATE "${table}"
      SET
        "legacy_id" = "id",
        "id_uuid" = "uuid_generate_v7"()
    `);
    await this.preserveLegacySequence(queryRunner, table);
    await queryRunner.query(`
      ALTER TABLE "${table}"
        ALTER COLUMN "legacy_id" SET NOT NULL,
        ALTER COLUMN "id_uuid" SET NOT NULL,
        ALTER COLUMN "id_uuid" SET DEFAULT "uuid_generate_v7"()
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_${table}_legacy_id"
      ON "${table}" ("legacy_id")
    `);
  }

  private async swapPrimaryKeyToUuid(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_pkey"`,
    );
    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "${table}" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${table}_pkey" PRIMARY KEY ("id")`,
    );
  }

  private async restorePrimaryKeyToBigint(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_${table}_legacy_id"`);
    await queryRunner.query(
      `ALTER TABLE "${table}" RENAME COLUMN "legacy_id" TO "id"`,
    );
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "${table}_id_seq"`);
    await queryRunner.query(`
      ALTER TABLE "${table}"
        ALTER COLUMN "id" SET DEFAULT nextval('"${table}_id_seq"')
    `);
    await queryRunner.query(
      `ALTER TABLE "${table}" ADD CONSTRAINT "${table}_pkey" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`
      SELECT setval(
        '"${table}_id_seq"',
        COALESCE((SELECT MAX("id") FROM "${table}"), 1),
        EXISTS(SELECT 1 FROM "${table}")
      )
    `);
  }

  private async preserveLegacySequence(
    queryRunner: QueryRunner,
    table: string,
  ): Promise<void> {
    const sequenceRows = (await queryRunner.query(
      `
        SELECT pg_get_serial_sequence($1, 'id') AS sequence_name
      `,
      [`"${table}"`],
    )) as Array<{ sequence_name: string | null }>;

    const sequenceName = sequenceRows[0]?.sequence_name;

    if (!sequenceName) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE "${table}"
        ALTER COLUMN "legacy_id" SET DEFAULT nextval('${sequenceName}')
    `);
    await queryRunner.query(`
      ALTER SEQUENCE ${sequenceName}
        OWNED BY "${table}"."legacy_id"
    `);
  }
}
