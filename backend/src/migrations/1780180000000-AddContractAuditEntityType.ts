import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractAuditEntityType1780180000000
  implements MigrationInterface
{
  name = 'AddContractAuditEntityType1780180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."audit_log_entitytype_enum" ADD VALUE IF NOT EXISTS 'CONTRACT'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres does not support removing enum values; this is intentionally a no-op.
    // To roll back, recreate the enum without CONTRACT and migrate the column.
  }
}
