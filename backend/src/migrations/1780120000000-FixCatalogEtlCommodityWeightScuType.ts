import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCatalogEtlCommodityWeightScuType1780120000000
  implements MigrationInterface
{
  name = 'FixCatalogEtlCommodityWeightScuType1780120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_commodity"
        ALTER COLUMN "weight_scu"
        TYPE DECIMAL(10, 2)
        USING "weight_scu"::DECIMAL(10, 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "station_commodity"
        ALTER COLUMN "weight_scu"
        TYPE SMALLINT
        USING ROUND("weight_scu")::SMALLINT
    `);
  }
}
