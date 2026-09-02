import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { EntityRelationalHelper } from 'src/shared/helpers/relational-entity.helper';
import { Role } from './role.entity';

export type LocalizedString = { ar: string; en: string };

export enum PermissionType {
  ADMIN = 'ADMIN',
  USER = 'USER',
  SHARED = 'SHARED',
}

@Entity({ name: 'permissions' })
@Index(['code'], { unique: true })
export class Permission extends EntityRelationalHelper {
  /** Matches a `PermissionKey` enum value. */
  @Column({ type: 'varchar', length: 120 })
  code: string;

  @Column({ type: 'varchar', length: 30, default: PermissionType.ADMIN })
  type: PermissionType;

  @Column({ type: 'jsonb' })
  name: LocalizedString;

  @Column({ type: 'jsonb', nullable: true })
  description?: LocalizedString | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles?: Role[];
}
