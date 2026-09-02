import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from 'src/shared/constants/permission-keys';

export const REQUIRED_PERMISSIONS_KEY = 'required_permissions';
export const REQUIRED_ANY_PERMISSIONS_KEY = 'required_any_permissions';

/** Caller must hold ALL listed permission codes (AND). */
export const RequirePermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

/** Caller must hold AT LEAST ONE listed permission code (OR). */
export const RequireAnyPermissions = (...permissions: PermissionKey[]) =>
  SetMetadata(REQUIRED_ANY_PERMISSIONS_KEY, permissions);
