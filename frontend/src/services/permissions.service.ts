import { api } from './api.service';

export const OrgPermission = {
  CAN_VIEW_ORG_INVENTORY: 'can_view_org_inventory',
  CAN_EDIT_ORG_INVENTORY: 'can_edit_org_inventory',
  CAN_ADMIN_ORG_INVENTORY: 'can_admin_org_inventory',
  CAN_VIEW_MEMBER_SHARED_ITEMS: 'can_view_member_shared_items',
} as const;

export type OrgPermission = (typeof OrgPermission)[keyof typeof OrgPermission];

export const permissionsService = {
  async getUserPermissions(
    userId: number,
    organizationId: number,
  ): Promise<OrgPermission[]> {
    const response = await api.get(
      `/permissions/user/${userId}/organization/${organizationId}`,
    );
    const permissions = response.data?.permissions;
    return Array.isArray(permissions) ? permissions : [];
  },
};
