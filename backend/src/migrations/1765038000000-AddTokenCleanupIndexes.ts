import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds indexes to support efficient token cleanup queries.
 *
 * The cleanup job deletes rows matching:
 *   refresh_tokens: revoked = true OR "expiresAt" < now
 *   password_resets: used = true OR "expiresAt" < now
 *
 * Partial indexes on the boolean flags keep index size small by only
 * covering the rows that will actually be deleted.
 */
export class AddTokenCleanupIndexes1765038000000 implements MigrationInterface {
  name = 'AddTokenCleanupIndexes1765038000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Partial index on revoked refresh tokens (WHERE clause mirrors cleanup query)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_revoked"
      ON "refresh_tokens" ("revoked")
      WHERE "revoked" = TRUE
    `);

    // Range index for expiry-based cleanup of refresh tokens
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_expiresAt"
      ON "refresh_tokens" ("expiresAt")
    `);

    // Partial index on used password resets (WHERE clause mirrors cleanup query)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_resets_used"
      ON "password_resets" ("used")
      WHERE "used" = TRUE
    `);

    // Range index for expiry-based cleanup of password resets
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_password_resets_expiresAt"
      ON "password_resets" ("expiresAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_password_resets_expiresAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_password_resets_used"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_expiresAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_refresh_tokens_revoked"`,
    );
  }
}
