import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PermissionKey } from 'src/shared/constants/permission-keys';
import { RequirePermissions } from 'src/shared/decorators';
import { SuccessResponseDto } from 'src/shared/dto/api-response.dto';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';
import { ResponseHelper } from 'src/shared/helpers';
import { resolveLanguage } from 'src/shared/helpers/language.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionDto, RoleDto } from './dto/rbac-response.dto';
import { presentPermission, presentRole } from './rbac.presenter';
import { RbacService } from './rbac.service';

@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.MANAGE_ROLES)
@ApiTags('RBAC')
@ApiBearerAuth('access-token')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  private lang(req: Request) {
    return resolveLanguage(req.headers['accept-language']);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List every permission in the catalogue' })
  @ApiOkResponse({ type: [PermissionDto] })
  async permissions(@Req() req: Request) {
    const items = await this.rbacService.listPermissions();
    return ResponseHelper.success(
      items.map((p) => presentPermission(p, this.lang(req))),
    );
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles with their permissions' })
  @ApiOkResponse({ type: [RoleDto] })
  async roles(@Req() req: Request) {
    const items = await this.rbacService.listRoles();
    return ResponseHelper.success(
      items.map((r) => presentRole(r, this.lang(req))),
    );
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Get one role' })
  @ApiOkResponse({ type: RoleDto })
  async role(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return ResponseHelper.success(
      presentRole(await this.rbacService.getRoleOrThrow(id), this.lang(req)),
    );
  }

  @Post('roles')
  @ApiOperation({ summary: 'Create a role' })
  @ApiOkResponse({ type: RoleDto })
  async createRole(@Req() req: Request, @Body() dto: CreateRoleDto) {
    return ResponseHelper.created(
      presentRole(await this.rbacService.createRole(dto), this.lang(req)),
    );
  }

  @Patch('roles/:id')
  @ApiOperation({ summary: 'Update a non-system role' })
  @ApiOkResponse({ type: RoleDto })
  async updateRole(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return ResponseHelper.updated(
      presentRole(await this.rbacService.updateRole(id, dto), this.lang(req)),
    );
  }

  @Delete('roles/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a non-system role' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    await this.rbacService.deleteRole(id);
    return ResponseHelper.deleted();
  }
}
