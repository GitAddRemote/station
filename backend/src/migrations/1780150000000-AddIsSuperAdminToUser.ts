import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSuperAdminToUser1780150000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_isSuperAdmin" ON "user" ("is_super_admin") WHERE "is_super_admin" = TRUE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_isSuperAdmin"`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "is_super_admin"`,
    );
  }
}
