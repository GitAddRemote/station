import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationCatalogEntry1780070000000 implements MigrationInterface {
  name = 'AddStationCatalogEntry1780070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);

    await queryRunner.query(`
      CREATE TABLE "station_catalog_entry" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "category_id" UUID NOT NULL,
        "catalog_kind" VARCHAR(20) NOT NULL,
        "uex_id" INTEGER NULL,
        "name" VARCHAR(255) NOT NULL,
        "slug" VARCHAR(255) NOT NULL,
        "is_available_live" BOOLEAN NOT NULL DEFAULT FALSE,
        "is_illegal" BOOLEAN NULL,
        "is_concept" BOOLEAN NULL,
        "size" SMALLINT NULL,
        "scu" NUMERIC(12,4) NULL,
        "crew_min" SMALLINT NULL,
        "crew_max" SMALLINT NULL,
        "mass" NUMERIC(12,2) NULL,
        "length" NUMERIC(8,2) NULL,
        "width" NUMERIC(8,2) NULL,
        "height" NUMERIC(8,2) NULL,
        "is_locally_managed" BOOLEAN NOT NULL DEFAULT FALSE,
        "base_properties" JSONB NULL,
        "attributes" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_station_catalog_entry_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_station_catalog_entry_slug" UNIQUE ("slug"),
        CONSTRAINT "fk_station_catalog_entry_category_id"
          FOREIGN KEY ("category_id")
          REFERENCES "station_catalog_category"("id")
          ON DELETE RESTRICT,
        CONSTRAINT "chk_station_catalog_entry_catalog_kind"
          CHECK ("catalog_kind" IN ('item', 'commodity', 'vehicle'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_category_id"
      ON "station_catalog_entry" ("category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_catalog_kind"
      ON "station_catalog_entry" ("catalog_kind")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_uex_id"
      ON "station_catalog_entry" ("uex_id")
      WHERE "uex_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_is_available_live"
      ON "station_catalog_entry" ("is_available_live")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_is_illegal"
      ON "station_catalog_entry" ("is_illegal")
      WHERE "is_illegal" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_is_concept"
      ON "station_catalog_entry" ("is_concept")
      WHERE "is_concept" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_size"
      ON "station_catalog_entry" ("size")
      WHERE "size" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_station_catalog_entry_scu"
      ON "station_catalog_entry" ("scu")
      WHERE "scu" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_catalog_entry" CASCADE`,
    );
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
}
