import { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogEtlSchemaMigration1748000000001
  implements MigrationInterface
{
  name = 'CatalogEtlSchemaMigration1748000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old tables (BigBang baseline created the wrong shape)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_etl_run_state" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_etl_warning" CASCADE`,
    );

    // Create new station_etl_run
    await queryRunner.query(`
      CREATE TABLE "station_etl_run" (
        "run_id"          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
        "started_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "completed_at"    TIMESTAMPTZ,
        "steps_total"     INTEGER     NOT NULL DEFAULT 0,
        "steps_succeeded" INTEGER     NOT NULL DEFAULT 0,
        "steps_failed"    INTEGER     NOT NULL DEFAULT 0,
        "status"          VARCHAR(20) NOT NULL DEFAULT 'running'
          CHECK (status IN ('running','completed','partial','failed','no_steps')),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create new station_etl_warning with FK to station_etl_run
    await queryRunner.query(`
      CREATE TABLE "station_etl_warning" (
        "id"          BIGSERIAL    PRIMARY KEY,
        "run_id"      UUID         NOT NULL REFERENCES "station_etl_run"("run_id") ON DELETE CASCADE,
        "step_name"   VARCHAR(100) NOT NULL,
        "severity"    VARCHAR(10)  NOT NULL DEFAULT 'warn'
          CHECK (severity IN ('warn','error')),
        "message"     TEXT         NOT NULL,
        "raw_payload" JSONB,
        "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_station_etl_warning_run_id" ON "station_etl_warning" ("run_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new tables
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_etl_warning" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_etl_run" CASCADE`);

    // Restore original station_etl_warning
    await queryRunner.query(`
      CREATE TABLE "station_etl_warning" (
        "id"          BIGSERIAL   PRIMARY KEY,
        "entity_type" VARCHAR(50) NOT NULL,
        "uex_id"      INTEGER,
        "field"       VARCHAR(100),
        "message"     TEXT        NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_etl_warnings_entity" ON "station_etl_warning" ("entity_type", "created_at" DESC)`,
    );

    // Restore original station_etl_run_state
    await queryRunner.query(`
      CREATE TABLE "station_etl_run_state" (
        "id"            BIGSERIAL    PRIMARY KEY,
        "run_name"      VARCHAR(100) NOT NULL,
        "step_name"     VARCHAR(100) NOT NULL,
        "status"        VARCHAR(20)  NOT NULL DEFAULT 'pending',
        "started_at"    TIMESTAMPTZ,
        "finished_at"   TIMESTAMPTZ,
        "rows_upserted" INTEGER,
        "error_message" TEXT,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_etl_run_state_run_step" ON "station_etl_run_state" ("run_name", "step_name")`,
    );
  }
}
