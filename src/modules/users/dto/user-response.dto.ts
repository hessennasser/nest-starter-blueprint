import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/shared/dto/api-response.dto';

export class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() fullName: string;
  @ApiProperty({ nullable: true }) phoneNumber: string | null;
  @ApiProperty({ nullable: true }) avatar: string | null;
  @ApiProperty({ example: 'USER' }) userType: string;
  @ApiProperty({ example: 'ACTIVE' }) status: string;
  @ApiProperty({ type: [String], example: ['ADMIN'] }) roles: string[];
  @ApiProperty({ nullable: true, type: String }) lastLoginAt: string | null;
  @ApiProperty() createdAt: Date;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserDto] }) items: UserDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
