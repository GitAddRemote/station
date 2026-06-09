import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUuidV7IdentityToUsersAndOrganizations1780110000000
  implements MigrationInterface
{
  name = 'AddUuidV7IdentityToUsersAndOrganizations1780110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);

    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN "id_uuid" UUID DEFAULT uuid_generate_v7()
    `);
    await queryRunner.query(`
      UPDATE "user"
      SET "id_uuid" = uuid_generate_v7()
      WHERE "id_uuid" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        ALTER COLUMN "id_uuid" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD CONSTRAINT "uq_user_id_uuid" UNIQUE ("id_uuid")
    `);

    await queryRunner.query(`
      ALTER TABLE "organization"
        ADD COLUMN "id_uuid" UUID DEFAULT uuid_generate_v7()
    `);
    await queryRunner.query(`
      UPDATE "organization"
      SET "id_uuid" = uuid_generate_v7()
      WHERE "id_uuid" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "organization"
        ALTER COLUMN "id_uuid" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "organization"
        ADD CONSTRAINT "uq_organization_id_uuid" UNIQUE ("id_uuid")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "organization"
        DROP CONSTRAINT IF EXISTS "uq_organization_id_uuid"
    `);
    await queryRunner.query(`
      ALTER TABLE "organization"
        DROP COLUMN IF EXISTS "id_uuid"
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
        DROP CONSTRAINT IF EXISTS "uq_user_id_uuid"
    `);
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN IF EXISTS "id_uuid"
    `);
  }

  private async ensureUuidV7Function(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION "uuid_generate_v7"()
      RETURNS UUID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        ts_hex TEXT;
        rand_hex TEXT;
        variant_nibble TEXT;
      BEGIN
        ts_hex := lpad(
          to_hex(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint),
          12,
          '0'
        );
        rand_hex := encode(gen_random_bytes(10), 'hex');
        variant_nibble := substr(
          '89ab',
          (get_byte(gen_random_bytes(1), 0) % 4) + 1,
          1
        );

        RETURN (
          substr(ts_hex, 1, 8) || '-' ||
          substr(ts_hex, 9, 4) || '-' ||
          '7' || substr(rand_hex, 1, 3) || '-' ||
          variant_nibble || substr(rand_hex, 4, 3) || '-' ||
          substr(rand_hex, 7, 12)
        )::uuid;
      END;
      $$
    `);
  }
}
