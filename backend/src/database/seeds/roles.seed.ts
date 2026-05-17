import { Role } from '../../modules/roles/role.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../../modules/permissions/permissions.constants';

// Typed against DEFAULT_ROLE_PERMISSIONS so TypeScript fails at compile time
// if a new default role is added without a corresponding description.
type DefaultRoleName = keyof typeof DEFAULT_ROLE_PERMISSIONS;
const ROLE_DESCRIPTIONS: Record<DefaultRoleName, string> = {
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

export const defaultRoles: Partial<Role>[] = (
  Object.entries(DEFAULT_ROLE_PERMISSIONS) as [
    DefaultRoleName,
    (typeof DEFAULT_ROLE_PERMISSIONS)[DefaultRoleName],
  ][]
).map(([name, permissions]) => ({
  name,
  description: ROLE_DESCRIPTIONS[name],
  permissions,
}));
