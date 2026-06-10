import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Swaps all remaining integer PKs to UUID v7:
 *   game, role, user (pk swap), organization (pk swap),
 *   user_organization_role, password_reset, audit_log, station_etl_warning
 *
 * User and Organization already have id_uuid columns (migration 1780110000000).
 * For them we only need to swap the PK and update downstream FKs.
 *
 * For every other table we follow the same pattern used in 1780030000000:
 *   1. Add legacy_id (preserve old int), add id_uuid, populate
 *   2. Drop FKs that reference the old int PK
 *   3. Swap PK to id_uuid, rename to id
 *   4. Re-point FK columns on dependent tables to new UUID PKs
 *   5. Recreate FK constraints
 */
export class MigrateRemainingEntitiesToUuidV7_1780130000000
  implements MigrationInterface
{
  name = 'MigrateRemainingEntitiesToUuidV7_1780130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);

    // ── 1. game ──────────────────────────────────────────────────────────────
    // Add uuid column, populate, swap PK
    await queryRunner.query(`
      ALTER TABLE "game"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid"   UUID
    `);
    await queryRunner.query(
      `UPDATE "game" SET "legacy_id" = "id", "id_uuid" = uuid_generate_v7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );

    // Update organization.game_id FK column to UUID before swapping game PK
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "game_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "organization" o
      SET "game_id_uuid" = g."id_uuid"
      FROM "game" g
      WHERE o."game_id" = g."legacy_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "organization"
        DROP CONSTRAINT IF EXISTS "FK_organization_game_id"
    `);
    // Drop any auto-generated FK on organization.game_id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'organization'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name ILIKE '%game%'
        LOOP
          EXECUTE 'ALTER TABLE "organization" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap game PK
    await queryRunner.query(
      `ALTER TABLE "game" DROP CONSTRAINT "PK_352a30652cd352f552fef73dec5"`,
    );
    await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "game" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "PK_game" PRIMARY KEY ("id")`,
    );

    // Finish organization.game_id swap
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "game_id"`);
    await queryRunner.query(
      `ALTER TABLE "organization" RENAME COLUMN "game_id_uuid" TO "game_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "organization"
        ADD CONSTRAINT "FK_organization_game_id" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE RESTRICT
    `);

    // ── 2. role ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "role"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid"   UUID
    `);
    await queryRunner.query(
      `UPDATE "role" SET "legacy_id" = "id", "id_uuid" = uuid_generate_v7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );

    // Add uuid shadow column on user_organization_role for role FK
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD COLUMN "role_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_organization_role" uor
      SET "role_id_uuid" = r."id_uuid"
      FROM "role" r
      WHERE uor."roleId" = r."legacy_id"
    `);
    // Drop FK on roleId
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'user_organization_role'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name ILIKE '%role%'
        LOOP
          EXECUTE 'ALTER TABLE "user_organization_role" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap role PK
    await queryRunner.query(
      `ALTER TABLE "role" DROP CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2"`,
    );
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "role" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD CONSTRAINT "PK_role" PRIMARY KEY ("id")`,
    );

    // ── 3. user PK swap (id_uuid already exists from migration 1780110000000) ─
    // Need to update downstream FKs first: user_organization_role.userId, password_reset.userId
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD COLUMN "user_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_organization_role" uor
      SET "user_id_uuid" = u."id_uuid"
      FROM "user" u
      WHERE uor."userId" = u."id"
    `);

    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD COLUMN "user_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "password_reset" pr
      SET "user_id_uuid" = u."id_uuid"
      FROM "user" u
      WHERE pr."userId" = u."id"
    `);

    // Drop all FKs referencing user.id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.key_column_usage ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE ccu.table_name = 'user'
            AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
          EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap user PK
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "PK_cace4a159ff9f2512dd42373760"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "uq_user_id_uuid"`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "PK_user" PRIMARY KEY ("id")`,
    );

    // ── 4. organization PK swap (id_uuid already exists) ─────────────────────
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD COLUMN "org_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_organization_role" uor
      SET "org_id_uuid" = o."id_uuid"
      FROM "organization" o
      WHERE uor."organizationId" = o."id"
    `);

    // Drop all FKs referencing organization.id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.key_column_usage ccu
            ON rc.unique_constraint_name = ccu.constraint_name
          WHERE ccu.table_name = 'organization'
            AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
          EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap organization PK
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT "PK_472c1f99a32def1b0abb219cd67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "uq_organization_id_uuid"`,
    );
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "organization" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "PK_organization" PRIMARY KEY ("id")`,
    );

    // ── 5. user_organization_role — swap all FK columns and PK ───────────────
    // All shadow UUID columns are now populated; drop old int columns
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        DROP COLUMN "userId",
        DROP COLUMN "organizationId",
        DROP COLUMN "roleId"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        RENAME COLUMN "user_id_uuid" TO "userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        RENAME COLUMN "org_id_uuid" TO "organizationId"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        RENAME COLUMN "role_id_uuid" TO "roleId"
    `);
    // NOT NULL on the new UUID FK columns
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ALTER COLUMN "userId" SET NOT NULL,
        ALTER COLUMN "organizationId" SET NOT NULL,
        ALTER COLUMN "roleId" SET NOT NULL
    `);

    // Swap UOR PK
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid"   UUID
    `);
    await queryRunner.query(
      `UPDATE "user_organization_role" SET "legacy_id" = "id", "id_uuid" = uuid_generate_v7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );
    // Drop old integer PK
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'user_organization_role' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "user_organization_role" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD CONSTRAINT "PK_uor" PRIMARY KEY ("id")`,
    );

    // Drop old unique index (userId+organizationId+roleId was on int columns) — recreate on UUID
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT indexname FROM pg_indexes
          WHERE tablename = 'user_organization_role'
            AND indexname ILIKE '%userId%organizationId%roleId%'
        LOOP
          EXECUTE 'DROP INDEX IF EXISTS "' || r.indexname || '"';
        END LOOP;
      END$$
    `);

    // Recreate FK constraints
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ADD CONSTRAINT "FK_uor_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_uor_org"  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "FK_uor_role" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_uor_user_org_role"
        ON "user_organization_role" ("userId", "organizationId", "roleId")
    `);

    // ── 6. password_reset — swap userId FK column and PK ─────────────────────
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP COLUMN "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" RENAME COLUMN "user_id_uuid" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ALTER COLUMN "userId" SET NOT NULL`,
    );

    await queryRunner.query(`
      ALTER TABLE "password_reset"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid"   UUID
    `);
    await queryRunner.query(
      `UPDATE "password_reset" SET "legacy_id" = "id", "id_uuid" = uuid_generate_v7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'password_reset' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "password_reset" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(`ALTER TABLE "password_reset" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "password_reset" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD CONSTRAINT "PK_password_reset" PRIMARY KEY ("id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "password_reset"
        ADD CONSTRAINT "FK_password_reset_user" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
    `);

    // ── 7. audit_log — userId and entityId become text (UUID or string ID) ───
    // These are denormalised audit columns — no FK constraint, just change type
    await queryRunner.query(`
      ALTER TABLE "audit_log"
        ADD COLUMN "legacy_id"     BIGINT,
        ADD COLUMN "id_uuid"       UUID,
        ADD COLUMN "user_id_text"  TEXT,
        ADD COLUMN "entity_id_text" TEXT
    `);
    await queryRunner.query(`
      UPDATE "audit_log"
      SET "legacy_id"      = "id",
          "id_uuid"        = uuid_generate_v7(),
          "user_id_text"   = "userId"::TEXT,
          "entity_id_text" = "entityId"::TEXT
    `);
    await queryRunner.query(
      `ALTER TABLE "audit_log" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'audit_log' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "audit_log" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "entityId"`);
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "user_id_text" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "entity_id_text" TO "entityId"`,
    );

    // ── 8. station_etl_warning — swap bigint PK to UUID ──────────────────────
    await queryRunner.query(`
      ALTER TABLE "station_etl_warning"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid"   UUID
    `);
    await queryRunner.query(
      `UPDATE "station_etl_warning" SET "legacy_id" = "id"::BIGINT, "id_uuid" = uuid_generate_v7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'station_etl_warning' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "station_etl_warning" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" ADD CONSTRAINT "PK_station_etl_warning" PRIMARY KEY ("id")`,
    );

    // ── 9. Recreate indexes ───────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_uor_userId_orgId" ON "user_organization_role" ("userId", "organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_uor_orgId_roleId" ON "user_organization_role" ("organizationId", "roleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_uor_userId_roleId" ON "user_organization_role" ("userId", "roleId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration restores integer PKs from legacy_id columns.
    // Order is reverse of up: children before parents.

    // station_etl_warning
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" DROP CONSTRAINT IF EXISTS "PK_station_etl_warning"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" ADD COLUMN "old_id" BIGSERIAL`,
    );
    await queryRunner.query(
      `UPDATE "station_etl_warning" SET "old_id" = "legacy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" ADD CONSTRAINT "PK_station_etl_warning_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "station_etl_warning" DROP COLUMN IF EXISTS "legacy_id"`,
    );

    // audit_log
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "PK_audit_log"`,
    );
    await queryRunner.query(`
      ALTER TABLE "audit_log"
        ADD COLUMN "old_id"         BIGSERIAL,
        ADD COLUMN "user_id_int"    INTEGER,
        ADD COLUMN "entity_id_int"  INTEGER
    `);
    await queryRunner.query(
      `UPDATE "audit_log" SET "old_id" = "legacy_id", "user_id_int" = "userId"::INTEGER, "entity_id_int" = "entityId"::INTEGER`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP COLUMN "id", DROP COLUMN "userId", DROP COLUMN "entityId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "user_id_int" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "entity_id_int" TO "entityId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_log_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "legacy_id"`,
    );

    // password_reset
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP CONSTRAINT IF EXISTS "FK_password_reset_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP CONSTRAINT IF EXISTS "PK_password_reset"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD COLUMN "old_id" BIGSERIAL, ADD COLUMN "user_id_int" INTEGER`,
    );
    await queryRunner.query(
      `UPDATE "password_reset" SET "old_id" = "legacy_id", "user_id_int" = 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP COLUMN "id", DROP COLUMN "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" RENAME COLUMN "user_id_int" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD CONSTRAINT "PK_password_reset_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset" DROP COLUMN IF EXISTS "legacy_id"`,
    );

    // user_organization_role
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" DROP CONSTRAINT IF EXISTS "FK_uor_user", DROP CONSTRAINT IF EXISTS "FK_uor_org", DROP CONSTRAINT IF EXISTS "FK_uor_role"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_uor_user_org_role", "IDX_uor_userId_orgId", "IDX_uor_orgId_roleId", "IDX_uor_userId_roleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" DROP CONSTRAINT IF EXISTS "PK_uor"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ADD COLUMN "old_id"   BIGSERIAL,
        ADD COLUMN "user_id_int" INTEGER DEFAULT 0,
        ADD COLUMN "org_id_int"  INTEGER DEFAULT 0,
        ADD COLUMN "role_id_int" INTEGER DEFAULT 0
    `);
    await queryRunner.query(
      `UPDATE "user_organization_role" SET "old_id" = "legacy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" DROP COLUMN "id", DROP COLUMN "userId", DROP COLUMN "organizationId", DROP COLUMN "roleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "user_id_int" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "org_id_int" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "role_id_int" TO "roleId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD CONSTRAINT "PK_uor_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" DROP COLUMN IF EXISTS "legacy_id"`,
    );

    // organization PK restore
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "PK_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "old_id" BIGSERIAL`,
    );
    await queryRunner.query(`UPDATE "organization" SET "old_id" = 0`);
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "organization" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "PK_organization_legacy" PRIMARY KEY ("id")`,
    );

    // user PK restore
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "PK_user"`,
    );
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "old_id" BIGSERIAL`);
    await queryRunner.query(`UPDATE "user" SET "old_id" = 0`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "PK_user_legacy" PRIMARY KEY ("id")`,
    );

    // role
    await queryRunner.query(
      `ALTER TABLE "role" DROP CONSTRAINT IF EXISTS "PK_role"`,
    );
    await queryRunner.query(`ALTER TABLE "role" ADD COLUMN "old_id" BIGSERIAL`);
    await queryRunner.query(`UPDATE "role" SET "old_id" = "legacy_id"`);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "role" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD CONSTRAINT "PK_role_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" DROP COLUMN IF EXISTS "legacy_id"`,
    );

    // game
    await queryRunner.query(
      `ALTER TABLE "organization" DROP CONSTRAINT IF EXISTS "FK_organization_game_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "game_id_int" INTEGER DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "game_id"`);
    await queryRunner.query(
      `ALTER TABLE "organization" RENAME COLUMN "game_id_int" TO "game_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" DROP CONSTRAINT IF EXISTS "PK_game"`,
    );
    await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "old_id" BIGSERIAL`);
    await queryRunner.query(`UPDATE "game" SET "old_id" = "legacy_id"`);
    await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "game" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "PK_game_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" DROP COLUMN IF EXISTS "legacy_id"`,
    );
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
