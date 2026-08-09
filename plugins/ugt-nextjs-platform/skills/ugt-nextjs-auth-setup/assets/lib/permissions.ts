/**
 * Permission keys — single source of truth for all permission constants.
 * Naming convention: resource:action (standard RBAC pattern)
 *   - resource:read    → page guard (can access the page)
 *   - resource:create  → can create
 *   - resource:update  → can edit
 *   - resource:delete  → can delete
 *   - resource:action  → other domain-specific actions (e.g. users:reset-password)
 *   - resource:view-all → data scope (see all records vs. only own records)
 * Seed these into the `permission` table on first admin setup.
 *
 * This skeleton ships the 3 baseline admin domains every project needs.
 * Add your project's domain permissions below, following the same pattern.
 */
export const PERMISSIONS = {
  // User management
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_RESET_PASSWORD: 'users:reset-password', // NOSONAR typescript:S2068 — permission key string, not a password value

  // Role management
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Audit logs
  AUDIT_LOGS_READ: 'audit-logs:read',

  // Testing aid — grant to developers/testers ONLY. Holders receive workflow
  // email themselves instead of the real recipients (see ugt-nextjs-mail-setup).
  // On a normal account this silently hides notifications from the people who
  // should get them.
  DEV_MODE: 'dev-mode:enable',

  // File attachments (ugt-nextjs-upload-setup). `files:read` only grants
  // "may download files at all" — WHICH files a user may see is decided
  // per record in lib/attachment-access.ts.
  FILES_CREATE: 'files:create',
  FILES_READ: 'files:read',

  // EXTENSION POINT: add project-domain permissions here (resource:action)
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * All permission definitions used to seed the database.
 * group = domain/module the permission belongs to.
 */
export const ALL_PERMISSIONS: Array<{
  key: PermissionKey;
  label: string;
  group: string;
}> = [
  // User management
  { key: PERMISSIONS.USERS_READ, label: 'View Users', group: 'users' },
  { key: PERMISSIONS.USERS_CREATE, label: 'Create Users', group: 'users' },
  { key: PERMISSIONS.USERS_UPDATE, label: 'Edit Users', group: 'users' },
  { key: PERMISSIONS.USERS_DELETE, label: 'Delete Users', group: 'users' },
  { key: PERMISSIONS.USERS_RESET_PASSWORD, label: 'Reset User Passwords', group: 'users' },

  // Role management
  { key: PERMISSIONS.ROLES_READ, label: 'View Roles', group: 'roles' },
  { key: PERMISSIONS.ROLES_CREATE, label: 'Create Roles', group: 'roles' },
  { key: PERMISSIONS.ROLES_UPDATE, label: 'Edit Roles', group: 'roles' },
  { key: PERMISSIONS.ROLES_DELETE, label: 'Delete Roles', group: 'roles' },

  // Audit logs
  { key: PERMISSIONS.AUDIT_LOGS_READ, label: 'View Audit Logs', group: 'audit-logs' },

  // EXTENSION POINT: add seed entries for project-domain permissions here
];

/**
 * Check whether a user holds a specific permission.
 *
 * @param userPermissions - Array of permission keys from the user's role
 * @param key - The permission to check
 */
export function hasPermission(userPermissions: string[], key: PermissionKey): boolean {
  return userPermissions.includes(key);
}
