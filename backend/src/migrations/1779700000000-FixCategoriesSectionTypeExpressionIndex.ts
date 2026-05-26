import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCategoriesSectionTypeExpressionIndex1779700000000
  implements MigrationInterface
{
  name = 'FixCategoriesSectionTypeExpressionIndex1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_categories_section_type"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categories_section_type" ON "station_category" (COALESCE("type", ''), "name") WHERE "is_section" = TRUE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_categories_section_type"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categories_section_type" ON "station_category" ("type", "name") WHERE "is_section" = TRUE`,
    );
  }
}
