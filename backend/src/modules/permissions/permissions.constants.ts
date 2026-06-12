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
  CAN_MANAGE_INVENTORY = 'can_manage_inventory',

  // Contracts Permissions
  CAN_VIEW_ORG_CONTRACTS = 'can_view_org_contracts',
  CAN_MANAGE_CONTRACTS = 'can_manage_contracts',
  CAN_CLAIM_CONTRACT = 'can_claim_contract',

  // Station-Bot Administration Permissions (guild-scoped)
  CAN_VIEW_STATION_BOT_ADMIN = 'can_view_station_bot_admin',
  CAN_MANAGE_STATION_BOT_VERIFICATION = 'can_manage_station_bot_verification',
  CAN_MANAGE_STATION_BOT_NOMINATIONS = 'can_manage_station_bot_nominations',
  CAN_MANAGE_STATION_BOT_MANUFACTURING = 'can_manage_station_bot_manufacturing',
  CAN_MANAGE_STATION_BOT_AUTOMATION = 'can_manage_station_bot_automation',
  CAN_MANAGE_STATION_BOT_GUILD_ADMINS = 'can_manage_station_bot_guild_admins',
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
    [OrgPermission.CAN_MANAGE_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: true,
    [OrgPermission.CAN_MANAGE_CONTRACTS]: true,
    [OrgPermission.CAN_CLAIM_CONTRACT]: true,
    [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]: true,
  },
  Admin: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_MANAGE_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: true,
    [OrgPermission.CAN_MANAGE_CONTRACTS]: true,
    [OrgPermission.CAN_CLAIM_CONTRACT]: true,
    [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]: false,
  },
  Director: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_MANAGE_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: true,
    [OrgPermission.CAN_MANAGE_CONTRACTS]: true,
    [OrgPermission.CAN_CLAIM_CONTRACT]: true,
    [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]: true,
    [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]: false,
  },
  'Inventory Manager': {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
    [OrgPermission.CAN_MANAGE_INVENTORY]: true,
    [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: true,
    [OrgPermission.CAN_MANAGE_CONTRACTS]: false,
    [OrgPermission.CAN_CLAIM_CONTRACT]: true,
    [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]: false,
  },
  Member: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: false,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: false,
    [OrgPermission.CAN_MANAGE_INVENTORY]: false,
    [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: true,
    [OrgPermission.CAN_MANAGE_CONTRACTS]: false,
    [OrgPermission.CAN_CLAIM_CONTRACT]: true,
    [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]: false,
  },
  Viewer: {
    [OrgPermission.CAN_VIEW_ORG_INVENTORY]: false,
    [OrgPermission.CAN_EDIT_ORG_INVENTORY]: false,
    [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: false,
    [OrgPermission.CAN_MANAGE_INVENTORY]: false,
    [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: false,
    [OrgPermission.CAN_MANAGE_CONTRACTS]: false,
    [OrgPermission.CAN_CLAIM_CONTRACT]: false,
    [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]: false,
    [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]: false,
  },
} satisfies Record<string, Record<OrgPermission, boolean>>;

/**
 * Permission descriptions for documentation and UI
 */
export const PERMISSION_DESCRIPTIONS: Record<OrgPermission, string> = {
  [OrgPermission.CAN_VIEW_ORG_INVENTORY]:
    'View organization-owned inventory items',
  [OrgPermission.CAN_EDIT_ORG_INVENTORY]:
    'Create, update, and delete organization inventory items',
  [OrgPermission.CAN_ADMIN_ORG_INVENTORY]:
    'Manage inventory settings, perform bulk operations, and export data',
  [OrgPermission.CAN_MANAGE_INVENTORY]:
    'Perform all inventory management operations for the organization',
  [OrgPermission.CAN_VIEW_ORG_CONTRACTS]: 'View contracts for the organization',
  [OrgPermission.CAN_MANAGE_CONTRACTS]:
    'Create, update, publish, cancel, and dispute contracts',
  [OrgPermission.CAN_CLAIM_CONTRACT]:
    'Claim open contracts and mark them active or complete',
  [OrgPermission.CAN_VIEW_STATION_BOT_ADMIN]:
    'View the Station-Bot administration area for this guild',
  [OrgPermission.CAN_MANAGE_STATION_BOT_VERIFICATION]:
    'Manage Station-Bot verification settings for this guild',
  [OrgPermission.CAN_MANAGE_STATION_BOT_NOMINATIONS]:
    'Manage Station-Bot nomination digest settings for this guild',
  [OrgPermission.CAN_MANAGE_STATION_BOT_MANUFACTURING]:
    'Manage Station-Bot manufacturing settings for this guild',
  [OrgPermission.CAN_MANAGE_STATION_BOT_AUTOMATION]:
    'Manage Station-Bot automation settings for this guild',
  [OrgPermission.CAN_MANAGE_STATION_BOT_GUILD_ADMINS]:
    'Assign and remove guild admin access for this guild',
};
