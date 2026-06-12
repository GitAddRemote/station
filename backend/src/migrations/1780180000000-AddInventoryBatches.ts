import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryBatches1780180000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE station_inventory_batch (
        id UUID NOT NULL DEFAULT uuid_generate_v7(),
        owner_type VARCHAR(10) NOT NULL,
        owner_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        location_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_station_inventory_batch PRIMARY KEY (id),
        CONSTRAINT fk_station_inventory_batch_location
          FOREIGN KEY (location_id) REFERENCES station_location(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_station_inventory_batch_owner
        ON station_inventory_batch (owner_type, owner_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_station_inventory_batch_location_id
        ON station_inventory_batch (location_id)
    `);

    await queryRunner.query(`
      ALTER TABLE station_inventory_item
        ADD COLUMN batch_id UUID NULL,
        ADD CONSTRAINT fk_station_inventory_item_batch
          FOREIGN KEY (batch_id) REFERENCES station_inventory_batch(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX idx_station_inventory_item_batch_id
        ON station_inventory_item (batch_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_station_inventory_item_batch_id
    `);

    await queryRunner.query(`
      ALTER TABLE station_inventory_item
        DROP CONSTRAINT IF EXISTS fk_station_inventory_item_batch,
        DROP COLUMN IF EXISTS batch_id
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_station_inventory_batch_location_id
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_station_inventory_batch_owner
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS station_inventory_batch
    `);
  }
}
