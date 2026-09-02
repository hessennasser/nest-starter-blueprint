import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ example: 'USER' }) userType: string;
  @ApiProperty({ type: [String], example: ['VIEW_ARTICLES'] })
  permissionCodes: string[];
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ example: 900, description: 'Access token lifetime, seconds.' })
  expiresIn: number;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}
