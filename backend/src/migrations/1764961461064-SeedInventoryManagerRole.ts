import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds Inventory Manager role with inventory permissions
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates the "Inventory Manager" role with all inventory-related
 * permissions, and updates existing Member, Director, and Admin roles with
 * appropriate inventory permissions.
 *
 * Estimated duration: < 5 seconds
 * Rollback safe: Yes - removes role and reverts permission updates
 */
export class SeedInventoryManagerRole1764961461064
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert Inventory Manager role
    await queryRunner.query(`
      INSERT INTO "role" ("name", "permissions", "description", "createdAt", "updatedAt")
      VALUES (
        'Inventory Manager',
        '{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}'::jsonb,
        'Manages organization inventory with full permissions for viewing, editing, and administering items',
        NOW(),
        NOW()
      )
      ON CONFLICT ("name") DO UPDATE
      SET
        "permissions" = EXCLUDED."permissions",
        "description" = EXCLUDED."description",
        "updatedAt" = NOW()
    `);

    // Update Member role with basic inventory permissions
    await queryRunner.query(`
      UPDATE "role"
      SET
        "permissions" = COALESCE("permissions", '{}'::jsonb) ||
                        '{"can_view_org_inventory": true, "can_view_member_shared_items": true}'::jsonb,
        "updatedAt" = NOW()
      WHERE "name" = 'Member'
    `);

    // Update Director role with full inventory permissions
    await queryRunner.query(`
      UPDATE "role"
      SET
        "permissions" = COALESCE("permissions", '{}'::jsonb) ||
                        '{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}'::jsonb,
        "updatedAt" = NOW()
      WHERE "name" = 'Director'
    `);

    // Update Admin role with full inventory permissions
    await queryRunner.query(`
      UPDATE "role"
      SET
        "permissions" = COALESCE("permissions", '{}'::jsonb) ||
                        '{"can_view_org_inventory": true, "can_edit_org_inventory": true, "can_admin_org_inventory": true, "can_view_member_shared_items": true}'::jsonb,
        "updatedAt" = NOW()
      WHERE "name" = 'Admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove inventory permissions from existing roles
    await queryRunner.query(`
      UPDATE "role"
      SET
        "permissions" = "permissions" - 'can_view_org_inventory' - 'can_edit_org_inventory' - 'can_admin_org_inventory' - 'can_view_member_shared_items',
        "updatedAt" = NOW()
      WHERE "name" IN ('Member', 'Director', 'Admin')
    `);

    // Delete Inventory Manager role
    await queryRunner.query(`
      DELETE FROM "role"
      WHERE "name" = 'Inventory Manager'
    `);
  }
}
