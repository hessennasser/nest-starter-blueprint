import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { AllConfigType } from 'src/config/config.type';
import { EncryptionHelper } from 'src/shared/helpers/encryption.helper';
import { RefreshSession } from './entities/refresh-session.entity';

type SessionMeta = { ipAddress?: string; userAgent?: string };

/** "15m" | "7d" | "3600s" | "900" → milliseconds. */
export function parseDuration(input: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(input.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2] || 's';
  const factor = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit] ?? 1_000;
  return value * factor;
}

@Injectable()
export class RefreshSessionService {
  constructor(
    @InjectRepository(RefreshSession)
    private readonly sessions: Repository<RefreshSession>,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  private ttlMs(): number {
    return parseDuration(
      this.config.get('auth.refreshExpires', { infer: true }) || '7d',
    );
  }

  /** Create a new session; returns the RAW token (only time it exists). */
  async issue(
    userId: string,
    meta: SessionMeta = {},
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = EncryptionHelper.generateSecureToken(48);
    const expiresAt = new Date(Date.now() + this.ttlMs());
    await this.sessions.save(
      this.sessions.create({
        userId,
        tokenHash: EncryptionHelper.hashToken(token),
        expiresAt,
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      }),
    );
    return { token, expiresAt };
  }

  /** Rotate: validate the presented token, revoke it, issue a fresh one. */
  async rotate(
    rawToken: string,
    meta: SessionMeta = {},
  ): Promise<{ userId: string; token: string; expiresAt: Date }> {
    const session = await this.sessions.findOne({
      where: { tokenHash: EncryptionHelper.hashToken(rawToken) },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    session.revokedAt = new Date();
    await this.sessions.save(session);

    const next = await this.issue(session.userId, meta);
    return { userId: session.userId, ...next };
  }

  async revoke(rawToken: string): Promise<void> {
    await this.sessions.update(
      { tokenHash: EncryptionHelper.hashToken(rawToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.sessions.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /** Housekeeping hook — delete rows that expired more than a day ago. */
  async pruneExpired(): Promise<void> {
    await this.sessions.delete({
      expiresAt: LessThan(new Date(Date.now() - 86_400_000)),
    });
  }
}
