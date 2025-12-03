import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSystemUserColumn1764791773398 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_system_user column to users table
    await queryRunner.query(
      `ALTER TABLE "user" ADD COLUMN "isSystemUser" boolean NOT NULL DEFAULT false`,
    );

    // Create index for system user queries
    await queryRunner.query(
      `CREATE INDEX "IDX_user_is_system_user" ON "user" ("isSystemUser")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_user_is_system_user"`);

    // Drop column
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isSystemUser"`);
  }
}
