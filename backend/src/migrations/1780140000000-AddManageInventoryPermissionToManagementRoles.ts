import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Backfills the can_manage_inventory permission onto the four management
 * roles (Owner, Admin, Director, Inventory Manager).
 *
 * The permission key was added to OrgPermission and DEFAULT_ROLE_PERMISSIONS
 * after the baseline seed was written, so existing role rows were missing it.
 * The inventory service checks can_manage_inventory to gate org inventory writes,
 * which caused all org owners/admins to receive 403 on POST /inventory.
 */
export class AddManageInventoryPermissionToManagementRoles_1780140000000
  implements MigrationInterface
{
  name = 'AddManageInventoryPermissionToManagementRoles_1780140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "role"
      SET "permissions" = "permissions" || '{"can_manage_inventory": true}'::jsonb
      WHERE "name" IN ('Owner', 'Admin', 'Director', 'Inventory Manager')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "role"
      SET "permissions" = "permissions" - 'can_manage_inventory'
      WHERE "name" IN ('Owner', 'Admin', 'Director', 'Inventory Manager')
    `);
  }
}
