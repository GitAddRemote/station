import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the core contracts schema:
 *
 * 1. contract          – core record with type, status, risk, reward, deadline
 * 2. contract_milestone – ordered progress steps per contract
 * 3. contract_party    – links users/orgs to a contract with their role
 * 4. contract_item     – Transfer-of-Goods line items per contract
 */
export class AddContractsTables1780170000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Ensure uuid_generate_v7 exists ────────────────────────────────────
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto"
    `);

    // uuid_generate_v7 is expected to already exist via earlier migrations,
    // but we guard here to be safe.
    const fnExists: { exists: boolean }[] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'uuid_generate_v7'
      ) AS exists
    `);
    if (!fnExists[0]?.exists) {
      throw new Error(
        'uuid_generate_v7() function not found. ' +
          'Run earlier migrations (1780030000000-MigrateTablePksToUuidV7) first.',
      );
    }

    // ── contract ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "contract" (
        "id"                   UUID          NOT NULL DEFAULT uuid_generate_v7(),
        "org_id"               UUID          NOT NULL,
        "type"                 VARCHAR(50)   NOT NULL,
        "title"                VARCHAR(255)  NOT NULL,
        "description"          TEXT          NULL,
        "status"               VARCHAR(50)   NOT NULL DEFAULT 'draft',
        "risk"                 VARCHAR(20)   NULL,
        "reward_auec"          NUMERIC(15,2) NULL,
        "deadline"             TIMESTAMPTZ   NULL,
        "creator_id"           UUID          NOT NULL,
        "delivery_location_id" UUID          NULL,
        "details"              JSONB         NULL,
        "created_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_contract"
          PRIMARY KEY ("id"),
        CONSTRAINT "chk_contract_type"
          CHECK ("type" IN ('transport','transfer','mining','security','salvage','medical','refueling')),
        CONSTRAINT "chk_contract_status"
          CHECK ("status" IN ('draft','open','claimed','active','completed','disputed','cancelled')),
        CONSTRAINT "chk_contract_risk"
          CHECK ("risk" IS NULL OR "risk" IN ('low','medium','high')),
        CONSTRAINT "fk_contract_org"
          FOREIGN KEY ("org_id") REFERENCES "organization" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_contract_creator"
          FOREIGN KEY ("creator_id") REFERENCES "user" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_contract_delivery_location"
          FOREIGN KEY ("delivery_location_id") REFERENCES "station_location" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_contract_org_status"
        ON "contract" ("org_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_contract_org_type"
        ON "contract" ("org_id", "type")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_contract_creator_id"
        ON "contract" ("creator_id")
    `);

    // ── contract_milestone ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "contract_milestone" (
        "id"          UUID         NOT NULL DEFAULT uuid_generate_v7(),
        "contract_id" UUID         NOT NULL,
        "label"       VARCHAR(255) NOT NULL,
        "state"       VARCHAR(20)  NOT NULL DEFAULT 'pending',
        "sort_order"  INTEGER      NOT NULL DEFAULT 0,
        CONSTRAINT "pk_contract_milestone"
          PRIMARY KEY ("id"),
        CONSTRAINT "chk_contract_milestone_state"
          CHECK ("state" IN ('pending','active','done')),
        CONSTRAINT "fk_contract_milestone_contract"
          FOREIGN KEY ("contract_id") REFERENCES "contract" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_contract_milestone_status"
        ON "contract_milestone" ("state")
    `);

    // ── contract_party ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "contract_party" (
        "id"          UUID        NOT NULL DEFAULT uuid_generate_v7(),
        "contract_id" UUID        NOT NULL,
        "user_id"     UUID        NULL,
        "org_id"      UUID        NULL,
        "role"        VARCHAR(30) NOT NULL,
        CONSTRAINT "pk_contract_party"
          PRIMARY KEY ("id"),
        CONSTRAINT "chk_contract_party_role"
          CHECK ("role" IN ('creator','assignee','counterparty')),
        CONSTRAINT "fk_contract_party_contract"
          FOREIGN KEY ("contract_id") REFERENCES "contract" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_contract_party_user"
          FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_contract_party_org"
          FOREIGN KEY ("org_id") REFERENCES "organization" ("id") ON DELETE SET NULL
      )
    `);

    // ── contract_item ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "contract_item" (
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v7(),
        "contract_id"         UUID          NOT NULL,
        "item_subtype"        VARCHAR(20)   NOT NULL,
        "catalog_entry_id"    UUID          NULL,
        "inventory_item_id"   UUID          NULL,
        "pickup_location_id"  UUID          NULL,
        "quantity"            NUMERIC(15,4) NOT NULL DEFAULT 0,
        "quality"             NUMERIC(7,4)  NULL,
        "vehicle_subtype"     VARCHAR(10)   NULL,
        "sort_order"          INTEGER       NOT NULL DEFAULT 0,
        CONSTRAINT "pk_contract_item"
          PRIMARY KEY ("id"),
        CONSTRAINT "chk_contract_item_subtype"
          CHECK ("item_subtype" IN ('item','commodity','vehicle')),
        CONSTRAINT "chk_contract_item_vehicle_subtype"
          CHECK ("vehicle_subtype" IS NULL OR "vehicle_subtype" IN ('ground','ship')),
        CONSTRAINT "fk_contract_item_contract"
          FOREIGN KEY ("contract_id") REFERENCES "contract" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_contract_item_inventory_item"
          FOREIGN KEY ("inventory_item_id") REFERENCES "station_inventory_item" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_contract_item_pickup_location"
          FOREIGN KEY ("pickup_location_id") REFERENCES "station_location" ("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_contract_item_contract_sort"
        ON "contract_item" ("contract_id", "sort_order")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_contract_item_pickup_location_id"
        ON "contract_item" ("pickup_location_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first (cascade would handle them, but explicit is clearer)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_contract_item_pickup_location_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_contract_item_contract_sort"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "contract_item"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "contract_party"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_contract_milestone_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "contract_milestone"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_contract_creator_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_contract_org_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_contract_org_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contract"`);
  }
}
