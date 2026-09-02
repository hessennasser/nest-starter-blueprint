import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/** `code` is immutable once a role exists, so it is omitted here. */
export class UpdateRoleDto extends PartialType(
  OmitType(CreateRoleDto, ['code'] as const),
) {}
