import { SetMetadata } from '@nestjs/common';
import { UserType } from 'src/shared/enums/user-type.enum';

export const REQUIRED_USER_TYPES_KEY = 'required_user_types';

/** Caller's `userType` must be one of the listed types. Read by `ScopeGuard`. */
export const RequireUserTypes = (...types: UserType[]) =>
  SetMetadata(REQUIRED_USER_TYPES_KEY, types);
