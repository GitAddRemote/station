import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoStepsEtlStatus1748000000002 implements MigrationInterface {
  name = 'AddNoStepsEtlStatus1748000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "station_etl_run" DROP CONSTRAINT IF EXISTS "station_etl_run_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_run" ADD CONSTRAINT "station_etl_run_status_check"
       CHECK (status IN ('running','completed','partial','failed','no_steps'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "station_etl_run" DROP CONSTRAINT IF EXISTS "station_etl_run_status_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_run" ADD CONSTRAINT "station_etl_run_status_check"
       CHECK (status IN ('running','completed','partial','failed'))`,
    );
  }
}
