import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  REQUIRED_ANY_PERMISSIONS_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../decorators/require-permissions.decorator';
import { UserType } from '../enums/user-type.enum';

/**
 * Enforces `@RequirePermissions` (AND) and `@RequireAnyPermissions` (OR)
 * against the permission codes attached to the request by `JwtStrategy`.
 * `SUPER_ADMIN` bypasses the check. Use AFTER `JwtAuthGuard` in `@UseGuards`.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredAny = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!required || required.length === 0) &&
      (!requiredAny || requiredAny.length === 0)
    ) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Record<string, unknown>>();
    const user = (request.user as Record<string, unknown> | undefined) ?? {};

    if (user.userType === UserType.SUPER_ADMIN) return true;

    const codes = (user.permissionCodes as string[] | undefined) ?? [];

    const hasAll = (required ?? []).every((p) => codes.includes(p));
    const hasAny =
      !requiredAny ||
      requiredAny.length === 0 ||
      requiredAny.some((p) => codes.includes(p));

    if (!hasAll || !hasAny) {
      throw new ForbiddenException('Missing required permissions');
    }
    return true;
  }
}
