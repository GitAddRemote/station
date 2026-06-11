import { SetMetadata } from '@nestjs/common';
import { SystemPermission } from '../system-permissions.constants';

export const SYSTEM_PERMISSIONS_KEY = 'system_permissions';

export const RequireSystemPermission = (...permissions: SystemPermission[]) =>
  SetMetadata(SYSTEM_PERMISSIONS_KEY, permissions);
