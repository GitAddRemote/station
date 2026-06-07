import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationLocationProjection1780050000000
  implements MigrationInterface
{
  name = 'AddStationLocationProjection1780050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_city"
      ADD COLUMN "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await queryRunner.query(`
      ALTER TABLE "station_space_station"
      ADD COLUMN "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await queryRunner.query(`
      ALTER TABLE "station_outpost"
      ADD COLUMN "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE
    `);
    await queryRunner.query(`
      ALTER TABLE "station_poi"
      ADD COLUMN "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await queryRunner.query(`
      CREATE TABLE "station_data_source" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "code" VARCHAR(50) NOT NULL,
        "display_name" VARCHAR(100) NOT NULL,
        "description" TEXT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_station_data_source_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_station_data_source_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "station_location" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "data_source_id" UUID NOT NULL,
        "source_type" VARCHAR(20) NOT NULL,
        "source_id" UUID NOT NULL,
        "slug" VARCHAR(100) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "star_system_uex_id" INTEGER NULL,
        "planet_uex_id" INTEGER NULL,
        "moon_uex_id" INTEGER NULL,
        "is_available_live" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_station_location_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_station_location_data_source_id"
          FOREIGN KEY ("data_source_id")
          REFERENCES "station_data_source"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "uq_station_location_slug" UNIQUE ("slug"),
        CONSTRAINT "uq_station_location_source_namespace"
          UNIQUE ("data_source_id", "source_type", "source_id"),
        CONSTRAINT "chk_station_location_source_type"
          CHECK ("source_type" IN ('city', 'space_station', 'outpost', 'poi', 'system'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_station_location_data_source_id"
      ON "station_location" ("data_source_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_location_source_type"
      ON "station_location" ("source_type")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_location_star_system_uex_id"
      ON "station_location" ("star_system_uex_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_location_planet_uex_id"
      ON "station_location" ("planet_uex_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_location_moon_uex_id"
      ON "station_location" ("moon_uex_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_location_is_available_live"
      ON "station_location" ("is_available_live")
    `);

    const systemDataSourceId = await this.generateUuidV7(queryRunner);
    const uexApiDataSourceId = await this.generateUuidV7(queryRunner);
    const unknownLocationId = await this.generateUuidV7(queryRunner);
    const unknownSourceId = await this.generateUuidV7(queryRunner);

    await queryRunner.query(
      `
        INSERT INTO "station_data_source" (
          "id",
          "code",
          "display_name",
          "description",
          "is_active",
          "created_at",
          "updated_at"
        )
        VALUES
          ($1, 'system', 'System', 'Station-managed synthetic and local records', TRUE, NOW(), NOW()),
          ($2, 'uex-api', 'UEX API', 'Imported from the live UEX API sync tables', TRUE, NOW(), NOW())
      `,
      [systemDataSourceId, uexApiDataSourceId],
    );

    await queryRunner.query(
      `
        INSERT INTO "station_location" (
          "id",
          "data_source_id",
          "source_type",
          "source_id",
          "slug",
          "name",
          "star_system_uex_id",
          "planet_uex_id",
          "moon_uex_id",
          "is_available_live",
          "is_locally_managed",
          "created_at",
          "updated_at"
        )
        VALUES (
          $1,$2,'system',$3,'unknown','Unknown',NULL,NULL,NULL,FALSE,TRUE,NOW(),NOW()
        )
      `,
      [unknownLocationId, systemDataSourceId, unknownSourceId],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "station_location" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_data_source" CASCADE`,
    );

    await queryRunner.query(
      `ALTER TABLE "station_poi" DROP COLUMN "is_locally_managed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_outpost" DROP COLUMN "is_locally_managed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_space_station" DROP COLUMN "is_locally_managed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_city" DROP COLUMN "is_locally_managed"`,
    );
  }

  private async generateUuidV7(queryRunner: QueryRunner): Promise<string> {
    const rows = await queryRunner.query<{ id: string }[]>(
      `SELECT uuid_generate_v7() AS id`,
    );
    return rows[0].id;
  }
}
