import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryTables1780080000000 implements MigrationInterface {
  name = 'AddInventoryTables1780080000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);

    // ── station_unit_of_measure ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "station_unit_of_measure" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v7(),
        "code"        VARCHAR(20)  NOT NULL,
        "label"       VARCHAR(100) NOT NULL,
        "description" TEXT         NULL,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_station_unit_of_measure" PRIMARY KEY ("id"),
        CONSTRAINT "uq_station_unit_of_measure_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "station_unit_of_measure" ("code", "label", "description") VALUES
        ('unit',  'Unit',  'A single discrete item or vehicle'),
        ('scu',   'SCU',   'Standard Cargo Unit'),
        ('cscu',  'cSCU',  'Centi-SCU (1/100 SCU)'),
        ('uscu',  'μSCU',  'Micro-SCU (1/1,000,000 SCU)')
    `);

    // Resolve the seeded unknown location UUID so we can use it as a literal
    // column default. PostgreSQL does not allow subquery expressions in DEFAULT
    // clauses, so we query the value here and apply it via ALTER COLUMN after
    // the table is created.
    const unknownLocationRows: { id: string }[] = await queryRunner.query(
      `SELECT "id" FROM "station_location" WHERE "slug" = 'unknown' LIMIT 1`,
    );
    const unknownLocationId: string = unknownLocationRows[0]?.id;
    if (!unknownLocationId) {
      throw new Error(
        'station_location row with slug="unknown" not found. ' +
          'Run 1780050000000-AddStationLocationProjection before this migration.',
      );
    }

    // ── station_inventory_item ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "station_inventory_item" (
        "id"                   UUID           NOT NULL DEFAULT uuid_generate_v7(),
        "owner_type"           VARCHAR(10)    NOT NULL,
        "owner_id"             UUID           NOT NULL,
        "catalog_entry_id"     UUID           NOT NULL,
        "catalog_kind"         VARCHAR(20)    NOT NULL,
        "location_id"          UUID           NOT NULL,
        "unit_of_measure_id"   UUID           NOT NULL,
        "quantity"             NUMERIC(12,6)  NOT NULL DEFAULT 1,
        "quality"              INTEGER        NULL,
        "is_org_available"     BOOLEAN        NOT NULL DEFAULT FALSE,
        "alias"                VARCHAR(255)   NULL,
        "effective_properties" JSONB          NULL,
        "notes"                TEXT           NULL,
        "created_at"           TIMESTAMPTZ    NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "pk_station_inventory_item"
          PRIMARY KEY ("id"),
        CONSTRAINT "chk_station_inventory_item_quantity_positive"
          CHECK ("quantity" > 0),
        CONSTRAINT "chk_station_inventory_item_quality_non_negative"
          CHECK ("quality" IS NULL OR "quality" >= 0),
        CONSTRAINT "chk_station_inventory_item_unit_quantity_whole"
          CHECK ("catalog_kind" NOT IN ('item', 'vehicle') OR floor("quantity") = "quantity"),
        CONSTRAINT "chk_station_inventory_item_owner_type"
          CHECK ("owner_type" IN ('user', 'org')),
        CONSTRAINT "chk_station_inventory_item_catalog_kind"
          CHECK ("catalog_kind" IN ('item', 'commodity', 'vehicle')),
        CONSTRAINT "fk_station_inventory_item_catalog_entry"
          FOREIGN KEY ("catalog_entry_id")
          REFERENCES "station_catalog_entry" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_station_inventory_item_location"
          FOREIGN KEY ("location_id")
          REFERENCES "station_location" ("id")
          ON DELETE RESTRICT,
        CONSTRAINT "fk_station_inventory_item_unit_of_measure"
          FOREIGN KEY ("unit_of_measure_id")
          REFERENCES "station_unit_of_measure" ("id")
          ON DELETE RESTRICT
      )
    `);

    // Apply the resolved unknown location UUID as the column default.
    await queryRunner.query(
      `ALTER TABLE "station_inventory_item"
         ALTER COLUMN "location_id" SET DEFAULT '${unknownLocationId}'`,
    );

    // General lookup indexes
    await queryRunner.query(`
      CREATE INDEX "idx_station_inventory_item_owner"
        ON "station_inventory_item" ("owner_type", "owner_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_station_inventory_item_catalog_entry_id"
        ON "station_inventory_item" ("catalog_entry_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_station_inventory_item_location_id"
        ON "station_inventory_item" ("location_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_station_inventory_item_owner_entry"
        ON "station_inventory_item" ("owner_type", "owner_id", "catalog_entry_id")
    `);

    // Commodity stacks: same owner + catalog entry + location + UoM + exact quality.
    // COALESCE(quality, -1) treats NULL quality as a shared bucket: two commodity rows
    // with NULL quality for the same owner/entry/location/uom will collide and merge
    // rather than creating separate stack rows. -1 is safe because the schema
    // enforces non-negative quality; the sentinel is index-only and never stored.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_station_inventory_item_commodity_stack"
        ON "station_inventory_item" (
          "owner_type",
          "owner_id",
          "catalog_entry_id",
          "location_id",
          "unit_of_measure_id",
          COALESCE("quality", -1)
        )
        WHERE "catalog_kind" = 'commodity'
    `);

    // Fungible item stacks: same owner + catalog entry + location + UoM, no
    // instance customization (effective_properties must be NULL).
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_station_inventory_item_fungible_item_stack"
        ON "station_inventory_item" (
          "owner_type",
          "owner_id",
          "catalog_entry_id",
          "location_id",
          "unit_of_measure_id"
        )
        WHERE "catalog_kind" = 'item' AND "effective_properties" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_inventory_item" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_unit_of_measure" CASCADE`,
    );
  }

  private async ensureUuidV7Function(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION uuid_generate_v7()
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_time TIMESTAMPTZ := clock_timestamp();
        v_unix_ms BIGINT := EXTRACT(EPOCH FROM v_time) * 1000;
        v_hex TEXT := lpad(to_hex(v_unix_ms), 12, '0');
        v_rand TEXT := encode(gen_random_bytes(10), 'hex');
        v_uuid TEXT;
      BEGIN
        v_uuid := substring(v_hex, 1, 8) || '-' ||
                  substring(v_hex, 9, 4) || '-' ||
                  '7' || substring(v_rand, 1, 3) || '-' ||
                  to_hex(8 + (('x' || substring(v_rand, 4, 1))::bit(4)::integer % 4)) ||
                  substring(v_rand, 5, 3) || '-' ||
                  substring(v_rand, 8, 12);
        RETURN v_uuid::UUID;
      END;
      $$
    `);
  }
}
