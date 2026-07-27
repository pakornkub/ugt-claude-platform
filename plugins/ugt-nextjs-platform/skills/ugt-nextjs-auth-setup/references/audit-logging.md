# Audit Logging — ActivityLogs (org contract item 4)

The `ActivityLogs` table is **append-only**: who did what, when. Every project
must have it. The schema ships in `assets/schema-auth.prisma` — this file
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

## Schema (already in `assets/schema-auth.prisma`)

```prisma
model activityLog {
  id        Int      @id @default(autoincrement()) @map("Id")
  userId    String   @map("UserId")   // no FK — users can be deleted; history must survive
  action    String   @map("Action")   // dot-namespaced: "users.delete", "export.excel"
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

```ts
// lib/audit-actions.ts
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGOUT: 'logout',
  LOGOUT_SSO: 'logout.sso',
  USERS_CREATE: 'users.create',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.resetPassword',
  ROLES_UPDATE: 'roles.update',
  EXPORT_EXCEL: 'export.excel',
  SETTINGS_UPDATE: 'settings.update',
} as const;
```

The first four are **org-mandated** (contract item 4) — `assets/lib-auth.ts`
and `assets/lib-actions-auth.ts` already write them. Add the rest per the
project's domain.

```ts
// ✅ dot-namespaced, precise
'users.delete'  ·  'export.excel'  ·  'settings.update'

// ❌ vague / un-namespaced
'export'  ·  'update'  ·  'changed settings'
```

## Write pattern

### Sequential (default) — log after the primary operation succeeds

```ts
export async function deleteUserAction(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.USERS_DELETE)) {
    return { success: false, error: 'Forbidden' };
  }

  // 1. Primary operation first
  await prisma.user.delete({ where: { id: userId } });

  // 2. Audit log after success
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: AUDIT_ACTIONS.USERS_DELETE,
      detail: JSON.stringify({ targetUserId: userId }),
    },
  });

  return { success: true };
}
```

```ts
// ❌ reversed order — logs an operation that hasn't happened (or failed)
await prisma.activityLog.create({ ... });
await prisma.user.delete({ ... });
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

## Viewer API

```ts
// app/api/audit-logs/route.ts
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.AUDIT_LOGS_READ)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20', 10)));

  // Username search: resolve to userIds first (never LIKE on userId)
  let userIdFilter: string[] | undefined;
  if (username) {
    const matching = await prisma.user.findMany({
      where: { OR: [{ name: { contains: username } }, { ldapUsername: { contains: username } }] },
      select: { id: true },
    });
    // Sentinel: when nobody matches, the result must be forced empty
    userIdFilter = matching.length > 0 ? matching.map((u) => u.id) : ['__no_match__'];
  }

  const [logs, totalItems] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.activityLog.count({ where }),
  ]);

  // Enrich user names in one batch — no N+1
  const uniqueUserIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, name: true, ldapUsername: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    success: true,
    data: logs.map((l) => ({
      ...l,
      detail: l.detail ? JSON.parse(l.detail) : null,
      userName: userMap.get(l.userId)?.ldapUsername ?? userMap.get(l.userId)?.name ?? l.userId,
    })),
    pagination: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
  });
}
```

**Why the `'__no_match__'` sentinel** — when a username search matches nobody
and you pass `userId: { in: [] }`, some query paths treat that as "no filter"
and return every row. A non-existent id forces a correctly empty result.

Required permission in `lib/permissions.ts`: `AUDIT_LOGS_READ: 'audit-logs:read'`
(guards both the viewer page and the API route — see `rbac.md`).

## Retention

- Define a minimum retention window in the project docs (e.g. 180 days)
- The schema has no `expiresAt`/soft-delete → use a DB-side scheduled job:

```sql
-- SQL Agent job
DELETE FROM ActivityLogs WHERE CreatedAt < DATEADD(day, -180, GETDATE());
```

- **Never delete rows from application code**

### The viewer API must also enforce the cutoff in its WHERE clause

The cleanup job runs on a schedule — between runs, stale rows still exist. The
API must filter at query time too, or data declared "kept 180 days" stays
readable longer:

```ts
// ✅ the API enforces the 180-day floor regardless of the job schedule
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
- [ ] Viewer API: guarded by `audit-logs:read` · sentinel on empty username search · batch name enrichment · retention cutoff enforced
- [ ] No code UPDATEs or DELETEs `ActivityLogs`
- [ ] A scheduled cleanup job exists and the retention window is documented in the project
