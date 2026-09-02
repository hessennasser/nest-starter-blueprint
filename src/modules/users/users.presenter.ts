import { PaginatedResponse } from 'src/shared/pagination/paginated-response';
import { User } from './entities/user.entity';
import { PaginatedUsersDto, UserDto } from './dto/user-response.dto';

/**
 * Pure entity → response-DTO mappers. No DB access, no `this`. This is the ONLY
 * place a `User` becomes JSON, which is what keeps the password hash and other
 * internal columns out of every response.
 */
export const presentUser = (user: User): UserDto => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phoneNumber: user.phoneNumber ?? null,
  avatar: user.avatar ?? null,
  userType: user.userType,
  status: user.status,
  roles: (user.roles ?? []).map((role) => role.code),
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  createdAt: user.createdAt,
});

export const presentUsersPage = (
  page: PaginatedResponse<User>,
): PaginatedUsersDto => ({
  items: page.items.map(presentUser),
  meta: page.meta,
});
