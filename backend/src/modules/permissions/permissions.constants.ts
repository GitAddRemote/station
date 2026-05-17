/**
 * Organization Permission Constants
 *
 * Defines all available permissions that can be assigned to roles.
 * Permissions are stored in the role.permissions JSONB column as { [permission]: boolean }
 */

export enum OrgPermission {
  // Inventory Permissions
  CAN_VIEW_ORG_INVENTORY = 'can_view_org_inventory',
  CAN_EDIT_ORG_INVENTORY = 'can_edit_org_inventory',
  CAN_ADMIN_ORG_INVENTORY = 'can_admin_org_inventory',
  CAN_VIEW_MEMBER_SHARED_ITEMS = 'can_view_member_shared_items',

  // Future permissions can be added here
  // CAN_MANAGE_MEMBERS = 'can_manage_members',
  // CAN_MANAGE_ROLES = 'can_manage_roles',
  // CAN_VIEW_AUDIT_LOG = 'can_view_audit_log',
}

/**
 * Default role permission mappings
 *
 * Declared without an explicit wide type so `keyof typeof DEFAULT_ROLE_PERMISSIONS`
 * resolves to the literal union of role name strings rather than `string`.
 * The `satisfies` clause still enforces that every value is a complete
 * `Record<OrgPermission, boolean>`, giving both narrowing and type-safety.
 */
export const DEFAULT_ROLE_PERMISSIONS = {
  Owner: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
  },
  Admin: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
  },
  Director: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
  },
  'Inventory Manager': {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
  },
  Member: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: false,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: false,
    [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
  },
  Viewer: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: false,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: false,
    [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: false,
  },
} satisfies Record<string, Record<OrgPermission, boolean>>;

/**
 * Permission descriptions for documentation and UI
 */
export const PERMISSION_DESCRIPTIONS: Record<OrgPermission, string> = {
  [OrgPermission.CAN_VIEW_ORG_INVENTORY]:
    'View organization-owned inventory and member-shared items',
  [OrgPermission.CAN_EDIT_ORG_INVENTORY]:
    'Create, update, and delete organization inventory items',
  [OrgPermission.CAN_ADMIN_ORG_INVENTORY]:
    'Manage inventory settings, perform bulk operations, and export data',
  [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]:
    'View items that members have shared with the organization',
};
