// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-auth-setup/lib/permissions.ts
// kit-hash: 11f340a557d1
/**
 * Permission keys — single source of truth for all permission constants.
 * Naming convention: resource:action (standard RBAC pattern)
 *   - resource:read    → page guard (can access the page)
 *   - resource:create  → can create
 *   - resource:update  → can edit
 *   - resource:delete  → can delete
 *   - resource:action  → other domain-specific actions (e.g. users:reset-password)
 *   - resource:read-all → data scope (see all records vs. only own + team)
 *                        — pairs with lib/scope.ts; absence is the safe default
 *   - resource:manage-all → act on behalf of others (never overload read-all)
 * Seed these into the `permission` table on first admin setup.
 *
 * This skeleton ships the 3 baseline admin domains every project needs.
 * Add your project's domain permissions below, following the same pattern.
 */
export const PERMISSIONS = {
  // User management — no `users:delete`: ไม่มี action ลบผู้ใช้ใน kit โดยตั้งใจ
  // (บัญชี SSO/AD เกิดเองตอน login — มติ 2026-08-11); เพิ่มคีย์เมื่อทำ action จริง
  // ห้ามประกาศคีย์ล่วงหน้าโดยไม่มีของ — จะกลายเป็น checkbox ที่ติ๊กแล้วไม่ได้อะไร
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_RESET_PASSWORD: 'users:reset-password', // NOSONAR typescript:S2068 — permission key string, not a password value

  // Role management
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Audit logs
  AUDIT_LOGS_READ: 'audit-logs:read',

  // คีย์ของ skill อื่นไม่ประกาศที่นี่ — เจ้าของเป็นคนเพิ่มทั้ง "คีย์ + seed คู่กัน"
  // ตอนติดตั้ง: `dev-mode:enable` → ugt-nextjs-mail-setup ·
  // `files:create`/`files:read` → ugt-nextjs-upload-setup
  // (เคยประกาศคีย์ไว้ล่วงหน้าโดยไม่มี seed — installer เห็นคีย์แล้วข้ามขั้น seed
  // ทำให้ upload/download 403 ถาวร — 4.25.0)

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
