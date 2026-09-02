import 'reflect-metadata';
import '../../register-paths';
import { DataSource } from 'typeorm';
import AppDataSource from '../data-source';
import { PermissionKey } from 'src/shared/constants/permission-keys';
import { RoleKey } from 'src/shared/constants/role-keys';
import { RoleScope, UserStatus, UserType } from 'src/shared/enums/user-type.enum';
import { EncryptionHelper } from 'src/shared/helpers/encryption.helper';
import {
  Permission,
  PermissionType,
} from '../../modules/rbac/entities/permission.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import { User } from '../../modules/users/entities/user.entity';

/**
 * Idempotent RBAC seed. Safe to run on every deploy (the Dockerfile CMD does).
 * It:
 *   1. upserts one `permissions` row per `PermissionKey`
 *   2. upserts the baseline roles and (re)wires their permission sets
 *   3. creates the super-admin from SEED_SUPER_ADMIN_* if absent
 *
 * Run locally with `pnpm seed:rbac`.
 */

type L = { en: string; ar: string };

const PERMISSIONS: Record<PermissionKey, { type: PermissionType; name: L }> = {
  [PermissionKey.MANAGE_USERS]: {
    type: PermissionType.ADMIN,
    name: { en: 'Manage users', ar: 'إدارة المستخدمين' },
  },
  [PermissionKey.MANAGE_ROLES]: {
    type: PermissionType.ADMIN,
    name: { en: 'Manage roles & permissions', ar: 'إدارة الأدوار والصلاحيات' },
  },
  [PermissionKey.MANAGE_ARTICLES]: {
    type: PermissionType.ADMIN,
    name: { en: 'Manage articles', ar: 'إدارة المقالات' },
  },
  [PermissionKey.PUBLISH_ARTICLES]: {
    type: PermissionType.ADMIN,
    name: { en: 'Publish articles', ar: 'نشر المقالات' },
  },
  [PermissionKey.VIEW_ARTICLES]: {
    type: PermissionType.USER,
    name: { en: 'View articles', ar: 'عرض المقالات' },
  },
};

const ROLES: Record<
  RoleKey,
  { scope: RoleScope; name: L; permissions: PermissionKey[] }
> = {
  [RoleKey.SUPER_ADMIN]: {
    scope: RoleScope.ADMIN,
    name: { en: 'Super Admin', ar: 'مدير عام' },
    permissions: Object.values(PermissionKey),
  },
  [RoleKey.ADMIN]: {
    scope: RoleScope.ADMIN,
    name: { en: 'Administrator', ar: 'مسؤول' },
    permissions: [
      PermissionKey.MANAGE_USERS,
      PermissionKey.MANAGE_ARTICLES,
      PermissionKey.PUBLISH_ARTICLES,
      PermissionKey.VIEW_ARTICLES,
    ],
  },
  [RoleKey.EDITOR]: {
    scope: RoleScope.ADMIN,
    name: { en: 'Editor', ar: 'محرر' },
    permissions: [PermissionKey.MANAGE_ARTICLES, PermissionKey.VIEW_ARTICLES],
  },
  [RoleKey.MEMBER]: {
    scope: RoleScope.USER,
    name: { en: 'Member', ar: 'عضو' },
    permissions: [PermissionKey.VIEW_ARTICLES],
  },
};

async function seed(dataSource: DataSource): Promise<void> {
  const permissionRepo = dataSource.getRepository(Permission);
  const roleRepo = dataSource.getRepository(Role);
  const userRepo = dataSource.getRepository(User);

  // 1. permissions
  const permissionByCode = new Map<string, Permission>();
  for (const [code, def] of Object.entries(PERMISSIONS)) {
    let permission = await permissionRepo.findOne({ where: { code } });
    permission = await permissionRepo.save(
      permissionRepo.merge(permission ?? permissionRepo.create({ code }), {
        type: def.type,
        name: def.name,
        isActive: true,
      }),
    );
    permissionByCode.set(code, permission);
  }
  console.log(`✓ ${permissionByCode.size} permissions`);

  // 2. roles
  for (const [code, def] of Object.entries(ROLES)) {
    const existing = await roleRepo.findOne({
      where: { code },
      relations: ['permissions'],
    });
    const role = roleRepo.merge(existing ?? roleRepo.create({ code }), {
      name: def.name,
      scopeType: def.scope,
      isSystem: code === RoleKey.SUPER_ADMIN,
      isActive: true,
      permissions: def.permissions.map((p) => permissionByCode.get(p)!),
    });
    await roleRepo.save(role);
  }
  console.log(`✓ ${Object.keys(ROLES).length} roles`);

  // 3. super admin
  const email = process.env.SEED_SUPER_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('• SEED_SUPER_ADMIN_EMAIL/PASSWORD not set — skipping user');
    return;
  }

  const superAdminRole = await roleRepo.findOneOrFail({
    where: { code: RoleKey.SUPER_ADMIN },
  });
  let user = await userRepo.findOne({
    where: { email },
    relations: ['roles'],
    withDeleted: true,
  });

  if (!user) {
    user = userRepo.create({
      email,
      password: await EncryptionHelper.hashPassword(password),
      fullName: process.env.SEED_SUPER_ADMIN_FULL_NAME || 'Super Admin',
      userType: UserType.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: [superAdminRole],
    });
    await userRepo.save(user);
    console.log(`✓ super admin created: ${email}`);
  } else {
    user.userType = UserType.SUPER_ADMIN;
    user.status = UserStatus.ACTIVE;
    user.deletedAt = null;
    user.roles = [superAdminRole];
    await userRepo.save(user);
    console.log(`✓ super admin already existed, re-activated: ${email}`);
  }
}

async function main(): Promise<void> {
  const dataSource = AppDataSource.isInitialized
    ? AppDataSource
    : await AppDataSource.initialize();
  try {
    await seed(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

// Allow both `pnpm seed:rbac` and importing `seed()` from a test/e2e helper.
if (require.main === module) {
  main().catch((error) => {
    console.error('RBAC seed failed:', error);
    process.exit(1);
  });
}

export { seed };
