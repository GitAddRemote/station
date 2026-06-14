import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthInvite1780250000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE auth_invite (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        token        TEXT UNIQUE NOT NULL,
        created_by   uuid REFERENCES "user"(id),
        used_by      uuid REFERENCES "user"(id) NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at   TIMESTAMPTZ NOT NULL,
        used_at      TIMESTAMPTZ NULL,
        revoked      BOOLEAN NOT NULL DEFAULT false
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_auth_invite_token ON auth_invite(token)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE auth_invite`);
  }
}
