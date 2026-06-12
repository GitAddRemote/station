import { Role } from '../../modules/roles/role.entity';
import { DEFAULT_ROLE_PERMISSIONS } from '../../modules/permissions/permissions.constants';

// `keyof typeof DEFAULT_ROLE_PERMISSIONS` is now a literal union of role names
// (not `string`) because the constant uses `satisfies` without a wide type
// annotation. TypeScript will fail to compile if a new role is added to
// DEFAULT_ROLE_PERMISSIONS without a matching entry here.
type DefaultRoleName = keyof typeof DEFAULT_ROLE_PERMISSIONS;
const ROLE_DESCRIPTIONS: Record<DefaultRoleName, string> = {
  Owner:
    'Full inventory access. Can view, edit, and administer organization inventory.',
  Admin:
    'Full inventory access. Can view, edit, and administer organization inventory.',
  Director:
    'Full inventory access. Can view, edit, and administer organization inventory.',
  'Inventory Manager':
    'Full inventory access. Can view, edit, and administer organization inventory.',
  Member: 'Standard member access. Can view organization inventory.',
  Viewer: 'Guest-level access. Cannot view organization inventory.',
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
