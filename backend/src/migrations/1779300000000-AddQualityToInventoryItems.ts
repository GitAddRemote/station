import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQualityToInventoryItems1779300000000
  implements MigrationInterface
{
  name = 'AddQualityToInventoryItems1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE org_inventory_items
        ADD COLUMN IF NOT EXISTS quality SMALLINT NULL
          CONSTRAINT chk_org_inv_quality CHECK (quality >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE user_inventory_items
        ADD COLUMN IF NOT EXISTS quality SMALLINT NULL
          CONSTRAINT chk_user_inv_quality CHECK (quality >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE org_inventory_items
        DROP COLUMN IF EXISTS quality
    `);

    await queryRunner.query(`
      ALTER TABLE user_inventory_items
        DROP COLUMN IF EXISTS quality
    `);
  }
}
