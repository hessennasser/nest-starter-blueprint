import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AllConfigType } from 'src/config/config.type';
import { UserStatus, UserType } from 'src/shared/enums/user-type.enum';
import { User } from '../../users/entities/user.entity';

/** Claims we put in the access token. Keep it small — it's re-checked below. */
export type JwtPayload = {
  sub: string;
  email?: string;
  userType?: UserType;
};

/**
 * What `@CurrentUser()` / `request.user` resolves to on every authenticated
 * request. `permissionCodes` is the flattened set of codes across the user's
 * roles — the guards read it from here, not from the token.
 */
export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
  userType: UserType;
  status: UserStatus;
  permissionCodes: string[];
  roleIds: string[];
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<AllConfigType>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    const secret = config.get('auth.secret', { infer: true });
    if (!secret) throw new Error('JWT secret is not configured');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Runs on every request. Re-loads the user (roles + permissions) so a
   * disabled account or a revoked role takes effect immediately, without
   * waiting for the short-lived access token to expire.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.users.findOne({
      where: { id: payload.sub },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User is not active');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      userType: user.userType,
      status: user.status,
      permissionCodes: [
        ...new Set(
          (user.roles ?? []).flatMap((role) =>
            (role.permissions ?? []).map((p) => p.code),
          ),
        ),
      ],
      roleIds: (user.roles ?? []).map((role) => role.id),
    };
  }
}
