# Audit Logging — ActivityLogs (org contract item 4)

The `ActivityLogs` table is **append-only**: who did what, when. Every project
must have it. The schema ships in `assets/prisma/schema-auth.prisma` — this file
covers the write, read, and retention rules.

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
`password.change.failed` · `users.password-set`.
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
appear on first login — มติ 2026-08-11). Add the constant only alongside a real
action that writes it.

## Write pattern

### Sequential (default) — log after the primary operation succeeds

```ts
export async function deleteRoleAction(roleId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.ROLES_DELETE)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_DELETE_BLOCKED' };

  // 1. Primary operation first
  await prisma.$transaction([
    prisma.user.updateMany({ where: { roleId }, data: { roleId: null } }),
    prisma.role.delete({ where: { id: roleId } }),
  ]);

  // 2. Audit log after success
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: AUDIT_ACTIONS.ROLES_DELETE,
      detail: JSON.stringify({ targetRoleId: roleId }),
    },
  });

  return { success: true };
}
```

> The permission in the example is `ROLES_DELETE` on purpose: `lib/permissions.ts`
> deliberately ships **no `users:delete` key**, so an example built on
> `PERMISSIONS.USERS_DELETE` would compile to `hasPermission(perms, undefined)`
> — a permanent, silent 403 for everyone. Only check keys that exist.

`code` is a SCREAMING_SNAKE_CASE key translated client-side via the
`auth.errors` message catalog — see `lib/actions/admin-roles.ts` for a
worked example.

```ts
// ❌ reversed order — logs an operation that hasn't happened (or failed)
await prisma.activityLog.create({ ... });
await prisma.role.delete({ ... });
```

### Non-blocking — paths where audit must never block the user

```ts
const [result] = await Promise.all([
  prisma.appSetting.upsert({ ... }),
  prisma.activityLog
    .create({ data: { userId: session.user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATE, detail } })
    .catch(() => {}), // ← swallow intentionally
]);
```

```ts
// ❌ no await and no catch → unhandled promise rejection
prisma.activityLog.create({ ... });
```

Every login/logout path must use the non-blocking form — an audit failure that
breaks login is the worse failure.

### Export routes — log before streaming

```ts
await prisma.activityLog.create({
  data: {
    userId: session.user.id,
    action: AUDIT_ACTIONS.EXPORT_EXCEL,
    detail: JSON.stringify({ filters, sort, rowCount: data.length }),
  },
});
return new Response(buffer, { headers: { 'Content-Type': '...' } });
```

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

The shipped `/admin/audit-logs` is a **server component in DataTable server
mode** (`assets/app/(admin)/admin/audit-logs/page.tsx` +
`components/audit-logs-table.tsx`): the page parses `searchParams`
(`q`/`from`/`to`/`action` from the toolbar filters, `page`/`pageSize`/`sort`
pushed by the DataTable itself), queries Prisma directly, and re-renders. No
`app/api/audit-logs/route.ts` exists — only add one if something *other than
the page* needs the data (an external dashboard, an export job). The rules
below hold for either implementation:

- **Guard first, always in the same order**: session → `AUDIT_LOGS_READ` →
  query. In the page that's two `redirect()`s; in an API route it's
  401/403 responses.
- **Username search resolves to userIds first** — never `LIKE` on `userId`:

```ts
if (q) {
  const matched = await prisma.user.findMany({
    where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
    select: { id: true },
  });
  where.userId = { in: matched.map((u) => u.id) };
}
```

  Prisma compiles `in: []` to an always-false predicate, so "nobody matched"
  correctly yields zero rows. That guarantee is **Prisma-only**: in raw SQL /
  `EXEC usp_*` paths an empty IN list tends to get dropped ("no filter" → every
  row), so those paths still need the `'__no_match__'` sentinel id.
- **Enrich user names in one batch** (`id: { in: uniqueUserIds }` + a `Map`) —
  no N+1 query per row.
- **Clamp paging input**: `parsePageSize` only accepts values from
  `ROWS_PER_PAGE_OPTIONS` (กันผู้ใช้แก้ URL ขอ `pageSize=100000`), and
  `parsePageParams` floors bad pages to 1 — both from the design kit's
  `lib/pagination.ts`.
- **Date-range bounds are Bangkok-time** (`T00:00:00+07:00`, upper bound = next
  day exclusive) — `createdAt` is an instant and the container runs UTC.

Required permission in `lib/permissions.ts`: `AUDIT_LOGS_READ: 'audit-logs:read'`
(guards the viewer page and any API route a project adds — see `rbac.md`).

## Retention

- Define a minimum retention window in the project docs (e.g. 180 days)
- The schema has no `expiresAt`/soft-delete → use a DB-side scheduled job:

```sql
-- SQL Agent job
DELETE FROM ActivityLogs WHERE CreatedAt < DATEADD(day, -180, GETDATE());
```

- **Never delete rows from application code**

### The viewer query must also enforce the cutoff in its WHERE clause

The cleanup job runs on a schedule — between runs, stale rows still exist. The
page (or API) must filter at query time too, or data declared "kept 180 days"
stays readable longer:

```ts
// ✅ the query enforces the 180-day floor regardless of the job schedule
const retentionCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
const where = {
  createdAt: {
    gte: fromDate ? new Date(fromDate) : retentionCutoff,
    ...(toDate ? { lte: new Date(`${toDate}T23:59:59Z`) } : {}),
  },
};

// ❌ no floor → old rows queryable until the job happens to run
const where = { createdAt: { gte: fromDate ? new Date(fromDate) : undefined } };
```

## Checklist

- [ ] Logs written **after** the primary operation succeeds (except export routes, which log before streaming)
- [ ] Critical paths (login/logout) use `.catch(() => {})`, not a bare `await`
- [ ] Every action comes from a constant in `lib/audit-actions.ts` — no raw strings
- [ ] `detail` is structured JSON · no passwords/secrets/tokens · no over-broad PII
- [ ] Viewer query: guarded by `audit-logs:read` · username search resolves to userIds (sentinel only needed on raw-SQL paths) · batch name enrichment · pageSize clamped · retention cutoff enforced
- [ ] No code UPDATEs or DELETEs `ActivityLogs`
- [ ] A scheduled cleanup job exists and the retention window is documented in the project
