import { Role } from '../../modules/roles/role.entity';
import { OrgPermission } from '../../modules/permissions/permissions.constants';

export const defaultRoles: Partial<Role>[] = [
  {
    name: 'Owner',
    description:
      'Full access to organization. Can delete organization and manage all settings.',
    permissions: {
      [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
      [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
      [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
      [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
    },
  },
  {
    name: 'Admin',
    description: 'Administrative access. Can manage users and settings.',
    permissions: {
      [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
      [OrgPermission.CAN_EDIT_ORG_INVENTORY]: true,
      [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: true,
      [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
    },
  },
  {
    name: 'Member',
    description: 'Standard member access. Can view and participate.',
    permissions: {
      [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
      [OrgPermission.CAN_EDIT_ORG_INVENTORY]: false,
      [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: false,
      [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: true,
    },
  },
  {
    name: 'Viewer',
    description: 'Read-only access. Can only view information.',
    permissions: {
      [OrgPermission.CAN_VIEW_ORG_INVENTORY]: true,
      [OrgPermission.CAN_EDIT_ORG_INVENTORY]: false,
      [OrgPermission.CAN_ADMIN_ORG_INVENTORY]: false,
      [OrgPermission.CAN_VIEW_MEMBER_SHARED_ITEMS]: false,
    },
  },
];
