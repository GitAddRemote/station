import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueUuidToStationItem1780010901444
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate uuid rows before adding the constraint, keeping the
    // most recently synced row for each uuid (NULL uuids are never deduplicated
    // by a UNIQUE constraint so they are left as-is).
    await queryRunner.query(`
      DELETE FROM station_item
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY uuid ORDER BY synced_at DESC, id DESC) AS rn
          FROM station_item
          WHERE uuid IS NOT NULL
        ) ranked
        WHERE rn > 1
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_station_item_uuid" ON "station_item" ("uuid") WHERE "uuid" IS NOT NULL`,
    );

    // Drop the baseline non-unique idx_items_uuid — it is fully superseded by
    // the partial unique index above, which also serves as a lookup index.
    // Keeping both would leave a non-unique index that contradicts the new
    // uniqueness guarantee and could cause the reconciliation SELECT to return
    // an arbitrary row if a duplicate somehow slipped through.
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_items_uuid"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_station_item_uuid"`);
    await queryRunner.query(
      `CREATE INDEX "idx_items_uuid" ON "station_item" ("uuid")`,
    );
  }
}
