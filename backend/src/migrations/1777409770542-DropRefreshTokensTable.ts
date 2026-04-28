import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRefreshTokensTable1777409770542 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Refresh tokens now live in Redis with per-entry TTL.
    // The DB table is no longer written to after ISSUE-109.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_token"`);
    await queryRunner.dropTable('refresh_tokens', true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "token" varchar NOT NULL UNIQUE,
        "userId" integer NOT NULL,
        "expiresAt" timestamp NOT NULL,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "revoked" boolean NOT NULL DEFAULT false,
        CONSTRAINT "FK_refresh_tokens_user"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_token" ON "refresh_tokens" ("token")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
    );
  }
}
