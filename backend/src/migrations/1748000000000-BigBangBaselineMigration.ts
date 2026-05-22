import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BigBang baseline migration — establishes the complete Station schema from scratch.
 *
 * This single migration replaces all 27 prior incremental migrations.
 * It creates every table, index, view, enum type, and seed row required
 * to run the application on a fresh PostgreSQL database.
 *
 * Excluded tables (intentionally omitted):
 *   - locations  — deprecated; removed in companion issue #186
 *   - refresh_token — refresh tokens moved to Redis; DB table dropped
 *
 * Inventory tables reflect the FINAL schema from issue #201:
 *   - unit_of_measure ENUM column added
 *   - quantity changed to DECIMAL(12,6)
 *   - quality SMALLINT NULL with CHECK (quality >= 0)
 *   - location_type VARCHAR(30) + location_uex_id INTEGER (nullable)
 *   - location_id FK removed entirely
 *
 * org_shared_inventory_summary is created as a regular VIEW (not materialized)
 * grouping by (org_id, uex_item_id, unit_of_measure).
 */
export class BigBangBaselineMigration1748000000000
  implements MigrationInterface
{
  // ─────────────────────────────────────────────────────────────────────────────
  // UP — create everything in FK dependency order (parents before children)
  // ─────────────────────────────────────────────────────────────────────────────
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // =========================================================================
    // CORE APPLICATION TABLES
    // =========================================================================

    // -- user ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id"            SERIAL        PRIMARY KEY,
        "username"      VARCHAR(255)  NOT NULL UNIQUE,
        "password"      VARCHAR(255)  NOT NULL,
        "email"         VARCHAR(255)  NOT NULL UNIQUE,
        "firstName"     VARCHAR(255),
        "lastName"      VARCHAR(255),
        "phoneNumber"   VARCHAR(50),
        "bio"           TEXT,
        "isActive"      BOOLEAN       NOT NULL DEFAULT TRUE,
        "isSystemUser"  BOOLEAN       NOT NULL DEFAULT FALSE,
        "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_email"         ON "user" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_username"      ON "user" ("username")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_isSystemUser"  ON "user" ("isSystemUser") WHERE "isSystemUser" = TRUE`,
    );

    // -- organization ----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "organization" (
        "id"          SERIAL        PRIMARY KEY,
        "name"        VARCHAR(255)  NOT NULL,
        "slug"        VARCHAR(255),
        "description" VARCHAR(500),
        "game_id"     INTEGER       NOT NULL,
        "isActive"    BOOLEAN       NOT NULL DEFAULT TRUE,
        "createdAt"   TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `);

    // -- game ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "game" (
        "id"          SERIAL        PRIMARY KEY,
        "name"        VARCHAR(100)  NOT NULL,
        "code"        VARCHAR(20)   NOT NULL UNIQUE,
        "description" TEXT,
        "active"      BOOLEAN       NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_game_code"   ON "game" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_game_active" ON "game" ("active")`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization" ADD CONSTRAINT "FK_organization_game" FOREIGN KEY ("game_id") REFERENCES "game"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organization_game_id" ON "organization" ("game_id")`,
    );

    // -- role ------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "role" (
        "id"          SERIAL        PRIMARY KEY,
        "name"        VARCHAR(255)  NOT NULL UNIQUE,
        "permissions" JSONB,
        "description" VARCHAR(500),
        "createdAt"   TIMESTAMP     NOT NULL DEFAULT NOW(),
        "updatedAt"   TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_role_name" ON "role" ("name")`);

    // -- user_organization_role (junction) ------------------------------------
    await queryRunner.query(`
      CREATE TABLE "user_organization_role" (
        "id"             SERIAL    PRIMARY KEY,
        "userId"         INTEGER   NOT NULL REFERENCES "user"("id")         ON DELETE CASCADE,
        "organizationId" INTEGER   NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "roleId"         INTEGER   NOT NULL REFERENCES "role"("id")         ON DELETE RESTRICT,
        "assignedAt"     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_organization_role_unique"
      ON "user_organization_role" ("userId", "organizationId", "roleId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_organization_role_userId_organizationId"
      ON "user_organization_role" ("userId", "organizationId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_organization_role_organizationId_roleId"
      ON "user_organization_role" ("organizationId", "roleId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_user_organization_role_userId_roleId"
      ON "user_organization_role" ("userId", "roleId")
    `);

    // -- audit_log ------------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
        'ROLE_ASSIGNED', 'ROLE_REMOVED', 'PERMISSION_CHANGED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "audit_entity_type_enum" AS ENUM (
        'USER', 'ORGANIZATION', 'ROLE', 'USER_ORGANIZATION_ROLE', 'AUTH'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_log" (
        "id"          BIGSERIAL                 PRIMARY KEY,
        "userId"      INTEGER                   REFERENCES "user"("id") ON DELETE SET NULL,
        "username"    VARCHAR(255),
        "action"      "audit_action_enum"       NOT NULL,
        "entityType"  "audit_entity_type_enum"  NOT NULL,
        "entityId"    INTEGER,
        "metadata"    JSONB,
        "oldValues"   JSONB,
        "newValues"   JSONB,
        "ipAddress"   VARCHAR(255),
        "userAgent"   VARCHAR(500),
        "createdAt"   TIMESTAMPTZ               NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_userId"              ON "audit_log" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_entityType_entityId" ON "audit_log" ("entityType", "entityId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_action"              ON "audit_log" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_log_createdAt"           ON "audit_log" ("createdAt" DESC)`,
    );

    // -- password_reset -------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "password_reset" (
        "id"        SERIAL       PRIMARY KEY,
        "userId"    INTEGER      NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "token"     VARCHAR(255) NOT NULL UNIQUE,
        "expiresAt" TIMESTAMPTZ  NOT NULL,
        "used"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_userId"    ON "password_reset" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_expiresAt" ON "password_reset" ("expiresAt")`,
    );

    // -- oauth_client ---------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "oauth_client" (
        "id"               UUID         NOT NULL DEFAULT uuid_generate_v4(),
        "clientId"         VARCHAR      NOT NULL,
        "clientSecretHash" VARCHAR      NOT NULL,
        "scopes"           TEXT         NOT NULL,
        "isActive"         BOOLEAN      NOT NULL DEFAULT TRUE,
        "createdAt"        TIMESTAMP    NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_oauth_client"          PRIMARY KEY ("id"),
        CONSTRAINT "UQ_oauth_client_clientId" UNIQUE ("clientId")
      )
    `);

    // =========================================================================
    // UEX MIRROR TABLES (raw API data, preserved as-is)
    // =========================================================================

    // -- uex_category ---------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_category" (
        "id"               BIGSERIAL    PRIMARY KEY,
        "uex_id"           INTEGER      NOT NULL UNIQUE,
        "type"             VARCHAR(50),
        "section"          VARCHAR(100),
        "name"             VARCHAR(255) NOT NULL,
        "is_game_related"  BOOLEAN      DEFAULT FALSE,
        "is_mining"        BOOLEAN      DEFAULT FALSE,
        "active"           BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_added"   TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"         INTEGER      REFERENCES "user"("id"),
        "modified_by"      INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_category_active" ON "uex_category" ("uex_id") WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_category_type"   ON "uex_category" ("type")   WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_category_sync"   ON "uex_category" ("uex_date_modified") WHERE "deleted" = FALSE`,
    );

    // -- uex_company ----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_company" (
        "id"               BIGSERIAL    PRIMARY KEY,
        "uex_id"           INTEGER      NOT NULL UNIQUE,
        "name"             VARCHAR(255) NOT NULL,
        "code"             VARCHAR(50),
        "active"           BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_added"   TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"         INTEGER      REFERENCES "user"("id"),
        "modified_by"      INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_company_active" ON "uex_company" ("uex_id") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_company_code"   ON "uex_company" ("code")   WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_company_sync"   ON "uex_company" ("uex_date_modified") WHERE "deleted" = FALSE`,
    );

    // -- uex_item -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_item" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "star_citizen_uuid" VARCHAR(255),
        "id_category"       INTEGER      REFERENCES "uex_category"("uex_id"),
        "id_company"        INTEGER      REFERENCES "uex_company"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "section"           VARCHAR(100),
        "category"          VARCHAR(100),
        "company_name"      VARCHAR(255),
        "size"              VARCHAR(50),
        "weight_scu"        DECIMAL(10,2),
        "is_commodity"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_buyable"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_sellable"       BOOLEAN      NOT NULL DEFAULT FALSE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_active"    ON "uex_item" ("uex_id")            WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_category"  ON "uex_item" ("id_category")       WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_company"   ON "uex_item" ("id_company")        WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_sc_uuid"   ON "uex_item" ("star_citizen_uuid") WHERE "deleted" = FALSE AND "star_citizen_uuid" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_search"    ON "uex_item" ("name")              WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_sync"      ON "uex_item" ("uex_date_modified") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_items_commodity" ON "uex_item" ("is_commodity")      WHERE "deleted" = FALSE AND "is_commodity" = TRUE`,
    );

    // -- uex_star_system ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_star_system" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50)  NOT NULL,
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_star_systems_active" ON "uex_star_system" ("uex_id") WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_star_systems_code"   ON "uex_star_system" ("code")   WHERE "deleted" = FALSE`,
    );

    // -- uex_planet -----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_planet" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "star_system_id"    INTEGER      REFERENCES "uex_star_system"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50),
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "is_landable"       BOOLEAN      NOT NULL DEFAULT FALSE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_planets_active" ON "uex_planet" ("uex_id")         WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_planets_system" ON "uex_planet" ("star_system_id") WHERE "deleted" = FALSE`,
    );

    // -- uex_moon -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_moon" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "planet_id"         INTEGER      REFERENCES "uex_planet"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50),
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "is_landable"       BOOLEAN      NOT NULL DEFAULT FALSE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_moons_active" ON "uex_moon" ("uex_id")   WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_moons_planet" ON "uex_moon" ("planet_id") WHERE "deleted" = FALSE`,
    );

    // -- uex_city -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_city" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "planet_id"         INTEGER      REFERENCES "uex_planet"("uex_id"),
        "moon_id"           INTEGER      REFERENCES "uex_moon"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50),
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id"),
        CONSTRAINT "CHK_uex_city_location" CHECK (
          ("planet_id" IS NOT NULL AND "moon_id" IS NULL) OR
          ("planet_id" IS NULL AND "moon_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_cities_active" ON "uex_city" ("uex_id")   WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_cities_planet" ON "uex_city" ("planet_id") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_cities_moon"   ON "uex_city" ("moon_id")   WHERE "deleted" = FALSE`,
    );

    // -- uex_space_station ----------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_space_station" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "star_system_id"    INTEGER      REFERENCES "uex_star_system"("uex_id"),
        "planet_id"         INTEGER      REFERENCES "uex_planet"("uex_id"),
        "moon_id"           INTEGER      REFERENCES "uex_moon"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50),
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_space_stations_active" ON "uex_space_station" ("uex_id")         WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_space_stations_system" ON "uex_space_station" ("star_system_id") WHERE "deleted" = FALSE`,
    );

    // -- uex_outpost ----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_outpost" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "planet_id"         INTEGER      REFERENCES "uex_planet"("uex_id"),
        "moon_id"           INTEGER      REFERENCES "uex_moon"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50),
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_outposts_active" ON "uex_outpost" ("uex_id")   WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_outposts_planet" ON "uex_outpost" ("planet_id") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_outposts_moon"   ON "uex_outpost" ("moon_id")   WHERE "deleted" = FALSE`,
    );

    // -- uex_poi --------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_poi" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "star_system_id"    INTEGER      REFERENCES "uex_star_system"("uex_id"),
        "planet_id"         INTEGER      REFERENCES "uex_planet"("uex_id"),
        "moon_id"           INTEGER      REFERENCES "uex_moon"("uex_id"),
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50),
        "type"              VARCHAR(100),
        "is_available"      BOOLEAN      NOT NULL DEFAULT TRUE,
        "active"            BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"          INTEGER      REFERENCES "user"("id"),
        "modified_by"       INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_poi_active" ON "uex_poi" ("uex_id") WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_poi_system" ON "uex_poi" ("star_system_id") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_poi_type" ON "uex_poi" ("type") WHERE "deleted" = FALSE`,
    );

    // -- uex_commodity --------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "uex_commodity" (
        "id"               BIGSERIAL    PRIMARY KEY,
        "uex_id"           INTEGER      NOT NULL UNIQUE,
        "id_category"      INTEGER      REFERENCES "uex_category"("uex_id"),
        "name"             VARCHAR(255) NOT NULL,
        "code"             VARCHAR(50),
        "kind"             VARCHAR(50),
        "section"          VARCHAR(100),
        "is_raw"           BOOLEAN      DEFAULT FALSE,
        "is_harvestable"   BOOLEAN      DEFAULT FALSE,
        "is_buyable"       BOOLEAN      DEFAULT FALSE,
        "is_sellable"      BOOLEAN      DEFAULT FALSE,
        "is_illegal"       BOOLEAN      DEFAULT FALSE,
        "is_fuel"          BOOLEAN      DEFAULT FALSE,
        "price_buy"        DECIMAL(14,2),
        "price_sell"       DECIMAL(14,2),
        "scu"              DECIMAL(10,2),
        "mass"             DECIMAL(10,2),
        "star_citizen_uuid" VARCHAR(255),
        "active"           BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "uex_date_added"   TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "added_by"         INTEGER      REFERENCES "user"("id"),
        "modified_by"      INTEGER      REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_uex_commodity_active"   ON "uex_commodity" ("uex_id")     WHERE "deleted" = FALSE AND "active" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_commodity_category" ON "uex_commodity" ("id_category") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_commodity_buyable"  ON "uex_commodity" ("is_buyable")  WHERE "deleted" = FALSE AND "is_buyable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_commodity_sellable" ON "uex_commodity" ("is_sellable") WHERE "deleted" = FALSE AND "is_sellable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_commodity_sync"     ON "uex_commodity" ("uex_date_modified") WHERE "deleted" = FALSE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_uex_commodity_name"     ON "uex_commodity" ("name")        WHERE "deleted" = FALSE`,
    );

    // =========================================================================
    // UEX SYNC STATE TABLES
    // =========================================================================

    await queryRunner.query(
      `CREATE TYPE sync_status_enum AS ENUM ('idle', 'in_progress', 'success', 'failed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "uex_sync_state" (
        "endpoint_name"           VARCHAR(100) PRIMARY KEY,
        "last_successful_sync_at" TIMESTAMPTZ,
        "last_full_sync_at"       TIMESTAMPTZ,
        "sync_status"             sync_status_enum NOT NULL DEFAULT 'idle',
        "sync_started_at"         TIMESTAMPTZ,
        "records_created_count"   INTEGER  DEFAULT 0,
        "records_updated_count"   INTEGER  DEFAULT 0,
        "records_deleted_count"   INTEGER  DEFAULT 0,
        "error_message"           TEXT,
        "error_stack"             TEXT,
        "sync_duration_ms"        INTEGER,
        "date_added"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "date_modified"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_uex_sync_state_status"
      ON "uex_sync_state" ("sync_status", "last_successful_sync_at")
    `);

    await queryRunner.query(`
      CREATE TABLE "uex_sync_config" (
        "endpoint_name"             VARCHAR(100) PRIMARY KEY REFERENCES "uex_sync_state"("endpoint_name"),
        "enabled"                   BOOLEAN      NOT NULL DEFAULT TRUE,
        "delta_sync_enabled"        BOOLEAN      NOT NULL DEFAULT TRUE,
        "full_sync_interval_days"   INTEGER      NOT NULL DEFAULT 7,
        "sync_schedule_cron"        VARCHAR(100),
        "rate_limit_calls_per_hour" INTEGER      DEFAULT 100,
        "timeout_seconds"           INTEGER      DEFAULT 300,
        "retry_attempts"            INTEGER      DEFAULT 3,
        "retry_backoff_multiplier"  DECIMAL(3,2) DEFAULT 2.0,
        "date_added"                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // Seed default sync state entries
    await queryRunner.query(`
      INSERT INTO "uex_sync_state" ("endpoint_name", "sync_status") VALUES
        ('categories',    'idle'),
        ('items',         'idle'),
        ('companies',     'idle'),
        ('commodities',   'idle')
    `);

    await queryRunner.query(`
      INSERT INTO "uex_sync_config" ("endpoint_name", "sync_schedule_cron", "rate_limit_calls_per_hour") VALUES
        ('categories',    '0 2 * * *', 50),
        ('items',         '0 3 * * *', 200),
        ('companies',     '0 2 * * *', 50),
        ('commodities',   '30 3 * * *', 50)
    `);

    // =========================================================================
    // INVENTORY TABLES (final schema with unit_of_measure, quality, etc.)
    // =========================================================================

    await queryRunner.query(
      `CREATE TYPE "unit_of_measure_enum" AS ENUM ('unit', 'scu', 'uscu')`,
    );

    // -- user_inventory_item --------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "user_inventory_item" (
        "id"              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
        "user_id"         INTEGER      NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "game_id"         INTEGER      NOT NULL REFERENCES "game"("id"),
        "uex_item_id"     INTEGER      NOT NULL REFERENCES "uex_item"("uex_id"),
        "quantity"        DECIMAL(12,6) NOT NULL CHECK ("quantity" > 0),
        "unit_of_measure" unit_of_measure_enum NOT NULL DEFAULT 'unit',
        "quality"         SMALLINT     NULL CONSTRAINT "chk_user_inv_quality" CHECK ("quality" >= 0),
        "location_type"   VARCHAR(30),
        "location_uex_id" INTEGER,
        "notes"           TEXT,
        "shared_org_id"   INTEGER      REFERENCES "organization"("id") ON DELETE SET NULL,
        "active"          BOOLEAN      NOT NULL DEFAULT TRUE,
        "deleted"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "date_added"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "date_modified"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "added_by"        INTEGER      NOT NULL REFERENCES "user"("id"),
        "modified_by"     INTEGER      NOT NULL REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_list"
      ON "user_inventory_item" ("user_id", "game_id", "deleted", "active")
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_org_view"
      ON "user_inventory_item" ("shared_org_id", "uex_item_id")
      WHERE "deleted" = FALSE AND "shared_org_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_item_agg"
      ON "user_inventory_item" ("user_id", "uex_item_id", "deleted")
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_user_inv_recent"
      ON "user_inventory_item" ("user_id", "date_modified" DESC)
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_user_inv_composite"
      ON "user_inventory_item" (
        "user_id", "game_id", "uex_item_id", "unit_of_measure",
        COALESCE("location_type", ''), COALESCE("location_uex_id", -1),
        COALESCE("shared_org_id", -1)
      )
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    // -- inventory_audit_log --------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "inventory_audit_log" (
        "id"                 BIGSERIAL    PRIMARY KEY,
        "event_type"         VARCHAR(100) NOT NULL,
        "user_id"            INTEGER      REFERENCES "user"("id") ON DELETE SET NULL,
        "org_id"             INTEGER      REFERENCES "organization"("id") ON DELETE SET NULL,
        "inventory_item_id"  UUID         REFERENCES "user_inventory_item"("id") ON DELETE SET NULL,
        "records_affected"   INTEGER,
        "reason"             TEXT,
        "metadata"           JSONB,
        "date_created"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_inv_audit_user" ON "inventory_audit_log" ("user_id", "date_created" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inv_audit_org"  ON "inventory_audit_log" ("org_id",  "date_created" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_inv_audit_type" ON "inventory_audit_log" ("event_type", "date_created" DESC)`,
    );
    await queryRunner.query(`
      CREATE INDEX "idx_inv_audit_item"
      ON "inventory_audit_log" ("inventory_item_id", "date_created" DESC)
      WHERE "inventory_item_id" IS NOT NULL
    `);

    // -- org_inventory_item ---------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "org_inventory_item" (
        "id"              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        "org_id"          INTEGER       NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
        "game_id"         INTEGER       NOT NULL REFERENCES "game"("id"),
        "uex_item_id"     INTEGER       NOT NULL REFERENCES "uex_item"("uex_id"),
        "quantity"        DECIMAL(12,6) NOT NULL CHECK ("quantity" > 0),
        "unit_of_measure" unit_of_measure_enum NOT NULL DEFAULT 'unit',
        "quality"         SMALLINT      NULL CONSTRAINT "chk_org_inv_quality" CHECK ("quality" >= 0),
        "location_type"   VARCHAR(30),
        "location_uex_id" INTEGER,
        "notes"           TEXT,
        "active"          BOOLEAN       NOT NULL DEFAULT TRUE,
        "deleted"         BOOLEAN       NOT NULL DEFAULT FALSE,
        "date_added"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "date_modified"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "added_by"        INTEGER       NOT NULL REFERENCES "user"("id"),
        "modified_by"     INTEGER       NOT NULL REFERENCES "user"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_org_game"
      ON "org_inventory_item" ("org_id", "game_id", "deleted")
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_item"
      ON "org_inventory_item" ("uex_item_id")
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_recent"
      ON "org_inventory_item" ("org_id", "date_modified" DESC)
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_org_inv_active"
      ON "org_inventory_item" ("org_id", "active")
      WHERE "deleted" = FALSE
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_org_inv_composite"
      ON "org_inventory_item" (
        "org_id", "game_id", "uex_item_id", "unit_of_measure",
        COALESCE("location_type", ''), COALESCE("location_uex_id", -1)
      )
      WHERE "deleted" = FALSE AND "active" = TRUE
    `);

    // -- org_shared_inventory_summary (regular VIEW) --------------------------
    await queryRunner.query(`
      CREATE VIEW "org_shared_inventory_summary" AS
      SELECT
        "org_id",
        "uex_item_id",
        "unit_of_measure",
        SUM("quantity")        AS "total_quantity",
        COUNT(DISTINCT "id")   AS "item_count",
        MIN("date_added")      AS "earliest_entry",
        MAX("date_modified")   AS "latest_update"
      FROM "org_inventory_item"
      WHERE "deleted" = FALSE
      GROUP BY "org_id", "uex_item_id", "unit_of_measure"
    `);

    // =========================================================================
    // NORMALIZED station_* TABLES (from schema doc)
    // =========================================================================

    // -- station_faction ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_faction" (
        "id"                BIGSERIAL   PRIMARY KEY,
        "uex_id"            INTEGER     NOT NULL UNIQUE,
        "name"              VARCHAR(120) NOT NULL,
        "wiki"              VARCHAR(500),
        "is_piracy"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_bounty_hunting" BOOLEAN     NOT NULL DEFAULT FALSE,
        "uex_date_added"    TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "synced_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_factions_uex_id"    ON "station_faction" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_factions_is_piracy"  ON "station_faction" ("is_piracy")        WHERE "is_piracy" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_factions_is_bounty"  ON "station_faction" ("is_bounty_hunting") WHERE "is_bounty_hunting" = TRUE`,
    );

    // -- station_faction_friendly ---------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_faction_friendly" (
        "faction_uex_id"          INTEGER NOT NULL REFERENCES "station_faction" ("uex_id") ON DELETE CASCADE,
        "friendly_faction_uex_id" INTEGER NOT NULL REFERENCES "station_faction" ("uex_id") ON DELETE CASCADE,
        PRIMARY KEY ("faction_uex_id", "friendly_faction_uex_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ff_faction"  ON "station_faction_friendly" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ff_friendly" ON "station_faction_friendly" ("friendly_faction_uex_id")`,
    );

    // -- station_faction_hostile ----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_faction_hostile" (
        "faction_uex_id"         INTEGER NOT NULL REFERENCES "station_faction" ("uex_id") ON DELETE CASCADE,
        "hostile_faction_uex_id" INTEGER NOT NULL REFERENCES "station_faction" ("uex_id") ON DELETE CASCADE,
        PRIMARY KEY ("faction_uex_id", "hostile_faction_uex_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_fh_faction"  ON "station_faction_hostile" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fh_hostile"  ON "station_faction_hostile" ("hostile_faction_uex_id")`,
    );

    // -- station_jurisdiction -------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_jurisdiction" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "faction_uex_id"    INTEGER      REFERENCES "station_faction" ("uex_id") ON DELETE SET NULL,
        "name"              VARCHAR(120) NOT NULL,
        "nickname"          VARCHAR(40),
        "is_available"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_available_live" BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_visible"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_default"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "wiki"              VARCHAR(500),
        "uex_date_added"    TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "synced_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_jurisdictions_uex_id"       ON "station_jurisdiction" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jurisdictions_faction"       ON "station_jurisdiction" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jurisdictions_is_available"  ON "station_jurisdiction" ("is_available") WHERE "is_available" = TRUE`,
    );

    // -- station_star_system --------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_star_system" (
        "id"                  BIGSERIAL    PRIMARY KEY,
        "uex_id"              INTEGER      NOT NULL UNIQUE,
        "faction_uex_id"      INTEGER      REFERENCES "station_faction"       ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id" INTEGER      REFERENCES "station_jurisdiction"  ("uex_id") ON DELETE SET NULL,
        "name"                VARCHAR(120) NOT NULL,
        "code"                VARCHAR(20),
        "is_available"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_available_live"   BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_visible"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_default"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "wiki"                VARCHAR(500),
        "uex_date_added"      TIMESTAMPTZ,
        "uex_date_modified"   TIMESTAMPTZ,
        "synced_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_star_systems_uex_id"        ON "station_star_system" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_star_systems_faction"        ON "station_star_system" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_star_systems_jurisdiction"   ON "station_star_system" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_star_systems_code"           ON "station_star_system" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_star_systems_is_available"   ON "station_star_system" ("is_available") WHERE "is_available" = TRUE`,
    );

    // -- station_faction_star_system (junction) -------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_faction_star_system" (
        "faction_uex_id"     INTEGER NOT NULL REFERENCES "station_faction"     ("uex_id") ON DELETE CASCADE,
        "star_system_uex_id" INTEGER NOT NULL REFERENCES "station_star_system" ("uex_id") ON DELETE CASCADE,
        PRIMARY KEY ("faction_uex_id", "star_system_uex_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_fss_faction"      ON "station_faction_star_system" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_fss_star_system"  ON "station_faction_star_system" ("star_system_uex_id")`,
    );

    // -- station_orbit --------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_orbit" (
        "id"                  BIGSERIAL    PRIMARY KEY,
        "uex_id"              INTEGER      NOT NULL UNIQUE,
        "star_system_uex_id"  INTEGER      REFERENCES "station_star_system"  ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"      INTEGER      REFERENCES "station_faction"       ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id" INTEGER      REFERENCES "station_jurisdiction"  ("uex_id") ON DELETE SET NULL,
        "name"                VARCHAR(120) NOT NULL,
        "name_origin"         VARCHAR(120),
        "code"                VARCHAR(10),
        "is_available"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_available_live"   BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_visible"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_default"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_lagrange"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_man_made"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_asteroid"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_planet"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_star"             BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_jump_point"       BOOLEAN      NOT NULL DEFAULT FALSE,
        "uex_date_added"      TIMESTAMPTZ,
        "uex_date_modified"   TIMESTAMPTZ,
        "synced_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_uex_id"        ON "station_orbit" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_star_system"    ON "station_orbit" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_faction"        ON "station_orbit" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_jurisdiction"   ON "station_orbit" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_is_lagrange"    ON "station_orbit" ("is_lagrange")    WHERE "is_lagrange" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_is_jump_point"  ON "station_orbit" ("is_jump_point")  WHERE "is_jump_point" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbits_is_planet"      ON "station_orbit" ("is_planet")      WHERE "is_planet" = TRUE`,
    );

    // -- station_orbit_distance -----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_orbit_distance" (
        "id"                        BIGSERIAL       PRIMARY KEY,
        "uex_id"                    INTEGER         NOT NULL UNIQUE,
        "star_system_origin_uex_id" INTEGER         REFERENCES "station_star_system" ("uex_id") ON DELETE SET NULL,
        "star_system_dest_uex_id"   INTEGER         REFERENCES "station_star_system" ("uex_id") ON DELETE SET NULL,
        "orbit_origin_uex_id"       INTEGER         NOT NULL REFERENCES "station_orbit" ("uex_id") ON DELETE CASCADE,
        "orbit_dest_uex_id"         INTEGER         NOT NULL REFERENCES "station_orbit" ("uex_id") ON DELETE CASCADE,
        "distance_gm"               DECIMAL(12, 4)  NOT NULL,
        "game_version"              VARCHAR(20),
        "uex_date_added"            TIMESTAMPTZ,
        "uex_date_modified"         TIMESTAMPTZ,
        "synced_at"                 TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
        CONSTRAINT "uq_orbit_distance_pair" UNIQUE ("orbit_origin_uex_id", "orbit_dest_uex_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_orbit_dist_origin"     ON "station_orbit_distance" ("orbit_origin_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbit_dist_dest"        ON "station_orbit_distance" ("orbit_dest_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_orbit_dist_sys_origin"  ON "station_orbit_distance" ("star_system_origin_uex_id")`,
    );

    // -- station_planet -------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_planet" (
        "id"                  BIGSERIAL    PRIMARY KEY,
        "uex_id"              INTEGER      NOT NULL UNIQUE,
        "star_system_uex_id"  INTEGER      NOT NULL REFERENCES "station_star_system" ("uex_id") ON DELETE CASCADE,
        "orbit_uex_id"        INTEGER      REFERENCES "station_orbit"       ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"      INTEGER      REFERENCES "station_faction"      ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id" INTEGER      REFERENCES "station_jurisdiction" ("uex_id") ON DELETE SET NULL,
        "name"                VARCHAR(120) NOT NULL,
        "name_origin"         VARCHAR(120),
        "code"                VARCHAR(20),
        "is_available"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_available_live"   BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_visible"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_default"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_lagrange"         BOOLEAN      NOT NULL DEFAULT FALSE,
        "uex_date_added"      TIMESTAMPTZ,
        "uex_date_modified"   TIMESTAMPTZ,
        "synced_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_planets_uex_id"       ON "station_planet" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_planets_star_system"   ON "station_planet" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_planets_orbit"         ON "station_planet" ("orbit_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_planets_faction"       ON "station_planet" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_planets_jurisdiction"  ON "station_planet" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_planets_is_available"  ON "station_planet" ("is_available") WHERE "is_available" = TRUE`,
    );

    // -- station_moon ---------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_moon" (
        "id"                  BIGSERIAL    PRIMARY KEY,
        "uex_id"              INTEGER      NOT NULL UNIQUE,
        "star_system_uex_id"  INTEGER      NOT NULL REFERENCES "station_star_system" ("uex_id") ON DELETE CASCADE,
        "planet_uex_id"       INTEGER      NOT NULL REFERENCES "station_planet"      ("uex_id") ON DELETE CASCADE,
        "orbit_uex_id"        INTEGER      REFERENCES "station_orbit"       ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"      INTEGER      REFERENCES "station_faction"      ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id" INTEGER      REFERENCES "station_jurisdiction" ("uex_id") ON DELETE SET NULL,
        "name"                VARCHAR(120) NOT NULL,
        "name_origin"         VARCHAR(120),
        "code"                VARCHAR(20),
        "is_available"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_available_live"   BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_visible"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_default"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "uex_date_added"      TIMESTAMPTZ,
        "uex_date_modified"   TIMESTAMPTZ,
        "synced_at"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_moons_uex_id"       ON "station_moon" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_moons_star_system"   ON "station_moon" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_moons_planet"        ON "station_moon" ("planet_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_moons_orbit"         ON "station_moon" ("orbit_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_moons_faction"       ON "station_moon" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_moons_jurisdiction"  ON "station_moon" ("jurisdiction_uex_id")`,
    );

    // -- station_city ---------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_city" (
        "id"                   BIGSERIAL   PRIMARY KEY,
        "uex_id"               INTEGER     NOT NULL UNIQUE,
        "star_system_uex_id"   INTEGER     REFERENCES "station_star_system" ("uex_id") ON DELETE SET NULL,
        "planet_uex_id"        INTEGER     REFERENCES "station_planet"      ("uex_id") ON DELETE SET NULL,
        "orbit_uex_id"         INTEGER     REFERENCES "station_orbit"       ("uex_id") ON DELETE SET NULL,
        "moon_uex_id"          INTEGER     REFERENCES "station_moon"        ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"       INTEGER     REFERENCES "station_faction"      ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id"  INTEGER     REFERENCES "station_jurisdiction" ("uex_id") ON DELETE SET NULL,
        "name"                 VARCHAR(120) NOT NULL,
        "code"                 VARCHAR(20),
        "is_available"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_available_live"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_visible"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_default"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_monitored"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_armistice"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_landable"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_decommissioned"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_quantum_marker"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_trade_terminal"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_habitation"       BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refinery"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_cargo_center"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_clinic"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_food"             BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_shops"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refuel"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_repair"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_gravity"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_loading_dock"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_docking_port"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_freight_elevator" BOOLEAN     NOT NULL DEFAULT FALSE,
        "pad_types"            TEXT[],
        "wiki"                 VARCHAR(500),
        "uex_date_added"       TIMESTAMPTZ,
        "uex_date_modified"    TIMESTAMPTZ,
        "synced_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_cities_uex_id"        ON "station_city" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_star_system"    ON "station_city" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_planet"         ON "station_city" ("planet_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_orbit"          ON "station_city" ("orbit_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_moon"           ON "station_city" ("moon_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_faction"        ON "station_city" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_jurisdiction"   ON "station_city" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_is_available"   ON "station_city" ("is_available") WHERE "is_available" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_is_landable"    ON "station_city" ("is_landable")   WHERE "is_landable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_has_trade"      ON "station_city" ("has_trade_terminal") WHERE "has_trade_terminal" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cities_pad_types"      ON "station_city" USING GIN ("pad_types")`,
    );

    // -- station_space_station ------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_space_station" (
        "id"                   BIGSERIAL   PRIMARY KEY,
        "uex_id"               INTEGER     NOT NULL UNIQUE,
        "star_system_uex_id"   INTEGER     REFERENCES "station_star_system" ("uex_id") ON DELETE SET NULL,
        "planet_uex_id"        INTEGER     REFERENCES "station_planet"      ("uex_id") ON DELETE SET NULL,
        "orbit_uex_id"         INTEGER     REFERENCES "station_orbit"       ("uex_id") ON DELETE SET NULL,
        "moon_uex_id"          INTEGER     REFERENCES "station_moon"        ("uex_id") ON DELETE SET NULL,
        "city_uex_id"          INTEGER     REFERENCES "station_city"        ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"       INTEGER     REFERENCES "station_faction"      ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id"  INTEGER     REFERENCES "station_jurisdiction" ("uex_id") ON DELETE SET NULL,
        "name"                 VARCHAR(120) NOT NULL,
        "nickname"             VARCHAR(80),
        "is_available"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_available_live"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_visible"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_default"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_monitored"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_armistice"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_landable"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_decommissioned"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_lagrange"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_jump_point"        BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_quantum_marker"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_trade_terminal"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_habitation"       BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refinery"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_cargo_center"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_clinic"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_food"             BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_shops"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refuel"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_repair"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_gravity"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_loading_dock"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_docking_port"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_freight_elevator" BOOLEAN     NOT NULL DEFAULT FALSE,
        "pad_types"            TEXT[],
        "uex_date_added"       TIMESTAMPTZ,
        "uex_date_modified"    TIMESTAMPTZ,
        "synced_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_uex_id"        ON "station_space_station" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_star_system"    ON "station_space_station" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_planet"         ON "station_space_station" ("planet_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_orbit"          ON "station_space_station" ("orbit_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_moon"           ON "station_space_station" ("moon_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_city"           ON "station_space_station" ("city_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_faction"        ON "station_space_station" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_jurisdiction"   ON "station_space_station" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_is_available"   ON "station_space_station" ("is_available") WHERE "is_available" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_is_landable"    ON "station_space_station" ("is_landable")   WHERE "is_landable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_is_lagrange"    ON "station_space_station" ("is_lagrange")   WHERE "is_lagrange" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_has_trade"      ON "station_space_station" ("has_trade_terminal") WHERE "has_trade_terminal" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_space_stations_pad_types"      ON "station_space_station" USING GIN ("pad_types")`,
    );

    // -- station_outpost ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_outpost" (
        "id"                   BIGSERIAL   PRIMARY KEY,
        "uex_id"               INTEGER     NOT NULL UNIQUE,
        "star_system_uex_id"   INTEGER     REFERENCES "station_star_system" ("uex_id") ON DELETE SET NULL,
        "planet_uex_id"        INTEGER     REFERENCES "station_planet"      ("uex_id") ON DELETE SET NULL,
        "orbit_uex_id"         INTEGER     REFERENCES "station_orbit"       ("uex_id") ON DELETE SET NULL,
        "moon_uex_id"          INTEGER     REFERENCES "station_moon"        ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"       INTEGER     REFERENCES "station_faction"      ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id"  INTEGER     REFERENCES "station_jurisdiction" ("uex_id") ON DELETE SET NULL,
        "name"                 VARCHAR(120) NOT NULL,
        "nickname"             VARCHAR(80),
        "is_available"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_available_live"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_visible"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_default"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_monitored"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_armistice"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_landable"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_decommissioned"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_quantum_marker"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_trade_terminal"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_habitation"       BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refinery"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_cargo_center"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_clinic"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_food"             BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_shops"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refuel"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_repair"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_gravity"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_loading_dock"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_docking_port"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_freight_elevator" BOOLEAN     NOT NULL DEFAULT FALSE,
        "pad_types"            TEXT[],
        "uex_date_added"       TIMESTAMPTZ,
        "uex_date_modified"    TIMESTAMPTZ,
        "synced_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_uex_id"       ON "station_outpost" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_star_system"   ON "station_outpost" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_planet"        ON "station_outpost" ("planet_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_orbit"         ON "station_outpost" ("orbit_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_moon"          ON "station_outpost" ("moon_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_faction"       ON "station_outpost" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_jurisdiction"  ON "station_outpost" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_is_available"  ON "station_outpost" ("is_available") WHERE "is_available" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_is_landable"   ON "station_outpost" ("is_landable")   WHERE "is_landable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_has_trade"     ON "station_outpost" ("has_trade_terminal") WHERE "has_trade_terminal" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_outposts_pad_types"     ON "station_outpost" USING GIN ("pad_types")`,
    );

    // -- station_poi ----------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_poi" (
        "id"                   BIGSERIAL   PRIMARY KEY,
        "uex_id"               INTEGER     NOT NULL UNIQUE,
        "star_system_uex_id"   INTEGER     REFERENCES "station_star_system"   ("uex_id") ON DELETE SET NULL,
        "planet_uex_id"        INTEGER     REFERENCES "station_planet"         ("uex_id") ON DELETE SET NULL,
        "orbit_uex_id"         INTEGER     REFERENCES "station_orbit"          ("uex_id") ON DELETE SET NULL,
        "moon_uex_id"          INTEGER     REFERENCES "station_moon"           ("uex_id") ON DELETE SET NULL,
        "space_station_uex_id" INTEGER     REFERENCES "station_space_station"  ("uex_id") ON DELETE SET NULL,
        "city_uex_id"          INTEGER     REFERENCES "station_city"           ("uex_id") ON DELETE SET NULL,
        "outpost_uex_id"       INTEGER     REFERENCES "station_outpost"        ("uex_id") ON DELETE SET NULL,
        "faction_uex_id"       INTEGER     REFERENCES "station_faction"         ("uex_id") ON DELETE SET NULL,
        "jurisdiction_uex_id"  INTEGER     REFERENCES "station_jurisdiction"    ("uex_id") ON DELETE SET NULL,
        "name"                 VARCHAR(120) NOT NULL,
        "nickname"             VARCHAR(80),
        "is_available"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_available_live"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_visible"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_default"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_monitored"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_armistice"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_landable"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_decommissioned"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_quantum_marker"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_trade_terminal"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_habitation"       BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refinery"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_cargo_center"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_clinic"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_food"             BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_shops"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_refuel"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_repair"           BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_gravity"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_loading_dock"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_docking_port"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_freight_elevator" BOOLEAN     NOT NULL DEFAULT FALSE,
        "pad_types"            TEXT[],
        "uex_date_added"       TIMESTAMPTZ,
        "uex_date_modified"    TIMESTAMPTZ,
        "synced_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_pois_uex_id"        ON "station_poi" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_star_system"    ON "station_poi" ("star_system_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_planet"         ON "station_poi" ("planet_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_orbit"          ON "station_poi" ("orbit_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_moon"           ON "station_poi" ("moon_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_space_station"  ON "station_poi" ("space_station_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_city"           ON "station_poi" ("city_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_outpost"        ON "station_poi" ("outpost_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_faction"        ON "station_poi" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_jurisdiction"   ON "station_poi" ("jurisdiction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_is_landable"    ON "station_poi" ("is_landable")        WHERE "is_landable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_has_trade"      ON "station_poi" ("has_trade_terminal") WHERE "has_trade_terminal" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_pois_pad_types"      ON "station_poi" USING GIN ("pad_types")`,
    );

    // -- station_category -----------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_category" (
        "id"                BIGSERIAL   PRIMARY KEY,
        "uex_id"            INTEGER,
        "parent_id"         BIGINT      REFERENCES "station_category" ("id") ON DELETE SET NULL,
        "type"              VARCHAR(20) CHECK ("type" IN ('item', 'service', 'contract')),
        "section"           VARCHAR(80),
        "name"              VARCHAR(120) NOT NULL,
        "is_section"        BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_game_related"   BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_mining"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "uex_date_added"    TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "synced_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categories_uex_id"       ON "station_category" ("uex_id") WHERE "uex_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_categories_section_type" ON "station_category" ("type", "name") WHERE "is_section" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_categories_parent"             ON "station_category" ("parent_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_categories_type"               ON "station_category" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_categories_section"            ON "station_category" ("section")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_categories_is_mining"          ON "station_category" ("is_mining") WHERE "is_mining" = TRUE`,
    );

    // -- station_category_attribute -------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_category_attribute" (
        "id"                BIGSERIAL   PRIMARY KEY,
        "uex_id"            INTEGER     NOT NULL UNIQUE,
        "category_uex_id"   INTEGER     NOT NULL,
        "name"              VARCHAR(120) NOT NULL,
        "description"       TEXT,
        "is_lower_better"   BOOLEAN,
        "uex_date_added"    TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "synced_at"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_cat_attrs_uex_id"   ON "station_category_attribute" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_cat_attrs_category"  ON "station_category_attribute" ("category_uex_id")`,
    );

    // -- station_company ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_company" (
        "id"                      BIGSERIAL   PRIMARY KEY,
        "uex_id"                  INTEGER     NOT NULL UNIQUE,
        "faction_uex_id"          INTEGER     REFERENCES "station_faction" ("uex_id") ON DELETE SET NULL,
        "name"                    VARCHAR(120) NOT NULL,
        "nickname"                VARCHAR(40),
        "wiki"                    VARCHAR(500),
        "industry"                VARCHAR(120),
        "is_item_manufacturer"    BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_vehicle_manufacturer" BOOLEAN     NOT NULL DEFAULT FALSE,
        "uex_date_added"          TIMESTAMPTZ,
        "uex_date_modified"       TIMESTAMPTZ,
        "synced_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_companies_uex_id"         ON "station_company" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_companies_faction"         ON "station_company" ("faction_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_companies_is_item_mfr"    ON "station_company" ("is_item_manufacturer")    WHERE "is_item_manufacturer" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_companies_is_vehicle_mfr" ON "station_company" ("is_vehicle_manufacturer") WHERE "is_vehicle_manufacturer" = TRUE`,
    );

    // -- station_vehicle ------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_vehicle" (
        "id"                BIGSERIAL      PRIMARY KEY,
        "uex_id"            INTEGER        NOT NULL UNIQUE,
        "company_uex_id"    INTEGER        REFERENCES "station_company" ("uex_id") ON DELETE SET NULL,
        "parent_uex_id"     INTEGER        REFERENCES "station_vehicle" ("uex_id") ON DELETE SET NULL,
        "name"              VARCHAR(120)   NOT NULL,
        "name_full"         VARCHAR(200),
        "slug"              VARCHAR(200),
        "uuid"              VARCHAR(64),
        "scu"               DECIMAL(10, 2),
        "crew_raw"          VARCHAR(40),
        "crew_min"          SMALLINT,
        "crew_max"          SMALLINT,
        "mass"              DECIMAL(14, 2),
        "width"             DECIMAL(10, 2),
        "height"            DECIMAL(10, 2),
        "length"            DECIMAL(10, 2),
        "fuel_quantum"      DECIMAL(10, 2),
        "fuel_hydrogen"     DECIMAL(10, 2),
        "container_sizes"   INTEGER[],
        "pad_type"          VARCHAR(5)     CHECK ("pad_type" IN ('XS', 'S', 'M', 'L', 'XL')),
        "is_addon"                BOOLEAN NOT NULL DEFAULT FALSE,
        "is_boarding"             BOOLEAN NOT NULL DEFAULT FALSE,
        "is_bomber"               BOOLEAN NOT NULL DEFAULT FALSE,
        "is_cargo"                BOOLEAN NOT NULL DEFAULT FALSE,
        "is_carrier"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_civilian"             BOOLEAN NOT NULL DEFAULT FALSE,
        "is_concept"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_construction"         BOOLEAN NOT NULL DEFAULT FALSE,
        "is_datarunner"           BOOLEAN NOT NULL DEFAULT FALSE,
        "is_docking"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_emp"                  BOOLEAN NOT NULL DEFAULT FALSE,
        "is_exploration"          BOOLEAN NOT NULL DEFAULT FALSE,
        "is_ground_vehicle"       BOOLEAN NOT NULL DEFAULT FALSE,
        "is_hangar"               BOOLEAN NOT NULL DEFAULT FALSE,
        "is_industrial"           BOOLEAN NOT NULL DEFAULT FALSE,
        "is_interdiction"         BOOLEAN NOT NULL DEFAULT FALSE,
        "is_loading_dock"         BOOLEAN NOT NULL DEFAULT FALSE,
        "is_medical"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_military"             BOOLEAN NOT NULL DEFAULT FALSE,
        "is_mining"               BOOLEAN NOT NULL DEFAULT FALSE,
        "is_passenger"            BOOLEAN NOT NULL DEFAULT FALSE,
        "is_qed"                  BOOLEAN NOT NULL DEFAULT FALSE,
        "is_racing"               BOOLEAN NOT NULL DEFAULT FALSE,
        "is_refinery"             BOOLEAN NOT NULL DEFAULT FALSE,
        "is_refuel"               BOOLEAN NOT NULL DEFAULT FALSE,
        "is_repair"               BOOLEAN NOT NULL DEFAULT FALSE,
        "is_research"             BOOLEAN NOT NULL DEFAULT FALSE,
        "is_salvage"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_scanning"             BOOLEAN NOT NULL DEFAULT FALSE,
        "is_science"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_showdown_winner"      BOOLEAN NOT NULL DEFAULT FALSE,
        "is_spaceship"            BOOLEAN NOT NULL DEFAULT FALSE,
        "is_starter"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_stealth"              BOOLEAN NOT NULL DEFAULT FALSE,
        "is_tractor_beam"         BOOLEAN NOT NULL DEFAULT FALSE,
        "is_quantum_capable"      BOOLEAN NOT NULL DEFAULT FALSE,
        "url_photo"         VARCHAR(500),
        "url_store"         VARCHAR(500),
        "url_brochure"      VARCHAR(500),
        "url_hotsite"       VARCHAR(500),
        "url_video"         VARCHAR(500),
        "game_version"      VARCHAR(20),
        "uex_date_added"    TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "synced_at"         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_uex_id"          ON "station_vehicle" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_company"          ON "station_vehicle" ("company_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_parent"           ON "station_vehicle" ("parent_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_uuid"             ON "station_vehicle" ("uuid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_is_spaceship"     ON "station_vehicle" ("is_spaceship")     WHERE "is_spaceship" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_is_ground"        ON "station_vehicle" ("is_ground_vehicle") WHERE "is_ground_vehicle" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_is_cargo"         ON "station_vehicle" ("is_cargo")          WHERE "is_cargo" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_is_mining"        ON "station_vehicle" ("is_mining")         WHERE "is_mining" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_is_concept"       ON "station_vehicle" ("is_concept")        WHERE "is_concept" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_is_quantum"       ON "station_vehicle" ("is_quantum_capable") WHERE "is_quantum_capable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_container_sizes"  ON "station_vehicle" USING GIN ("container_sizes")`,
    );

    // -- station_vehicle_loaner -----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_vehicle_loaner" (
        "vehicle_uex_id" INTEGER NOT NULL REFERENCES "station_vehicle" ("uex_id") ON DELETE CASCADE,
        "loaner_uex_id"  INTEGER NOT NULL REFERENCES "station_vehicle" ("uex_id") ON DELETE CASCADE,
        PRIMARY KEY ("vehicle_uex_id", "loaner_uex_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_vl_vehicle" ON "station_vehicle_loaner" ("vehicle_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vl_loaner"  ON "station_vehicle_loaner" ("loaner_uex_id")`,
    );

    // -- station_item ---------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_item" (
        "id"                      BIGSERIAL   PRIMARY KEY,
        "uex_id"                  INTEGER     NOT NULL UNIQUE,
        "parent_uex_id"           INTEGER     REFERENCES "station_item"    ("uex_id") ON DELETE SET NULL,
        "category_uex_id"         INTEGER,
        "company_uex_id"          INTEGER     REFERENCES "station_company" ("uex_id") ON DELETE SET NULL,
        "vehicle_uex_id"          INTEGER     REFERENCES "station_vehicle" ("uex_id") ON DELETE SET NULL,
        "name"                    VARCHAR(200) NOT NULL,
        "slug"                    VARCHAR(200),
        "uuid"                    VARCHAR(64),
        "size"                    VARCHAR(10),
        "color"                   VARCHAR(20),
        "color2"                  VARCHAR(20),
        "quality"                 SMALLINT,
        "url_store"               VARCHAR(500),
        "is_exclusive_pledge"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_exclusive_subscriber" BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_exclusive_concierge"  BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_commodity"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_harvestable"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "screenshot"              VARCHAR(500),
        "notification"            JSONB,
        "attributes_summary"      JSONB,
        "game_version"            VARCHAR(20),
        "uex_date_added"          TIMESTAMPTZ,
        "uex_date_modified"       TIMESTAMPTZ,
        "synced_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_items_uex_id"             ON "station_item" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_parent"             ON "station_item" ("parent_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_category"           ON "station_item" ("category_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_company"            ON "station_item" ("company_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_vehicle"            ON "station_item" ("vehicle_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_uuid"               ON "station_item" ("uuid")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_slug"               ON "station_item" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_name_fts"           ON "station_item" USING GIN (to_tsvector('english', "name"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_is_commodity"       ON "station_item" ("is_commodity")   WHERE "is_commodity" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_is_harvestable"     ON "station_item" ("is_harvestable") WHERE "is_harvestable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_items_attributes_summary" ON "station_item" USING GIN ("attributes_summary")`,
    );

    // -- station_item_attribute -----------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_item_attribute" (
        "id"                        BIGSERIAL   PRIMARY KEY,
        "uex_id"                    INTEGER     NOT NULL UNIQUE,
        "item_uex_id"               INTEGER     NOT NULL REFERENCES "station_item"               ("uex_id") ON DELETE CASCADE,
        "category_uex_id"           INTEGER,
        "category_attribute_uex_id" INTEGER     NOT NULL REFERENCES "station_category_attribute" ("uex_id") ON DELETE CASCADE,
        "value"                     VARCHAR(200),
        "unit"                      VARCHAR(40),
        "uex_date_added"            TIMESTAMPTZ,
        "uex_date_modified"         TIMESTAMPTZ,
        "synced_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_item_attrs_uex_id"       ON "station_item_attribute" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_item_attrs_item"          ON "station_item_attribute" ("item_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_item_attrs_category"      ON "station_item_attribute" ("category_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_item_attrs_cat_attr"      ON "station_item_attribute" ("category_attribute_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_item_attrs_item_catattr"  ON "station_item_attribute" ("item_uex_id", "category_attribute_uex_id")`,
    );

    // -- station_commodity ----------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_commodity" (
        "id"                BIGSERIAL    PRIMARY KEY,
        "uex_id"            INTEGER      NOT NULL UNIQUE,
        "parent_uex_id"     INTEGER      REFERENCES "station_commodity" ("uex_id") ON DELETE SET NULL,
        "name"              VARCHAR(120) NOT NULL,
        "code"              VARCHAR(20)  NOT NULL,
        "slug"              VARCHAR(120),
        "kind"              VARCHAR(60),
        "weight_scu"        SMALLINT,
        "price_buy"         DECIMAL(12, 4),
        "price_sell"        DECIMAL(12, 4),
        "is_available"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_available_live" BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_visible"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_extractable"    BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_mineral"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_raw"            BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_pure"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_refined"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_refinable"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_harvestable"    BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_buyable"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_sellable"       BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_temporary"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_illegal"        BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_volatile_qt"    BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_volatile_time"  BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_inert"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_explosive"      BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_buggy"          BOOLEAN      NOT NULL DEFAULT FALSE,
        "is_fuel"           BOOLEAN      NOT NULL DEFAULT FALSE,
        "wiki"              VARCHAR(500),
        "uex_date_added"    TIMESTAMPTZ,
        "uex_date_modified" TIMESTAMPTZ,
        "synced_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_uex_id"      ON "station_commodity" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_parent"       ON "station_commodity" ("parent_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_code"         ON "station_commodity" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_slug"         ON "station_commodity" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_kind"         ON "station_commodity" ("kind")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_name_fts"     ON "station_commodity" USING GIN (to_tsvector('english', "name"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_is_illegal"   ON "station_commodity" ("is_illegal")   WHERE "is_illegal" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_is_buyable"   ON "station_commodity" ("is_buyable")   WHERE "is_buyable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_is_sellable"  ON "station_commodity" ("is_sellable")  WHERE "is_sellable" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_is_fuel"      ON "station_commodity" ("is_fuel")       WHERE "is_fuel" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_commodities_is_available" ON "station_commodity" ("is_available")  WHERE "is_available" = TRUE`,
    );

    // -- station_terminal -----------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_terminal" (
        "id"                       BIGSERIAL   PRIMARY KEY,
        "uex_id"                   INTEGER     NOT NULL,
        "star_system_id"           BIGINT      REFERENCES "station_star_system"  ("id") ON DELETE SET NULL,
        "planet_id"                BIGINT      REFERENCES "station_planet"        ("id") ON DELETE SET NULL,
        "orbit_id"                 BIGINT      REFERENCES "station_orbit"         ("id") ON DELETE SET NULL,
        "moon_id"                  BIGINT      REFERENCES "station_moon"          ("id") ON DELETE SET NULL,
        "space_station_id"         BIGINT      REFERENCES "station_space_station" ("id") ON DELETE SET NULL,
        "outpost_id"               BIGINT      REFERENCES "station_outpost"       ("id") ON DELETE SET NULL,
        "poi_id"                   BIGINT      REFERENCES "station_poi"           ("id") ON DELETE SET NULL,
        "city_id"                  BIGINT      REFERENCES "station_city"          ("id") ON DELETE SET NULL,
        "faction_id"               BIGINT      REFERENCES "station_faction"       ("id") ON DELETE SET NULL,
        "company_id"               BIGINT      REFERENCES "station_company"       ("id") ON DELETE SET NULL,
        "name"                     VARCHAR(255) NOT NULL,
        "fullname"                 VARCHAR(500),
        "nickname"                 VARCHAR(100),
        "displayname"              VARCHAR(255),
        "code"                     VARCHAR(50)  NOT NULL,
        "type"                     VARCHAR(30)  NOT NULL,
        "contact_url"              VARCHAR(500),
        "screenshot"               VARCHAR(500),
        "max_container_size"       INTEGER,
        "is_available"             BOOLEAN     NOT NULL DEFAULT TRUE,
        "is_available_live"        BOOLEAN     NOT NULL DEFAULT TRUE,
        "is_visible"               BOOLEAN     NOT NULL DEFAULT TRUE,
        "is_default_system"        BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_affinity_influenceable" BOOLEAN    NOT NULL DEFAULT FALSE,
        "is_habitation"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_refinery"              BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_cargo_center"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_medical"               BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_food"                  BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_shop_fps"              BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_shop_vehicle"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_refuel"                BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_repair"                BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_nqa"                   BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_jump_point"            BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_player_owned"          BOOLEAN     NOT NULL DEFAULT FALSE,
        "is_auto_load"             BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_loading_dock"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_docking_port"         BOOLEAN     NOT NULL DEFAULT FALSE,
        "has_freight_elevator"     BOOLEAN     NOT NULL DEFAULT FALSE,
        "game_version"             VARCHAR(20),
        "uex_date_added"           BIGINT,
        "uex_date_modified"        BIGINT,
        "synced_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "station_terminals_uex_id_key"  UNIQUE ("uex_id"),
        CONSTRAINT "station_terminals_code_key"    UNIQUE ("code"),
        CONSTRAINT "station_terminals_type_check"  CHECK ("type" IN (
          'commodity','item','commodity_raw','vehicle_buy',
          'vehicle_rent','fuel','refinery_audit'
        ))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_star_system"   ON "station_terminal" ("star_system_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_planet"        ON "station_terminal" ("planet_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_orbit"         ON "station_terminal" ("orbit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_moon"          ON "station_terminal" ("moon_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_space_station" ON "station_terminal" ("space_station_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_outpost"       ON "station_terminal" ("outpost_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_city"          ON "station_terminal" ("city_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_faction"       ON "station_terminal" ("faction_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_company"       ON "station_terminal" ("company_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_type"          ON "station_terminal" ("type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_live"          ON "station_terminal" ("is_available_live") WHERE "is_available_live" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_player_owned"  ON "station_terminal" ("is_player_owned")   WHERE "is_player_owned" = TRUE`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_trade"         ON "station_terminal" ("is_shop_fps", "is_shop_vehicle")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminals_name_trgm"     ON "station_terminal" USING GIN ("name" gin_trgm_ops)`,
    );

    // -- station_terminal_distance --------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_terminal_distance" (
        "id"                      BIGSERIAL   PRIMARY KEY,
        "terminal_origin_id"      BIGINT      NOT NULL REFERENCES "station_terminal" ("id") ON DELETE CASCADE,
        "terminal_destination_id" BIGINT      NOT NULL REFERENCES "station_terminal" ("id") ON DELETE CASCADE,
        "distance_gm"             NUMERIC(12,4) NOT NULL,
        "synced_at"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "station_terminal_distances_uq"       UNIQUE ("terminal_origin_id", "terminal_destination_id"),
        CONSTRAINT "station_terminal_distances_positive" CHECK  ("distance_gm" >= 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminal_distances_origin" ON "station_terminal_distance" ("terminal_origin_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_station_terminal_distances_dest"   ON "station_terminal_distance" ("terminal_destination_id")`,
    );

    // -- station_jump_point ---------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_jump_point" (
        "id"                        BIGSERIAL   PRIMARY KEY,
        "uex_id"                    INTEGER     NOT NULL UNIQUE,
        "star_system_origin_uex_id" INTEGER     NOT NULL REFERENCES "station_star_system" ("uex_id") ON DELETE CASCADE,
        "star_system_dest_uex_id"   INTEGER     NOT NULL REFERENCES "station_star_system" ("uex_id") ON DELETE CASCADE,
        "orbit_origin_uex_id"       INTEGER     REFERENCES "station_orbit" ("uex_id") ON DELETE SET NULL,
        "orbit_dest_uex_id"         INTEGER     REFERENCES "station_orbit" ("uex_id") ON DELETE SET NULL,
        "is_synthetic"              BOOLEAN     NOT NULL DEFAULT FALSE,
        "source_uex_id"             INTEGER,
        "uex_date_added"            TIMESTAMPTZ,
        "uex_date_modified"         TIMESTAMPTZ,
        "synced_at"                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_jp_uex_id"       ON "station_jump_point" ("uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jp_sys_origin"   ON "station_jump_point" ("star_system_origin_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jp_sys_dest"     ON "station_jump_point" ("star_system_dest_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jp_orbit_origin" ON "station_jump_point" ("orbit_origin_uex_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jp_orbit_dest"   ON "station_jump_point" ("orbit_dest_uex_id")`,
    );
    await queryRunner.query(`
      CREATE INDEX "idx_station_jump_points_real"
      ON "station_jump_point" ("star_system_origin_uex_id", "star_system_dest_uex_id")
      WHERE "is_synthetic" = FALSE
    `);

    // -- station_etl_warning --------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE "station_etl_warning" (
        "id"          BIGSERIAL   PRIMARY KEY,
        "entity_type" VARCHAR(50) NOT NULL,
        "uex_id"      INTEGER,
        "field"       VARCHAR(100),
        "message"     TEXT        NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_etl_warnings_entity" ON "station_etl_warning" ("entity_type", "created_at" DESC)`,
    );

    // -- station_etl_run_state (ETL pipeline run tracking) -------------------
    await queryRunner.query(`
      CREATE TABLE "station_etl_run_state" (
        "id"           BIGSERIAL   PRIMARY KEY,
        "run_name"     VARCHAR(100) NOT NULL,
        "step_name"    VARCHAR(100) NOT NULL,
        "status"       VARCHAR(20)  NOT NULL DEFAULT 'pending',
        "started_at"   TIMESTAMPTZ,
        "finished_at"  TIMESTAMPTZ,
        "rows_upserted" INTEGER,
        "error_message" TEXT,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_station_etl_run_state_run_step" ON "station_etl_run_state" ("run_name", "step_name")`,
    );

    // =========================================================================
    // SEED DATA
    // =========================================================================

    // Seed system user (required for FK constraints in seeder flows)
    await queryRunner.query(`
      INSERT INTO "user" ("username", "password", "email", "isActive", "isSystemUser")
      VALUES ('system', '$2b$10$SYSTEM_USER_PLACEHOLDER_HASH_NOT_REAL', 'system@station.internal', TRUE, TRUE)
      ON CONFLICT DO NOTHING
    `);

    // Seed default roles matching DEFAULT_ROLE_PERMISSIONS in permissions.constants.ts
    await queryRunner.query(`
      INSERT INTO "role" ("name", "permissions", "description")
      VALUES
        ('Owner',            '{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}',  'Full inventory access. Can view, edit, and administer organization inventory, and view member shared items.'),
        ('Admin',            '{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}',  'Full inventory access. Can view, edit, and administer organization inventory, and view member shared items.'),
        ('Director',         '{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}',  'Full inventory access. Can view, edit, and administer organization inventory, and view member shared items.'),
        ('Inventory Manager','{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}',  'Full inventory access. Can view, edit, and administer organization inventory, and view member shared items.'),
        ('Member',           '{"can_view_org_inventory": true, "can_edit_org_inventory": false, "can_admin_org_inventory": false, "can_view_member_shared_items": true}', 'Standard member access. Can view organization inventory and member shared items.'),
        ('Viewer',           '{"can_view_org_inventory": true, "can_edit_org_inventory": false, "can_admin_org_inventory": false, "can_view_member_shared_items": false}','Read-only access. Can only view organization inventory.')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DOWN — drop everything in reverse FK order
  // ─────────────────────────────────────────────────────────────────────────────
  public async down(queryRunner: QueryRunner): Promise<void> {
    // station_* (deepest children first)
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_etl_run_state" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_etl_warning" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_jump_point" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_terminal_distance" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_terminal" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_commodity" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_item_attribute" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_item" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_vehicle_loaner" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_vehicle" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_company" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_category_attribute" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_category" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_poi" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_outpost" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_space_station" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_city" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_moon" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "station_planet" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_orbit_distance" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_orbit" CASCADE`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_faction_star_system" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_star_system" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_jurisdiction" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_faction_hostile" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "station_faction_friendly" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "station_faction" CASCADE`);

    // inventory
    await queryRunner.query(
      `DROP VIEW IF EXISTS "org_shared_inventory_summary" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "org_inventory_item" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "inventory_audit_log" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_inventory_item" CASCADE`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "unit_of_measure_enum"`);

    // uex sync
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_sync_config" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_sync_state" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "sync_status_enum"`);

    // uex mirror (deepest children first)
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_commodity" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_poi" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_outpost" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_space_station" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_city" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_moon" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_planet" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_star_system" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_item" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_company" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "uex_category" CASCADE`);

    // core application
    await queryRunner.query(`DROP TABLE IF EXISTS "oauth_client" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_reset" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_log" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_entity_type_enum"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_organization_role" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "role" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "game" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "organization" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user" CASCADE`);
  }
}
