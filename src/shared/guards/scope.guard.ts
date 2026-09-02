import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_USER_TYPES_KEY } from '../decorators/require-user-types.decorator';
import { UserType } from '../enums/user-type.enum';

/**
 * Enforces `@RequireUserTypes(...)` — the coarse identity check, distinct from
 * the permission-code check in `PermissionsGuard`. `SUPER_ADMIN` bypasses.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTypes = this.reflector.getAllAndOverride<UserType[]>(
      REQUIRED_USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredTypes || requiredTypes.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const user = (request.user as Record<string, unknown> | undefined) ?? {};
    const userType = user.userType as UserType | undefined;

    if (userType === UserType.SUPER_ADMIN) return true;
    if (!userType || !requiredTypes.includes(userType)) {
      throw new ForbiddenException('Insufficient scope');
    }
    return true;
  }
}
