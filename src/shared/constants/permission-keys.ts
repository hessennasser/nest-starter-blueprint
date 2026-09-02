/**
 * The catalogue of permission codes. Guards compare against the string values;
 * this enum is the single place they are declared. The RBAC seed
 * (`database/seeds/seed-rbac.ts`) creates one `permissions` row per entry and
 * wires them onto roles.
 *
 * Convention: `<VERB>_<NOUN>`. Keep "manage" (full CRUD) vs "view" (read) split
 * so read-only roles are expressible.
 */
export enum PermissionKey {
  // Platform administration
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_ROLES = 'MANAGE_ROLES',

  // Example feature: articles
  MANAGE_ARTICLES = 'MANAGE_ARTICLES',
  VIEW_ARTICLES = 'VIEW_ARTICLES',
  PUBLISH_ARTICLES = 'PUBLISH_ARTICLES',
}
