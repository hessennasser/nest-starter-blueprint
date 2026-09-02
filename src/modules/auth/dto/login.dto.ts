import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { TrimString } from 'src/shared/helpers/transform.helper';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @TrimString()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
