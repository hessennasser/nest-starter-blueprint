import { ForbiddenException, Injectable } from '@nestjs/common';
import { PermissionKey } from 'src/shared/constants/permission-keys';
import { UserType } from 'src/shared/enums/user-type.enum';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { Article } from '../entities/article.entity';

/**
 * All "may this actor do X to this row" decisions live here, out of the service
 * flow. Services call a `assert*` method and let it throw. Keeps authorization
 * rules in one greppable place per module.
 */
@Injectable()
export class ArticlePolicyService {
  private has(user: AuthenticatedUser, permission: PermissionKey): boolean {
    return (
      user.userType === UserType.SUPER_ADMIN ||
      user.permissionCodes.includes(permission)
    );
  }

  assertCanEdit(user: AuthenticatedUser, article: Article): void {
    if (this.has(user, PermissionKey.MANAGE_ARTICLES)) return;
    if (article.authorId === user.id) return;
    throw new ForbiddenException('You cannot edit this article');
  }

  assertCanPublish(user: AuthenticatedUser): void {
    if (this.has(user, PermissionKey.PUBLISH_ARTICLES)) return;
    throw new ForbiddenException('You cannot publish articles');
  }

  assertCanDelete(user: AuthenticatedUser, article: Article): void {
    if (this.has(user, PermissionKey.MANAGE_ARTICLES)) return;
    if (article.authorId === user.id) return;
    throw new ForbiddenException('You cannot delete this article');
  }
}
