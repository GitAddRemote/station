import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSoftDeleteToUsersAndMemberships1780220000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_user_deleted_at"
        ON "user" ("deleted_at")
        WHERE "deleted_at" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uor_deleted_at"
        ON "user_organization_role" ("deleted_at")
        WHERE "deleted_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uor_deleted_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_deleted_at";`);
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        DROP COLUMN IF EXISTS "deleted_at";
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN IF EXISTS "deleted_at";
    `);
  }
}
