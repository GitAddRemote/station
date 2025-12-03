import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class SeedSystemUser1764791795973 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Generate an unusable password hash (system user should never authenticate)
    const unusablePassword = await bcrypt.hash(
      'SYSTEM_USER_NO_LOGIN_' + Math.random(),
      10,
    );

    // Insert system user with ID = 1 (reserved)
    await queryRunner.query(
      `
      INSERT INTO "user" (
        "id",
        "username",
        "email",
        "password",
        "isActive",
        "isSystemUser"
      ) VALUES (
        1,
        'station-system',
        'system@station.internal',
        $1,
        true,
        true
      )
      ON CONFLICT (id) DO NOTHING
    `,
      [unusablePassword],
    );

    // Reset the sequence to start from 2 for normal users
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('user', 'id'), (SELECT MAX(id) FROM "user"), true)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove system user
    await queryRunner.query(`DELETE FROM "user" WHERE "id" = 1`);
  }
}
