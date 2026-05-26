import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStepNameToEtlRun1779710000000 implements MigrationInterface {
  name = 'AddStepNameToEtlRun1779710000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "station_etl_run" ADD COLUMN "step_name" VARCHAR(100) NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_etl_run_step_name" ON "station_etl_run" ("step_name") WHERE "step_name" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_etl_run_step_name"`);
    await queryRunner.query(
      `ALTER TABLE "station_etl_run" DROP COLUMN "step_name"`,
    );
  }
}
