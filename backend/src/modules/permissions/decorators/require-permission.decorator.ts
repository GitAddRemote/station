import { SetMetadata } from '@nestjs/common';
import { OrgPermission } from '../permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to require specific permissions for a route
 *
 * @example
 * @RequirePermission(OrgPermission.CAN_EDIT_ORG_INVENTORY)
 * async updateInventory() { ... }
 *
 * @example Multiple permissions (user must have ALL)
 * @RequirePermission(
 *   OrgPermission.CAN_EDIT_ORG_INVENTORY,
 *   OrgPermission.CAN_ADMIN_ORG_INVENTORY
 * )
 * async bulkUpdate() { ... }
 */
export const RequirePermission = (...permissions: OrgPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
