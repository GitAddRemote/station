import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscordAuthToUsers1779608598950 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "discordId" VARCHAR NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "discordAvatarUrl" VARCHAR NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "UQ_user_discordId" UNIQUE ("discordId")`,
    );
    // Ensure email has an index for the email-match fallback in the OAuth callback
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_email" ON "user" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // IDX_user_email was created by the baseline migration; do not drop it here.
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "UQ_user_discordId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "discordAvatarUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "discordId"`,
    );
  }
}
