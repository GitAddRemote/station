import { Role } from '../../modules/roles/role.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../../modules/permissions/permissions.constants';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Owner:
    'Full inventory access. Can view, edit, and administer organization inventory and member shared items.',
  Admin:
    'Full inventory access. Can view, edit, and administer organization inventory and member shared items.',
  Director:
    'Full inventory access. Can view, edit, and administer organization inventory and member shared items.',
  'Inventory Manager':
    'Full inventory access. Can view, edit, and administer organization inventory and member shared items.',
  Member: 'Standard member access. Can view inventory and member shared items.',
  Viewer: 'Read-only access. Can only view organization inventory.',
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
