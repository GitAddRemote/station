import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessUnits1780210000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "org_business_unit" (
        "id"              UUID          NOT NULL DEFAULT uuid_generate_v7(),
        "organizationId"  UUID          NOT NULL,
        "parent_id"       UUID          NULL,
        "name"            VARCHAR(128)  NOT NULL,
        "kind"            VARCHAR(32)   NOT NULL,
        "description"     TEXT          NULL,
        "sortOrder"       INTEGER       NOT NULL DEFAULT 0,
        "isActive"        BOOLEAN       NOT NULL DEFAULT true,
        "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_org_business_unit"
          PRIMARY KEY ("id"),
        CONSTRAINT "fk_obu_organization"
          FOREIGN KEY ("organizationId") REFERENCES "organization" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_obu_parent"
          FOREIGN KEY ("parent_id") REFERENCES "org_business_unit" ("id") ON DELETE SET NULL,
        CONSTRAINT "chk_obu_kind"
          CHECK ("kind" IN ('division','department','team','squad','wing','custom'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_obu_org"        ON "org_business_unit" ("organizationId");
      CREATE INDEX "idx_obu_org_parent" ON "org_business_unit" ("organizationId", "parent_id");
    `);

    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ADD COLUMN "business_unit_id" UUID NULL,
        ADD CONSTRAINT "fk_uor_business_unit"
          FOREIGN KEY ("business_unit_id") REFERENCES "org_business_unit" ("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_uor_business_unit" ON "user_organization_role" ("business_unit_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        DROP CONSTRAINT IF EXISTS "fk_uor_business_unit",
        DROP COLUMN IF EXISTS "business_unit_id";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_uor_business_unit";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_obu_org_parent";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_obu_org";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "org_business_unit";`);
  }
}
