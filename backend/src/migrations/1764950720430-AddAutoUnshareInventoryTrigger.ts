import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds automatic unsharing trigger for inventory when users leave organizations
 *
 * IMPORTANT: Before running this migration:
 * 1. Create a backup using: pnpm db:backup
 * 2. Review the pre-migration checklist in docs/database/migrations.md
 * 3. Test the migration in a development environment
 * 4. Verify the down() method can successfully rollback changes
 *
 * Description: Creates a database trigger that automatically unshares inventory
 * items when a user is removed from an organization. This ensures data consistency
 * and prevents orphaned sharing relationships. All auto-unshare events are logged
 * to the audit trail.
 *
 * Estimated duration: < 10 seconds
 * Rollback safe: Yes - drops trigger and function (no data loss)
 */
export class AddAutoUnshareInventoryTrigger1764950720430
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function for auto-unsharing inventory on membership removal
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION unshare_inventory_on_membership_removal()
      RETURNS TRIGGER AS $$
      DECLARE
        system_user_id BIGINT;
        unshared_count INTEGER;
      BEGIN
        -- Get system user ID for audit trail attribution
        SELECT id INTO system_user_id
        FROM "user"
        WHERE is_system_user = TRUE
        LIMIT 1;

        -- Handle case where system user doesn't exist (shouldn't happen)
        IF system_user_id IS NULL THEN
          -- Fall back to the user being removed
          system_user_id := OLD."userId";
        END IF;

        -- Update all inventory items shared with this org by this user
        WITH updated AS (
          UPDATE "user_inventory_items"
          SET
            "shared_org_id" = NULL,
            "modified_by" = system_user_id,
            "date_modified" = NOW()
          WHERE "user_id" = OLD."userId"
            AND "shared_org_id" = OLD."organizationId"
            AND "deleted" = FALSE
          RETURNING id
        )
        SELECT COUNT(*) INTO unshared_count FROM updated;

        -- Log the auto-unshare event if any items were affected
        IF unshared_count > 0 THEN
          INSERT INTO "inventory_audit_log" (
            "event_type",
            "user_id",
            "org_id",
            "records_affected",
            "reason",
            "date_created"
          ) VALUES (
            'AUTO_UNSHARE_MEMBERSHIP_REMOVAL',
            OLD."userId",
            OLD."organizationId",
            unshared_count,
            'User removed from organization',
            NOW()
          );
        END IF;

        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for DELETE on user_organization_role
    await queryRunner.query(`
      CREATE TRIGGER trigger_unshare_on_membership_delete
        AFTER DELETE ON "user_organization_role"
        FOR EACH ROW
        EXECUTE FUNCTION unshare_inventory_on_membership_removal();
    `);

    // Note: We're not adding an UPDATE trigger because user_organization_role
    // doesn't have an 'active' column in the current schema. If one is added later,
    // a trigger should be added for UPDATE OF active WHERE OLD.active = TRUE AND NEW.active = FALSE
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_unshare_on_membership_delete ON "user_organization_role"`,
    );

    // Drop function
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS unshare_inventory_on_membership_removal()`,
    );
  }
}
