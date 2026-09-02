/**
 * Stable identifiers for the roles the seed creates. `code` on the `roles`
 * table; referenced by the seed and by any code that needs to look a role up
 * by name rather than id.
 */
export enum RoleKey {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  MEMBER = 'MEMBER',
}
