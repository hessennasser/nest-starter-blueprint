import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { EntityRelationalHelper } from 'src/shared/helpers/relational-entity.helper';
import { UserStatus, UserType } from 'src/shared/enums/user-type.enum';
import { Role } from '../../rbac/entities/role.entity';
import { RefreshSession } from '../../auth/entities/refresh-session.entity';

@Entity({ name: 'users' })
@Index(['email'], { unique: true })
export class User extends EntityRelationalHelper {
  @Column({ type: 'varchar', length: 320 })
  email: string;

  /** bcrypt hash. Never selected into a response — see UsersPresenter. */
  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'phone_number' })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string | null;

  @Column({ type: 'enum', enum: UserType, default: UserType.USER, name: 'user_type' })
  userType: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  lastLoginAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'email_verified_at' })
  emailVerifiedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'disabled_at' })
  disabledAt?: Date | null;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt?: Date | null;

  @ManyToMany(() => Role, (role) => role.users, { eager: false })
  @JoinTable({ name: 'user_roles' })
  roles?: Role[];

  @OneToMany(() => RefreshSession, (session) => session.user)
  refreshSessions?: RefreshSession[];

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.deletedAt;
  }
}
