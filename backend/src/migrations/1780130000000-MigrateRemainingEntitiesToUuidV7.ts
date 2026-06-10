import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Swaps all remaining integer PKs to UUID v7:
 *   game, role, user (pk swap), organization (pk swap),
 *   user_organization_role, password_reset, audit_log, station_etl_warning,
 *   inventory_audit_log
 *
 * Also migrates all integer FK columns that reference the above tables:
 *   uex_* added_by / modified_by → UUID (→ user)
 *   org_inventory_item game_id, org_id, added_by, modified_by → UUID
 *   user_inventory_item game_id, user_id, shared_org_id, added_by, modified_by → UUID
 *   inventory_audit_log user_id, org_id → UUID; PK bigint → UUID
 *
 * User and Organization already have id_uuid columns (migration 1780110000000).
 * For them we only need to swap the PK and update downstream FKs.
 *
 * Pattern for every table:
 *   1. Add shadow UUID column, populate from parent id_uuid
 *   2. Drop old FK constraint
 *   3. Drop old integer column
 *   4. Rename shadow column to original name
 *   5. Recreate FK constraint
 *
 * Also fixes seed data: renames the system user from 'system' → 'station-system'.
 */
export class MigrateRemainingEntitiesToUuidV7_1780130000000
  implements MigrationInterface
{
  name = 'MigrateRemainingEntitiesToUuidV7_1780130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.ensureUuidV7Function(queryRunner);

    // ── 0. Fix system user seed data ─────────────────────────────────────────
    await queryRunner.query(`
      UPDATE "user"
      SET "username" = 'station-system'
      WHERE "username" = 'system' AND "isSystemUser" = TRUE
    `);

    // ── 1. game ──────────────────────────────────────────────────────────────
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

    // Shadow game_id on org_inventory_item
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" ADD COLUMN "game_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "org_inventory_item" oi
      SET "game_id_uuid" = g."id_uuid"
      FROM "game" g
      WHERE oi."game_id" = g."legacy_id"
    `);

    // Shadow game_id on user_inventory_item
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" ADD COLUMN "game_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_inventory_item" ui
      SET "game_id_uuid" = g."id_uuid"
      FROM "game" g
      WHERE ui."game_id" = g."legacy_id"
    `);

    // Shadow game_id on organization
    await queryRunner.query(
      `ALTER TABLE "organization" ADD COLUMN "game_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "organization" o
      SET "game_id_uuid" = g."id_uuid"
      FROM "game" g
      WHERE o."game_id" = g."legacy_id"
    `);

    // Drop all FKs referencing game.id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.key_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
          WHERE ccu.table_name = 'game' AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
          EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap game PK
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'game' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "game" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "game" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game" ADD CONSTRAINT "PK_game" PRIMARY KEY ("id")`,
    );

    // Finish game_id swap on organization, org_inventory_item, user_inventory_item
    await queryRunner.query(`ALTER TABLE "organization" DROP COLUMN "game_id"`);
    await queryRunner.query(
      `ALTER TABLE "organization" RENAME COLUMN "game_id_uuid" TO "game_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "organization"
        ADD CONSTRAINT "FK_organization_game_id" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" DROP COLUMN "game_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" RENAME COLUMN "game_id_uuid" TO "game_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "org_inventory_item"
        ADD CONSTRAINT "org_inventory_item_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" DROP COLUMN "game_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" RENAME COLUMN "game_id_uuid" TO "game_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_inventory_item"
        ADD CONSTRAINT "user_inventory_item_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE RESTRICT
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

    // Shadow roleId on user_organization_role
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD COLUMN "role_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_organization_role" uor
      SET "role_id_uuid" = r."id_uuid"
      FROM "role" r
      WHERE uor."roleId" = r."legacy_id"
    `);

    // Drop all FKs referencing role.id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.key_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
          WHERE ccu.table_name = 'role' AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
          EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap role PK
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'role' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "role" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(`ALTER TABLE "role" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "role" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role" ADD CONSTRAINT "PK_role" PRIMARY KEY ("id")`,
    );

    // ── 3. user PK swap (id_uuid already exists from migration 1780110000000) ─

    // Shadow user FK columns on all downstream tables before swapping user PK
    // user_organization_role.userId
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD COLUMN "user_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_organization_role" uor
      SET "user_id_uuid" = u."id_uuid"
      FROM "user" u
      WHERE uor."userId" = u."id"
    `);

    // password_reset.userId
    await queryRunner.query(
      `ALTER TABLE "password_reset" ADD COLUMN "user_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "password_reset" pr
      SET "user_id_uuid" = u."id_uuid"
      FROM "user" u
      WHERE pr."userId" = u."id"
    `);

    // uex_* added_by / modified_by
    const uexTables = [
      'uex_star_system',
      'uex_planet',
      'uex_moon',
      'uex_city',
      'uex_space_station',
      'uex_outpost',
      'uex_poi',
      'uex_company',
      'uex_category',
      'uex_commodity',
      'uex_item',
    ];
    for (const tbl of uexTables) {
      await queryRunner.query(
        `ALTER TABLE "${tbl}" ADD COLUMN "added_by_uuid" UUID, ADD COLUMN "modified_by_uuid" UUID`,
      );
      await queryRunner.query(`
        UPDATE "${tbl}" t
        SET "added_by_uuid"   = u1."id_uuid",
            "modified_by_uuid" = u2."id_uuid"
        FROM "user" u1, "user" u2
        WHERE t."added_by"    = u1."id"
          AND t."modified_by" = u2."id"
      `);
    }

    // org_inventory_item added_by / modified_by
    await queryRunner.query(`
      ALTER TABLE "org_inventory_item"
        ADD COLUMN "added_by_uuid"    UUID,
        ADD COLUMN "modified_by_uuid" UUID
    `);
    await queryRunner.query(`
      UPDATE "org_inventory_item" oi
      SET "added_by_uuid"    = u1."id_uuid",
          "modified_by_uuid" = u2."id_uuid"
      FROM "user" u1, "user" u2
      WHERE oi."added_by"    = u1."id"
        AND oi."modified_by" = u2."id"
    `);

    // user_inventory_item user_id / added_by / modified_by
    await queryRunner.query(`
      ALTER TABLE "user_inventory_item"
        ADD COLUMN "user_id_uuid"     UUID,
        ADD COLUMN "added_by_uuid"    UUID,
        ADD COLUMN "modified_by_uuid" UUID
    `);
    await queryRunner.query(`
      UPDATE "user_inventory_item" ui
      SET "user_id_uuid"     = u."id_uuid",
          "added_by_uuid"    = u1."id_uuid",
          "modified_by_uuid" = u2."id_uuid"
      FROM "user" u, "user" u1, "user" u2
      WHERE ui."user_id"    = u."id"
        AND ui."added_by"   = u1."id"
        AND ui."modified_by" = u2."id"
    `);

    // inventory_audit_log user_id
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" ADD COLUMN "user_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "inventory_audit_log" ial
      SET "user_id_uuid" = u."id_uuid"
      FROM "user" u
      WHERE ial."user_id" = u."id"
    `);

    // Drop all FKs referencing user.id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.key_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
          WHERE ccu.table_name = 'user' AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
          EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap user PK
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'user' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "user" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
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

    // Finish user FK columns: uex_*
    for (const tbl of uexTables) {
      await queryRunner.query(
        `ALTER TABLE "${tbl}" DROP COLUMN "added_by", DROP COLUMN "modified_by"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tbl}" RENAME COLUMN "added_by_uuid" TO "added_by"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tbl}" RENAME COLUMN "modified_by_uuid" TO "modified_by"`,
      );
      await queryRunner.query(`
        ALTER TABLE "${tbl}"
          ADD CONSTRAINT "${tbl}_added_by_fkey"    FOREIGN KEY ("added_by")    REFERENCES "user"("id") ON DELETE SET NULL,
          ADD CONSTRAINT "${tbl}_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "user"("id") ON DELETE SET NULL
      `);
    }

    // Finish user FK columns: org_inventory_item
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" DROP COLUMN "added_by", DROP COLUMN "modified_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" RENAME COLUMN "added_by_uuid" TO "added_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" RENAME COLUMN "modified_by_uuid" TO "modified_by"`,
    );
    await queryRunner.query(`
      ALTER TABLE "org_inventory_item"
        ADD CONSTRAINT "org_inventory_item_added_by_fkey"    FOREIGN KEY ("added_by")    REFERENCES "user"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "org_inventory_item_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "user"("id") ON DELETE SET NULL
    `);

    // Finish user FK columns: user_inventory_item
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_identity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_item_agg"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_list"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_org_view"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_inv_recent"`);
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" DROP COLUMN "user_id", DROP COLUMN "added_by", DROP COLUMN "modified_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" RENAME COLUMN "user_id_uuid" TO "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" RENAME COLUMN "added_by_uuid" TO "added_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" RENAME COLUMN "modified_by_uuid" TO "modified_by"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_inventory_item"
        ADD CONSTRAINT "user_inventory_item_user_id_fkey"     FOREIGN KEY ("user_id")     REFERENCES "user"("id") ON DELETE CASCADE,
        ADD CONSTRAINT "user_inventory_item_added_by_fkey"    FOREIGN KEY ("added_by")    REFERENCES "user"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "user_inventory_item_modified_by_fkey" FOREIGN KEY ("modified_by") REFERENCES "user"("id") ON DELETE SET NULL
    `);

    // Finish user FK columns: inventory_audit_log
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inv_audit_user"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" DROP COLUMN "user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" RENAME COLUMN "user_id_uuid" TO "user_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "inventory_audit_log"
        ADD CONSTRAINT "inventory_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL
    `);

    // ── 4. organization PK swap (id_uuid already exists) ─────────────────────

    // Shadow org FK columns on downstream tables
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" ADD COLUMN "org_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_organization_role" uor
      SET "org_id_uuid" = o."id_uuid"
      FROM "organization" o
      WHERE uor."organizationId" = o."id"
    `);

    // org_inventory_item.org_id
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" ADD COLUMN "org_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "org_inventory_item" oi
      SET "org_id_uuid" = o."id_uuid"
      FROM "organization" o
      WHERE oi."org_id" = o."id"
    `);

    // user_inventory_item.shared_org_id (nullable)
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" ADD COLUMN "shared_org_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "user_inventory_item" ui
      SET "shared_org_id_uuid" = o."id_uuid"
      FROM "organization" o
      WHERE ui."shared_org_id" = o."id"
    `);

    // inventory_audit_log.org_id (nullable)
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" ADD COLUMN "org_id_uuid" UUID`,
    );
    await queryRunner.query(`
      UPDATE "inventory_audit_log" ial
      SET "org_id_uuid" = o."id_uuid"
      FROM "organization" o
      WHERE ial."org_id" = o."id"
    `);

    // Drop all FKs referencing organization.id
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT tc.constraint_name, tc.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.key_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
          WHERE ccu.table_name = 'organization' AND tc.constraint_type = 'FOREIGN KEY'
        LOOP
          EXECUTE 'ALTER TABLE "' || r.table_name || '" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);

    // Swap organization PK
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'organization' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "organization" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
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

    // Finish org FK columns
    await queryRunner.query(
      `DROP VIEW IF EXISTS "org_shared_inventory_summary"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_identity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_org_game"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_org_inv_recent"`);
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" DROP COLUMN "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_inventory_item" RENAME COLUMN "org_id_uuid" TO "org_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "org_inventory_item"
        ALTER COLUMN "org_id" SET NOT NULL,
        ADD CONSTRAINT "org_inventory_item_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" DROP COLUMN "shared_org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_inventory_item" RENAME COLUMN "shared_org_id_uuid" TO "shared_org_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_inventory_item"
        ADD CONSTRAINT "user_inventory_item_shared_org_id_fkey" FOREIGN KEY ("shared_org_id") REFERENCES "organization"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inv_audit_org"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" DROP COLUMN "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" RENAME COLUMN "org_id_uuid" TO "org_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "inventory_audit_log"
        ADD CONSTRAINT "inventory_audit_log_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE SET NULL
    `);

    // ── 5. user_organization_role — swap all FK columns and PK ───────────────
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        DROP COLUMN "userId",
        DROP COLUMN "organizationId",
        DROP COLUMN "roleId"
    `);
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "user_id_uuid" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "org_id_uuid" TO "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" RENAME COLUMN "role_id_uuid" TO "roleId"`,
    );
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

    // Recreate UOR FK constraints + unique index
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

    // ── 7. audit_log — userId/entityId become text; PK → UUID ────────────────
    await queryRunner.query(`
      ALTER TABLE "audit_log"
        ADD COLUMN "legacy_id"      BIGINT,
        ADD COLUMN "id_uuid"        UUID,
        ADD COLUMN "user_id_text"   TEXT,
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
    // Drop the integer FK before dropping the column
    await queryRunner.query(`
      ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "audit_log_userId_fkey"
    `);
    await queryRunner.query(`ALTER TABLE "audit_log" DROP COLUMN "id"`);
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP COLUMN "userId", DROP COLUMN "entityId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "user_id_text" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_log" RENAME COLUMN "entity_id_text" TO "entityId"`,
    );

    // ── 8. inventory_audit_log — PK bigint → UUID ─────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "inventory_audit_log"
        ADD COLUMN "legacy_id" BIGINT,
        ADD COLUMN "id_uuid"   UUID
    `);
    await queryRunner.query(
      `UPDATE "inventory_audit_log" SET "legacy_id" = "id", "id_uuid" = uuid_generate_v7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" ALTER COLUMN "id_uuid" SET NOT NULL`,
    );
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT constraint_name FROM information_schema.table_constraints
          WHERE table_name = 'inventory_audit_log' AND constraint_type = 'PRIMARY KEY'
        LOOP
          EXECUTE 'ALTER TABLE "inventory_audit_log" DROP CONSTRAINT "' || r.constraint_name || '"';
        END LOOP;
      END$$
    `);
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" RENAME COLUMN "id_uuid" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" ADD CONSTRAINT "PK_inventory_audit_log" PRIMARY KEY ("id")`,
    );

    // ── 9. station_etl_warning — bigint PK → UUID ─────────────────────────────
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

    // ── 10. Recreate indexes ──────────────────────────────────────────────────
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_uor_userId_orgId"  ON "user_organization_role" ("userId", "organizationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_uor_orgId_roleId"  ON "user_organization_role" ("organizationId", "roleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_uor_userId_roleId" ON "user_organization_role" ("userId", "roleId")`,
    );
    // Recreate inventory_audit_log indexes on new UUID id and org_id
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_inv_audit_user" ON "inventory_audit_log" ("user_id", "date_created" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_inv_audit_org" ON "inventory_audit_log" ("org_id", "date_created" DESC)`,
    );
    // Recreate org_inventory_item indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_inv_active" ON "org_inventory_item" ("org_id", "active") WHERE "deleted" = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_inv_identity" ON "org_inventory_item" ("org_id", "game_id", "uex_item_id", "unit_of_measure", COALESCE("location_type", ''), COALESCE("location_uex_id", -1)) WHERE "deleted" = false AND "active" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_inv_org_game" ON "org_inventory_item" ("org_id", "game_id", "deleted") WHERE "deleted" = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_org_inv_recent" ON "org_inventory_item" ("org_id", "date_modified" DESC) WHERE "deleted" = false
    `);
    // Recreate user_inventory_item indexes (shared_org_id sentinel updated to UUID sentinel)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_inv_identity" ON "user_inventory_item" ("user_id", "game_id", "uex_item_id", "unit_of_measure", COALESCE("location_type", ''), COALESCE("location_uex_id", -1), COALESCE("shared_org_id", 'ffffffff-ffff-4fff-bfff-ffffffffffff'::uuid)) WHERE "deleted" = false AND "active" = true
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_inv_item_agg" ON "user_inventory_item" ("user_id", "uex_item_id", "deleted") WHERE "deleted" = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_inv_list" ON "user_inventory_item" ("user_id", "game_id", "deleted", "active") WHERE "deleted" = false
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_inv_org_view" ON "user_inventory_item" ("shared_org_id", "uex_item_id") WHERE "deleted" = false AND "shared_org_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_inv_recent" ON "user_inventory_item" ("user_id", "date_modified" DESC) WHERE "deleted" = false
    `);
    // Recreate view (org_id is now UUID)
    await queryRunner.query(`
      CREATE VIEW "org_shared_inventory_summary" AS
      SELECT "org_id", "uex_item_id", "unit_of_measure",
        SUM("quantity") AS "total_quantity",
        COUNT(DISTINCT "id") AS "item_count",
        MIN("date_added") AS "earliest_entry",
        MAX("date_modified") AS "latest_update"
      FROM "org_inventory_item"
      WHERE "deleted" = false
      GROUP BY "org_id", "uex_item_id", "unit_of_measure"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore integer PKs from legacy_id columns. Order: children before parents.
    // NOTE: This is a best-effort rollback — data in new tables created after
    // migration will not be preserved.

    await queryRunner.query(
      `DROP VIEW IF EXISTS "org_shared_inventory_summary"`,
    );

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

    // inventory_audit_log PK
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" DROP CONSTRAINT IF EXISTS "PK_inventory_audit_log"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" ADD COLUMN "old_id" BIGSERIAL`,
    );
    await queryRunner.query(
      `UPDATE "inventory_audit_log" SET "old_id" = "legacy_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" DROP COLUMN "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" RENAME COLUMN "old_id" TO "id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" ADD CONSTRAINT "PK_inventory_audit_log_legacy" PRIMARY KEY ("id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_audit_log" DROP COLUMN IF EXISTS "legacy_id"`,
    );

    // audit_log
    await queryRunner.query(
      `ALTER TABLE "audit_log" DROP CONSTRAINT IF EXISTS "PK_audit_log"`,
    );
    await queryRunner.query(`
      ALTER TABLE "audit_log"
        ADD COLUMN "old_id"        BIGSERIAL,
        ADD COLUMN "user_id_int"   INTEGER,
        ADD COLUMN "entity_id_int" INTEGER
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
    await queryRunner.query(`
      ALTER TABLE "password_reset"
        ADD COLUMN "old_id"      BIGSERIAL,
        ADD COLUMN "user_id_int" INTEGER DEFAULT 0
    `);
    await queryRunner.query(
      `UPDATE "password_reset" SET "old_id" = "legacy_id"`,
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
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_uor_user_org_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_uor_userId_orgId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_uor_orgId_roleId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_uor_userId_roleId"`);
    await queryRunner.query(
      `ALTER TABLE "user_organization_role" DROP CONSTRAINT IF EXISTS "PK_uor"`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_organization_role"
        ADD COLUMN "old_id"      BIGSERIAL,
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

    // Restore system user seed data
    await queryRunner.query(`
      UPDATE "user"
      SET "username" = 'system'
      WHERE "username" = 'station-system' AND "isSystemUser" = TRUE
    `);

    // Recreate view with integer org_id
    await queryRunner.query(`
      CREATE VIEW "org_shared_inventory_summary" AS
      SELECT "org_id", "uex_item_id", "unit_of_measure",
        SUM("quantity") AS "total_quantity",
        COUNT(DISTINCT "id") AS "item_count",
        MIN("date_added") AS "earliest_entry",
        MAX("date_modified") AS "latest_update"
      FROM "org_inventory_item"
      WHERE "deleted" = false
      GROUP BY "org_id", "uex_item_id", "unit_of_measure"
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
