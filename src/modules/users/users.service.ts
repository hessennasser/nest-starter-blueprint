import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserStatus, UserType } from 'src/shared/enums/user-type.enum';
import { EncryptionHelper } from 'src/shared/helpers/encryption.helper';
import { PaginatedResponse } from 'src/shared/pagination/paginated-response';
import { paginateQuery } from 'src/shared/pagination/pagination.util';
import { User } from './entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
  ) {}

  async list(query: ListUsersQueryDto): Promise<PaginatedResponse<User>> {
    const qb = this.users
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .orderBy('user.createdAt', query.order === 'ASC' ? 'ASC' : 'DESC');

    if (query.status) qb.andWhere('user.status = :status', { status: query.status });
    if (query.userType)
      qb.andWhere('user.userType = :userType', { userType: query.userType });
    if (query.search) {
      qb.andWhere('(user.email ILIKE :q OR user.fullName ILIKE :q)', {
        q: `%${query.search}%`,
      });
    }

    return paginateQuery(qb, query);
  }

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.users.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.toLowerCase();
    if (await this.users.findOne({ where: { email }, withDeleted: true })) {
      throw new ConflictException('Email already in use');
    }

    const user = this.users.create({
      email,
      password: await EncryptionHelper.hashPassword(dto.password),
      fullName: dto.fullName,
      userType: dto.userType ?? UserType.USER,
      status: UserStatus.ACTIVE,
      roles: await this.resolveRoles(dto.roleIds),
    });
    return this.users.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findByIdOrThrow(id);

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.userType !== undefined) user.userType = dto.userType;
    if (dto.status !== undefined) {
      user.status = dto.status;
      user.disabledAt = dto.status === UserStatus.DISABLED ? new Date() : null;
    }
    if (dto.roleIds !== undefined) {
      user.roles = await this.resolveRoles(dto.roleIds);
    }
    return this.users.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findByIdOrThrow(id);
    await this.users.softRemove(user);
  }

  private async resolveRoles(roleIds?: string[]): Promise<Role[]> {
    if (!roleIds || roleIds.length === 0) return [];
    const roles = await this.roles.find({ where: { id: In(roleIds) } });
    if (roles.length !== roleIds.length) {
      throw new NotFoundException('One or more roles were not found');
    }
    return roles;
  }
}
