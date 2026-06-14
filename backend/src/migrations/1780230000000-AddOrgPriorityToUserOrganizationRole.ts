import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgPriorityToUserOrganizationRole1780230000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
      ADD COLUMN IF NOT EXISTS "org_priority" integer NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_uor_user_priority"
      ON "user_organization_role" ("userId", "org_priority")
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_uor_user_priority"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
      DROP COLUMN IF EXISTS "org_priority"
    `);
  }
}
