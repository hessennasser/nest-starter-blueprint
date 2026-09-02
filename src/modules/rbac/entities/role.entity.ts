import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { EntityRelationalHelper } from 'src/shared/helpers/relational-entity.helper';
import { RoleScope } from 'src/shared/enums/user-type.enum';
import { Permission, type LocalizedString } from './permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'roles' })
@Index(['code'], { unique: true })
export class Role extends EntityRelationalHelper {
  /** Matches a `RoleKey` enum value. */
  @Column({ type: 'varchar', length: 120 })
  code: string;

  @Column({
    type: 'enum',
    enum: RoleScope,
    default: RoleScope.ADMIN,
    name: 'scope_type',
  })
  scopeType: RoleScope;

  @Column({ type: 'jsonb' })
  name: LocalizedString;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedString | null;

  /** System roles cannot be edited or deleted through the API. */
  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    eager: false,
  })
  @JoinTable({ name: 'role_permissions' })
  permissions?: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users?: User[];
}
