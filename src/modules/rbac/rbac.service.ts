import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleScope } from 'src/shared/enums/user-type.enum';
import { normalizeLocalizedString } from 'src/shared/helpers/language.helper';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissions: Repository<Permission>,
  ) {}

  listPermissions(): Promise<Permission[]> {
    return this.permissions.find({ order: { code: 'ASC' } });
  }

  listRoles(): Promise<Role[]> {
    return this.roles.find({
      relations: ['permissions'],
      order: { code: 'ASC' },
    });
  }

  async getRoleOrThrow(id: string): Promise<Role> {
    const role = await this.roles.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    if (await this.roles.findOne({ where: { code: dto.code } })) {
      throw new ConflictException('Role code already exists');
    }
    const role = this.roles.create({
      code: dto.code,
      name: normalizeLocalizedString(dto.name),
      description: dto.description
        ? normalizeLocalizedString(dto.description)
        : null,
      scopeType: dto.scopeType ?? RoleScope.ADMIN,
      isSystem: false,
      permissions: await this.resolvePermissions(dto.permissionCodes),
    });
    return this.roles.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.getRoleOrThrow(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }

    if (dto.name !== undefined) role.name = normalizeLocalizedString(dto.name);
    if (dto.description !== undefined) {
      role.description = dto.description
        ? normalizeLocalizedString(dto.description)
        : null;
    }
    if (dto.scopeType !== undefined) role.scopeType = dto.scopeType;
    if (dto.permissionCodes !== undefined) {
      role.permissions = await this.resolvePermissions(dto.permissionCodes);
    }
    return this.roles.save(role);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRoleOrThrow(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    await this.roles.softRemove(role);
  }

  private async resolvePermissions(codes?: string[]): Promise<Permission[]> {
    if (!codes || codes.length === 0) return [];
    const found = await this.permissions.find({ where: { code: In(codes) } });
    if (found.length !== codes.length) {
      throw new NotFoundException('One or more permissions were not found');
    }
    return found;
  }
}
