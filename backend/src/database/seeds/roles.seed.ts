import { Role } from '../../modules/roles/role.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../../modules/permissions/permissions.constants';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Owner:
    'Full access to organization. Can delete organization and manage all settings.',
  Admin: 'Administrative access. Can manage users and settings.',
  Member: 'Standard member access. Can view and participate.',
  Viewer: 'Read-only access. Can only view information.',
};

export const defaultRoles: Partial<Role>[] = Object.entries(
  DEFAULT_ROLE_PERMISSIONS,
)
  .filter(
    (
      entry,
    ): entry is [
      keyof typeof ROLE_DESCRIPTIONS,
      (typeof DEFAULT_ROLE_PERMISSIONS)[string],
    ] => entry[0] in ROLE_DESCRIPTIONS,
  )
  .map(([name, permissions]) => ({
    name,
    description: ROLE_DESCRIPTIONS[name],
    permissions,
  }));
