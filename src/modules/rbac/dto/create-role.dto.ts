import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { RoleScope } from 'src/shared/enums/user-type.enum';
import {
  IsLocalizedString,
  type LocalizedStringInput,
} from 'src/shared/helpers/language.helper';

export class CreateRoleDto {
  @ApiProperty({ example: 'CONTENT_EDITOR' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be UPPER_SNAKE_CASE',
  })
  @MaxLength(120)
  code: string;

  @ApiProperty({
    example: { en: 'Content Editor', ar: 'محرر المحتوى' },
    description: 'Plain string or a { en, ar } object.',
  })
  @IsLocalizedString({ required: true })
  name: LocalizedStringInput;

  @ApiPropertyOptional({ example: { en: 'Edits articles', ar: 'يحرر المقالات' } })
  @IsOptional()
  @IsLocalizedString({ required: false, nullable: true })
  description?: LocalizedStringInput;

  @ApiPropertyOptional({ enum: RoleScope, default: RoleScope.ADMIN })
  @IsOptional()
  @IsEnum(RoleScope)
  scopeType?: RoleScope;

  @ApiPropertyOptional({
    type: [String],
    example: ['VIEW_ARTICLES', 'MANAGE_ARTICLES'],
    description: 'Permission codes to grant this role.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionCodes?: string[];
}
