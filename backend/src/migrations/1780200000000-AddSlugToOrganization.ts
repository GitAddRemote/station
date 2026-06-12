import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlugToOrganization1780200000000 implements MigrationInterface {
  name = 'AddSlugToOrganization1780200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "slug" varchar(100)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_organization_slug" ON "organization" ("slug") WHERE "slug" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_organization_slug"`);
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "slug"`);
  }
}
