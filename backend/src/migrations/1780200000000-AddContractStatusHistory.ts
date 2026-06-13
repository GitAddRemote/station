import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContractStatusHistory1780200000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contract_status_history" (
        "id"              UUID        NOT NULL DEFAULT uuid_generate_v7(),
        "contract_id"     UUID        NOT NULL,
        "from_status"     VARCHAR(50) NULL,
        "to_status"       VARCHAR(50) NOT NULL,
        "changed_by"      UUID        NOT NULL,
        "changed_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "note"            TEXT        NULL,
        CONSTRAINT "pk_contract_status_history"
          PRIMARY KEY ("id"),
        CONSTRAINT "fk_csh_contract"
          FOREIGN KEY ("contract_id") REFERENCES "contract" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_csh_user"
          FOREIGN KEY ("changed_by") REFERENCES "user" ("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_csh_contract_id"
        ON "contract_status_history" ("contract_id", "changed_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_csh_changed_by"
        ON "contract_status_history" ("changed_by")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_csh_changed_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_csh_contract_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contract_status_history"`);
  }
}
