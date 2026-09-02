import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserType } from 'src/shared/enums/user-type.enum';
import { TrimString } from 'src/shared/helpers/transform.helper';

export class CreateUserDto {
  @ApiProperty({ example: 'member@example.com' })
  @TrimString()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePass!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Sam Member' })
  @TrimString()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @ApiPropertyOptional({ enum: UserType, default: UserType.USER })
  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;

  @ApiPropertyOptional({ type: [String], description: 'Role ids to assign.' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds?: string[];
}
