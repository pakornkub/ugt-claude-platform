# Audit Logging — ActivityLogs (org contract item 4)

The `ActivityLogs` table is **append-only**: who did what, when. Every project
must have it. The schema ships in `assets/prisma/schema-auth.prisma` — this file
covers the rules, schema, action naming and `detail` payload; the write pattern
is in `audit-write-pattern.md`, the viewer and retention in
`audit-viewer-retention.md`.

Contents: §Quick Rules · §Schema · §Action naming · §Write pattern (moved) ·
§The `detail` payload · §Viewer / §Retention (moved) · §Checklist.

## Quick Rules

- Write a log entry for **every** privileged/sensitive action: data export,
  settings change, user create/update/delete, role/permission management,
  login/logout
- **Write only after the primary operation succeeds** — never before (or you
  log operations that failed)
- **An audit-log failure must never fail the primary operation** — critical
  paths use fire-and-forget + `.catch(() => {})`
- **Never store passwords / secrets / tokens / unmasked PII in `detail`** — an
  audit log with careless payloads is a personal-data leak, and log readers
  usually outnumber the people allowed to read the source data
- Actions are `<resource>.<verb>`, all lowercase, dot-separated — declared as
  **constants**, never raw strings
- **Export routes are the one exception**: log **before** streaming starts,
  because a stream can't be interrupted once begun

## Schema (already in `assets/prisma/schema-auth.prisma`)

```prisma
model activityLog {
  id        Int      @id @default(autoincrement()) @map("Id")
  userId    String   @map("UserId")   // no FK — users can be deleted; history must survive
  action    String   @map("Action")   // dot-namespaced: "roles.delete", "export.excel"
  detail    String?  @db.NVarChar(Max) @map("Detail")  // JSON string, nullable
  createdAt DateTime @default(now()) @map("CreatedAt")

  @@map("ActivityLogs")
}
```

- **Why no FK on `userId`** — users can be deleted without losing history;
  store the string and enrich the name at read time via batch lookup
- **Why `NVarChar(Max)`** — payload size is unpredictable (filters, row counts,
  arrays); avoid truncation
- This table is exempt from the standard audit-column rule (no
  `UpdatedAt`/`IsDeleted`) because it is append-only — **never UPDATE or DELETE
  it from app code**

## Action naming

The constants ship as an asset — copy `assets/lib/audit-actions.ts` to
`lib/audit-actions.ts` and import from it; do not retype the list:

```ts
// lib/audit-actions.ts (excerpt — the asset is the full, authoritative list)
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGOUT: 'logout',
  LOGOUT_SSO: 'logout.sso',
  USERS_CREATE: 'users.create',
  USERS_ROLE_ASSIGN: 'users.role-assign',
  USERS_PASSWORD_SET: 'users.password-set',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  // …password.* for local accounts, then the project's own domain actions
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
```

**Org-mandated set** (contract §2 item 4 — the assets already write all of
these): `login.success` · `login.failed` · `logout` · `logout.sso` ·
`users.create` · `users.role-assign` · `roles.create` · `roles.update` ·
`roles.delete`, plus for local accounts `password.reset.requested` ·
`password.reset` · `password.reset.refused` · `password.change` ·
`password.change.failed` · `users.password-set`, and with an HR view
`users.preassign-create` · `users.preassign-update` · `users.preassign-delete`
· `users.preassign-apply` (the last written with the logging-in person as actor,
`detail.setBy` = the admin — `org-identity.md` §2).
Add the rest per the project's domain.

Every helper that writes a log takes `action: AuditAction`, never `string` — that
is what makes "no raw strings" enforceable instead of merely requested.

```ts
// ✅ dot-namespaced, precise, all lowercase (kebab inside a segment)
'roles.delete'  ·  'users.password-set'  ·  'export.excel'

// ❌ vague / un-namespaced / camelCase inside a segment
'export'  ·  'update'  ·  'changed settings'  ·  'users.resetPassword'
```

There is **no `users.delete`** in the kit: nothing deletes users (SSO/AD rows
appear on first login — มติ 2026-08-11; pre-assignment deletes only its own
pending row). Add the constant only alongside a real
action that writes it.

## Write pattern

→ moved to `audit-write-pattern.md` (sequential default · non-blocking for login/logout · export routes log before streaming).

## The `detail` payload — allowed and forbidden

Structured JSON with enough context to reconstruct what happened — never a copy
of the data itself.

| Action type | Recommended fields | Forbidden |
| --- | --- | --- |
| Export | `{ filters, sort, rowCount }` | the exported data itself |
| Settings change | `{ previousValue, newValue }` | secrets/connection strings |
| User management | `{ targetUserId, targetEmail }` | passwords, hashes, tokens |
| Login | `{ method: 'sso' \| 'ldap' \| 'local' }` | the mistyped password, session tokens |

```ts
// ✅ structured, reproducible
detail: JSON.stringify({ filters: { status: 'active' }, rowCount: 42 });

// ❌ prose, untraceable
detail: 'User exported data with some filters';

// ❌ forbidden content
detail: JSON.stringify({ password: 'abc123' });
```

**PDPA/privacy check**: before adding a personal-data field, ask "would it be
acceptable for everyone holding `audit-logs:read` to see this field?" — log
access is usually broader than source-data access.

## Viewer (server component — no API route)

→ moved to `audit-viewer-retention.md` §Viewer.

## Retention

→ moved to `audit-viewer-retention.md` §Retention (host-cron purge via `usp_PurgeActivityLogs`, viewer query floor).

## Checklist

- [ ] Logs written **after** the primary operation succeeds (except export routes, which log before streaming)
- [ ] Critical paths (login/logout) use `.catch(() => {})`, not a bare `await`
- [ ] Every action comes from a constant in `lib/audit-actions.ts` — no raw strings
- [ ] `detail` is structured JSON · no passwords/secrets/tokens · no over-broad PII
- [ ] Viewer query: guarded by `audit-logs:read` · username search resolves to userIds (sentinel only needed on raw-SQL paths) · batch name enrichment · pageSize clamped · retention floor added once the project fixes its window
- [ ] No code UPDATEs `ActivityLogs`; the only DELETE is `usp_PurgeActivityLogs`, called by the retention cron route
- [ ] A scheduled cleanup job exists and the retention window is documented in the project
