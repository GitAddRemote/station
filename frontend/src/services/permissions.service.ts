import axios from 'axios';
import { API_URL } from '../config/api';

export const OrgPermission = {
  CAN_VIEW_ORG_INVENTORY: 'can_view_org_inventory',
  CAN_EDIT_ORG_INVENTORY: 'can_edit_org_inventory',
  CAN_ADMIN_ORG_INVENTORY: 'can_admin_org_inventory',
  CAN_VIEW_MEMBER_SHARED_ITEMS: 'can_view_member_shared_items',
} as const;

export type OrgPermission = (typeof OrgPermission)[keyof typeof OrgPermission];

const getAuthHeader = () => {
  const token = localStorage.getItem('access_token');
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const permissionsService = {
  async getUserPermissions(
    userId: number,
    organizationId: number,
  ): Promise<OrgPermission[]> {
    const response = await axios.get(
      `${API_URL}/permissions/user/${userId}/organization/${organizationId}`,
      {
        headers: getAuthHeader(),
      },
    );
    const permissions = response.data?.permissions;
    return Array.isArray(permissions) ? permissions : [];
  },
};
