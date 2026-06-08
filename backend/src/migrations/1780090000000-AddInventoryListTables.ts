import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryListTables1780090000000 implements MigrationInterface {
  name = 'AddInventoryListTables1780090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "station_inventory_list" (
        "id" UUID NOT NULL DEFAULT uuid_generate_v7(),
        "owner_type" VARCHAR(10) NOT NULL,
        "owner_id" UUID NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "is_shared" BOOLEAN NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_station_inventory_list" PRIMARY KEY ("id"),
        CONSTRAINT "chk_station_inventory_list_owner_type"
          CHECK ("owner_type" IN ('user', 'org'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_station_inventory_list_owner"
        ON "station_inventory_list" ("owner_type", "owner_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "station_inventory_list_item" (
        "list_id" UUID NOT NULL,
        "inventory_item_id" UUID NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_station_inventory_list_item"
          PRIMARY KEY ("list_id", "inventory_item_id"),
        CONSTRAINT "uq_station_inventory_list_item_list_inventory"
          UNIQUE ("list_id", "inventory_item_id"),
        CONSTRAINT "fk_station_inventory_list_item_list_id"
          FOREIGN KEY ("list_id")
          REFERENCES "station_inventory_list" ("id")
          ON DELETE CASCADE,
        CONSTRAINT "fk_station_inventory_list_item_inventory_item_id"
          FOREIGN KEY ("inventory_item_id")
          REFERENCES "station_inventory_item" ("id")
          ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_inventory_list_item" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_inventory_list" CASCADE`,
    );
  }
}
