import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgGuildMappingAndStationBotPermissions1780160000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    // Create the org-to-guild mapping table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "station_org_guild_mapping" (
        "id"                          UUID NOT NULL DEFAULT uuid_generate_v7(),
        "organization_id"             UUID NOT NULL,
        "discord_guild_id"            VARCHAR NOT NULL,
        "discord_guild_name_snapshot" VARCHAR,
        "is_active"                   BOOLEAN NOT NULL DEFAULT TRUE,
        "last_validated_at"           TIMESTAMPTZ,
        "created_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_station_org_guild_mapping" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_station_org_guild_mapping_discord_guild_id"
          UNIQUE ("discord_guild_id"),
        CONSTRAINT "FK_station_org_guild_mapping_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organization" ("id")
          ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_station_org_guild_mapping_organization_id"
        ON "station_org_guild_mapping" ("organization_id")
    `);

    // Backfill Station-Bot permissions onto Owner, Admin, and Director roles.
    // Owner gets all six permissions including guild admin management.
    await queryRunner.query(`
      UPDATE "role"
      SET "permissions" = "permissions" || '{
        "can_view_station_bot_admin": true,
        "can_manage_station_bot_verification": true,
        "can_manage_station_bot_nominations": true,
        "can_manage_station_bot_manufacturing": true,
        "can_manage_station_bot_automation": true,
        "can_manage_station_bot_guild_admins": true
      }'::jsonb
      WHERE "name" = 'Owner'
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET "permissions" = "permissions" || '{
        "can_view_station_bot_admin": true,
        "can_manage_station_bot_verification": true,
        "can_manage_station_bot_nominations": true,
        "can_manage_station_bot_manufacturing": true,
        "can_manage_station_bot_automation": true,
        "can_manage_station_bot_guild_admins": false
      }'::jsonb
      WHERE "name" = 'Admin'
    `);

    await queryRunner.query(`
      UPDATE "role"
      SET "permissions" = "permissions" || '{
        "can_view_station_bot_admin": true,
        "can_manage_station_bot_verification": false,
        "can_manage_station_bot_nominations": false,
        "can_manage_station_bot_manufacturing": false,
        "can_manage_station_bot_automation": false,
        "can_manage_station_bot_guild_admins": false
      }'::jsonb
      WHERE "name" = 'Director'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Remove Station-Bot permissions from roles
    const botPermKeys = [
      'can_view_station_bot_admin',
      'can_manage_station_bot_verification',
      'can_manage_station_bot_nominations',
      'can_manage_station_bot_manufacturing',
      'can_manage_station_bot_automation',
      'can_manage_station_bot_guild_admins',
    ];
    for (const key of botPermKeys) {
      await queryRunner.query(
        `UPDATE "role" SET "permissions" = "permissions" - '${key}'
         WHERE "name" IN ('Owner', 'Admin', 'Director')`,
      );
    }

    // Drop the guild mapping table
    await queryRunner.query(`DROP TABLE IF EXISTS "station_org_guild_mapping"`);
  }
}
