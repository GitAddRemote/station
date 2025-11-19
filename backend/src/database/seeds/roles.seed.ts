import { Role } from '../../modules/roles/role.entity';

export const defaultRoles: Partial<Role>[] = [
  {
    name: 'Owner',
    description:
      'Full access to organization. Can delete organization and manage all settings.',
    permissions: {
      // Organization management
      canDeleteOrganization: true,
      canEditOrganization: true,
      canViewOrganization: true,

      // User management
      canInviteUsers: true,
      canRemoveUsers: true,
      canEditUserRoles: true,
      canViewUsers: true,

      // Role management
      canCreateRoles: true,
      canEditRoles: true,
      canDeleteRoles: true,
      canViewRoles: true,

      // Settings
      canManageSettings: true,
      canViewSettings: true,
    },
  },
  {
    name: 'Admin',
    description: 'Administrative access. Can manage users and settings.',
    permissions: {
      // Organization management
      canEditOrganization: true,
      canViewOrganization: true,

      // User management
      canInviteUsers: true,
      canRemoveUsers: true,
      canEditUserRoles: true,
      canViewUsers: true,

      // Role management
      canViewRoles: true,

      // Settings
      canManageSettings: true,
      canViewSettings: true,
    },
  },
  {
    name: 'Member',
    description: 'Standard member access. Can view and participate.',
    permissions: {
      // Organization management
      canViewOrganization: true,

      // User management
      canViewUsers: true,

      // Role management
      canViewRoles: true,

      // Settings
      canViewSettings: true,
    },
  },
  {
    name: 'Viewer',
    description: 'Read-only access. Can only view information.',
    permissions: {
      // Organization management
      canViewOrganization: true,

      // User management
      canViewUsers: true,

      // Settings
      canViewSettings: true,
    },
  },
];
