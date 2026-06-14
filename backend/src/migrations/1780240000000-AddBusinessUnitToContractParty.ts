import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBusinessUnitToContractParty1780240000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contract_party"
        ADD COLUMN IF NOT EXISTS "business_unit_id" uuid NULL
          REFERENCES "org_business_unit" ("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_contract_party_bu"
        ON "contract_party" ("business_unit_id")
        WHERE "business_unit_id" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_contract_party_bu"`);
    await queryRunner.query(
      `ALTER TABLE "contract_party" DROP COLUMN IF EXISTS "business_unit_id"`,
    );
  }
}
