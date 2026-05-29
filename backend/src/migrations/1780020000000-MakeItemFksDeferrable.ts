import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeItemFksDeferrable1780020000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the auto-named inline FK from station_item_attribute.item_uex_id
    // and recreate it as DEFERRABLE INITIALLY DEFERRED so the UUID-based
    // uex_id reconciliation in ItemsSyncStep can re-key dependents and update
    // the referenced uex_id within a single transaction without violating the
    // FK mid-statement.
    await queryRunner.query(`
      DO $$
      DECLARE
        con_name TEXT;
      BEGIN
        SELECT conname INTO con_name
        FROM pg_constraint
        WHERE conrelid = 'station_item_attribute'::regclass
          AND confrelid = 'station_item'::regclass
          AND contype = 'f'
        LIMIT 1;

        IF con_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE station_item_attribute DROP CONSTRAINT %I', con_name);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE station_item_attribute
        ADD CONSTRAINT fk_item_attr_item_uex_id
        FOREIGN KEY (item_uex_id)
        REFERENCES station_item (uex_id)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED
    `);

    // Drop and recreate the self-referential FK on station_item.parent_uex_id.
    await queryRunner.query(`
      DO $$
      DECLARE
        con_name TEXT;
      BEGIN
        SELECT conname INTO con_name
        FROM pg_constraint
        WHERE conrelid = 'station_item'::regclass
          AND confrelid = 'station_item'::regclass
          AND contype = 'f'
        LIMIT 1;

        IF con_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE station_item DROP CONSTRAINT %I', con_name);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE station_item
        ADD CONSTRAINT fk_item_parent_uex_id
        FOREIGN KEY (parent_uex_id)
        REFERENCES station_item (uex_id)
        ON DELETE SET NULL
        DEFERRABLE INITIALLY DEFERRED
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE station_item_attribute DROP CONSTRAINT IF EXISTS fk_item_attr_item_uex_id`,
    );
    await queryRunner.query(`
      ALTER TABLE station_item_attribute
        ADD CONSTRAINT fk_item_attr_item_uex_id
        FOREIGN KEY (item_uex_id)
        REFERENCES station_item (uex_id)
        ON DELETE CASCADE
    `);

    await queryRunner.query(
      `ALTER TABLE station_item DROP CONSTRAINT IF EXISTS fk_item_parent_uex_id`,
    );
    await queryRunner.query(`
      ALTER TABLE station_item
        ADD CONSTRAINT fk_item_parent_uex_id
        FOREIGN KEY (parent_uex_id)
        REFERENCES station_item (uex_id)
        ON DELETE SET NULL
    `);
  }
}
