import {
  DEFAULT_LANG,
  localizeString,
} from 'src/shared/helpers/language.helper';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionDto, RoleDto } from './dto/rbac-response.dto';

export const presentPermission = (
  permission: Permission,
  lang = DEFAULT_LANG,
): PermissionDto => ({
  id: permission.id,
  code: permission.code,
  type: permission.type,
  name: localizeString(permission.name, lang) ?? permission.code,
});

export const presentRole = (role: Role, lang = DEFAULT_LANG): RoleDto => ({
  id: role.id,
  code: role.code,
  scopeType: role.scopeType,
  name: localizeString(role.name, lang) ?? role.code,
  description: localizeString(role.description, lang),
  isSystem: role.isSystem,
  permissions: (role.permissions ?? []).map((p) => p.code),
});
