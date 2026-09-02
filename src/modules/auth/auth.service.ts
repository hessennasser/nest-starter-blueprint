import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllConfigType } from 'src/config/config.type';
import { RoleKey } from 'src/shared/constants/role-keys';
import { UserStatus, UserType } from 'src/shared/enums/user-type.enum';
import { EncryptionHelper } from 'src/shared/helpers/encryption.helper';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import {
  parseDuration,
  RefreshSessionService,
} from './refresh-session.service';

type SessionMeta = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AllConfigType>,
    private readonly refreshSessions: RefreshSessionService,
  ) {}

  async register(dto: RegisterDto, meta: SessionMeta): Promise<AuthResponseDto> {
    const existing = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
      withDeleted: true,
    });
    if (existing) throw new ConflictException('Email already in use');

    const memberRole = await this.roles.findOne({
      where: { code: RoleKey.MEMBER },
      relations: ['permissions'],
    });

    const user = await this.users.save(
      this.users.create({
        email: dto.email.toLowerCase(),
        password: await EncryptionHelper.hashPassword(dto.password),
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber ?? null,
        userType: UserType.USER,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        roles: memberRole ? [memberRole] : [],
      }),
    );

    return this.issueTokens(user, meta);
  }

  async login(dto: LoginDto, meta: SessionMeta): Promise<AuthResponseDto> {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['roles', 'roles.permissions'],
    });

    const ok =
      user &&
      user.status === UserStatus.ACTIVE &&
      (await EncryptionHelper.comparePassword(dto.password, user.password));

    // Same message + timing whether the email exists or the password is wrong.
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    user.lastLoginAt = new Date();
    await this.users.save(user);
    return this.issueTokens(user, meta);
  }

  async refresh(rawToken: string, meta: SessionMeta): Promise<AuthResponseDto> {
    const rotated = await this.refreshSessions.rotate(rawToken, meta);
    const user = await this.users.findOne({
      where: { id: rotated.userId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.buildResponse(user, rotated.token);
  }

  async logout(rawToken: string): Promise<void> {
    await this.refreshSessions.revoke(rawToken);
  }

  // --- internals ---

  private async issueTokens(
    user: User,
    meta: SessionMeta,
  ): Promise<AuthResponseDto> {
    const { token } = await this.refreshSessions.issue(user.id, meta);
    return this.buildResponse(user, token);
  }

  private buildResponse(user: User, refreshToken: string): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
    };
    // Lifetime comes from JwtModule.signOptions (auth.expires); reuse the same
    // value only to report `expiresIn` seconds back to the client.
    const expiresIn = this.config.get('auth.expires', { infer: true }) || '15m';

    return {
      accessToken: this.jwt.sign(payload),
      refreshToken,
      expiresIn: Math.round(parseDuration(expiresIn) / 1000),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        userType: user.userType,
        permissionCodes: [
          ...new Set(
            (user.roles ?? []).flatMap((r) =>
              (r.permissions ?? []).map((p) => p.code),
            ),
          ),
        ],
      },
    };
  }
}
