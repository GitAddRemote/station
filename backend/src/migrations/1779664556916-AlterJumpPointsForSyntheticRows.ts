import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterJumpPointsForSyntheticRows1779664556916
  implements MigrationInterface
{
  name = 'AlterJumpPointsForSyntheticRows1779664556916';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // Replace BIGSERIAL PK with UUIDv7 (supplied by application; fallback to
    // gen_random_uuid() for any rows inserted outside the ETL step)
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP CONSTRAINT "station_jump_point_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY`,
    );

    // Drop the NOT NULL + UNIQUE constraints on uex_id so synthetic rows can
    // have a null uex_id; real rows get a partial unique index instead.
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP CONSTRAINT IF EXISTS "station_jump_point_uex_id_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ALTER COLUMN "uex_id" DROP NOT NULL`,
    );

    // Unique index for real (non-synthetic) rows only
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_jp_uex_id_real" ON "station_jump_point" ("uex_id") WHERE "is_synthetic" = FALSE`,
    );

    // Unique index for synthetic rows keyed by source_uex_id
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_jp_synthetic_source" ON "station_jump_point" ("source_uex_id") WHERE "is_synthetic" = TRUE`,
    );

    // Drop the old non-partial uex_id index created in the baseline migration
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jp_uex_id"`);

    // Add columns required by the ETL step
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ADD COLUMN IF NOT EXISTS "size" VARCHAR(10)`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ADD COLUMN IF NOT EXISTS "is_available_live" BOOLEAN NOT NULL DEFAULT FALSE`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP COLUMN IF EXISTS "is_available_live"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP COLUMN IF EXISTS "size"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP COLUMN IF EXISTS "name"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jp_synthetic_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_jp_uex_id_real"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_jp_uex_id" ON "station_jump_point" ("uex_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ALTER COLUMN "uex_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ADD CONSTRAINT "station_jump_point_uex_id_key" UNIQUE ("uex_id")`,
    );
    // Restore BIGSERIAL PK (loses existing UUID values — dev/staging only)
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP CONSTRAINT "station_jump_point_pkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_jump_point" ADD COLUMN "id" BIGSERIAL PRIMARY KEY`,
    );
  }
}
