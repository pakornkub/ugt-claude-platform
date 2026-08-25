// kit: ugt-nextjs-platform 4.51.0 · ugt-nextjs-auth-setup/lib/audit-actions.ts
// kit-hash: 15c35df58007
/**
 * Audit action keys — single source of truth for every string written to
 * `ActivityLogs.action`.
 *
 * Naming: `<resource>.<verb>`, **all lowercase**, dot-separated, kebab inside a
 * segment (`users.role-assign`, `users.password-set`). No camelCase — the
 * viewer's action filter groups by the exact string, so `users.resetPassword`
 * and `users.password-set` would show up as two unrelated events for one thing.
 *
 * Rule (references/audit-logging.md): **never write a raw string at a call
 * site** — a typo becomes a row nobody can filter for, and renaming an event
 * later means a data migration instead of an edit here.
 *
 * The block below is the org-mandated set (contract §2 item 4). Everything in
 * it is written by the shipped assets; add the project's own domain actions at
 * the EXTENSION POINT.
 */
export const AUDIT_ACTIONS = {
  // Authentication — written by lib/actions/auth.ts and lib/auth.ts
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGOUT: 'logout',
  LOGOUT_SSO: 'logout.sso',

  // User management — written by lib/actions/admin-users.ts
  USERS_CREATE: 'users.create',
  USERS_ROLE_ASSIGN: 'users.role-assign',
  // [METHOD: LOCAL] admin "ตั้งรหัสผ่าน" on a row (NOT the user's own reset)
  USERS_PASSWORD_SET: 'users.password-set', // NOSONAR typescript:S2068 — audit action key, not a password value

  // Role management — written by lib/actions/admin-roles.ts
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  // [METHOD: LOCAL] Password lifecycle — lib/actions/password.ts + lib/auth.ts
  // (delete this block together with local login)
  PASSWORD_RESET_REQUESTED: 'password.reset.requested',
  PASSWORD_RESET: 'password.reset',
  // asked for a reset on an account that cannot have one (SSO/LDAP row)
  PASSWORD_RESET_REFUSED: 'password.reset.refused',
  PASSWORD_CHANGE: 'password.change',
  PASSWORD_CHANGE_FAILED: 'password.change.failed',

  // EXTENSION POINT: project-domain actions here, same `<resource>.<verb>`
  // shape — e.g. EXPORT_EXCEL: 'export.excel', SETTINGS_UPDATE: 'settings.update'
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
