import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = [
  'game',
  'role',
  'audit_log',
  'inventory_audit_log',
  'password_reset',
  'station_etl_warning',
  'user_organization_role',
];

export class AddUuidDefaultsToMissingPkColumns1780190000000
  implements MigrationInterface
{
  name = 'AddUuidDefaultsToMissingPkColumns1780190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT uuid_generate_v7()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`,
      );
    }
  }
}
