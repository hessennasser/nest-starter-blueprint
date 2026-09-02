/**
 * `UserType` is the coarse identity of an account, checked by `ScopeGuard` via
 * `@RequireUserTypes(...)`. Fine-grained authorization is a separate axis —
 * permission codes checked by `PermissionsGuard` via `@RequirePermissions(...)`.
 *
 * `SUPER_ADMIN` short-circuits both guards.
 *
 * To model tenants/orgs, add e.g. `ORG_OWNER` / `ORG_MEMBER` here and an
 * `orgId` column on `User`, then add an `OrgScopeGuard` — see BLUEPRINT.md.
 */
export enum UserType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  PENDING = 'PENDING',
}

/** Which realm a role belongs to. Keeps admin roles unassignable to end users. */
export enum RoleScope {
  ADMIN = 'ADMIN',
  USER = 'USER',
}
