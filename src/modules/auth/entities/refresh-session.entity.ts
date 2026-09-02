import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntityRelationalHelper } from 'src/shared/helpers/relational-entity.helper';
import { User } from '../../users/entities/user.entity';

/**
 * One row per active refresh token. The raw token is never stored — only its
 * SHA-256 hash (`EncryptionHelper.hashToken`). Refresh rotates: the presented
 * row is marked `revokedAt` and a fresh row issued, so a stolen-and-replayed
 * token is detectable (already revoked).
 */
@Entity({ name: 'refresh_sessions' })
@Index(['tokenHash'], { unique: true })
export class RefreshSession extends EntityRelationalHelper {
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', length: 64, name: 'token_hash' })
  tokenHash: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt?: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_agent' })
  userAgent?: string | null;
}
