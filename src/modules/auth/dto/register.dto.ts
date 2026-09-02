import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TrimString } from 'src/shared/helpers/transform.helper';

export class RegisterDto {
  @ApiProperty({ example: 'jane@example.com' })
  @TrimString()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePass!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @TrimString()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @ApiPropertyOptional({ example: '+15555550123' })
  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;
}
