import { ApiProperty } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'MANAGE_ARTICLES' }) code: string;
  @ApiProperty({ example: 'ADMIN' }) type: string;
  @ApiProperty({ example: 'Manage articles' }) name: string;
}

export class RoleDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'EDITOR' }) code: string;
  @ApiProperty({ example: 'ADMIN' }) scopeType: string;
  @ApiProperty({ example: 'Editor' }) name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ example: false }) isSystem: boolean;
  @ApiProperty({ type: [String], example: ['VIEW_ARTICLES'] })
  permissions: string[];
}
