import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStationSuperAdminToUsers1780200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "isStationSuperAdmin" BOOLEAN NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_isStationSuperAdmin" ON "user" ("isStationSuperAdmin")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_user_isStationSuperAdmin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "isStationSuperAdmin"`,
    );
  }
}
