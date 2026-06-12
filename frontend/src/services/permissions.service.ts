import { api } from './api.service';

export const OrgPermission = {
  CAN_VIEW_ORG_INVENTORY: 'can_view_org_inventory',
  CAN_EDIT_ORG_INVENTORY: 'can_edit_org_inventory',
  CAN_ADMIN_ORG_INVENTORY: 'can_admin_org_inventory',
  CAN_MANAGE_INVENTORY: 'can_manage_inventory',
  CAN_VIEW_STATION_BOT_ADMIN: 'can_view_station_bot_admin',
  CAN_MANAGE_STATION_BOT_VERIFICATION: 'can_manage_station_bot_verification',
  CAN_MANAGE_STATION_BOT_NOMINATIONS: 'can_manage_station_bot_nominations',
  CAN_MANAGE_STATION_BOT_MANUFACTURING: 'can_manage_station_bot_manufacturing',
  CAN_MANAGE_STATION_BOT_AUTOMATION: 'can_manage_station_bot_automation',
  CAN_MANAGE_STATION_BOT_GUILD_ADMINS: 'can_manage_station_bot_guild_admins',
} as const;

export type OrgPermission = (typeof OrgPermission)[keyof typeof OrgPermission];

export const permissionsService = {
  async getUserPermissions(
    userId: string,
    organizationId: string,
  ): Promise<OrgPermission[]> {
    const response = await api.get(
      `/permissions/user/${userId}/organization/${organizationId}`,
    );
    const permissions = response.data?.permissions;
    return Array.isArray(permissions) ? permissions : [];
  },
};
