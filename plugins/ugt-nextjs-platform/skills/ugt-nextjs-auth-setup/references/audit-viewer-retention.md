# Audit Logging — viewer and retention

Reading `ActivityLogs` (the `/admin/audit-logs` viewer query rules) and keeping it bounded (retention purge + the viewer floor) — moved out of `audit-logging.md`.

Contents: §Viewer (server component — no API route) · §Retention (+ the viewer query floor).

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
- The schema has no `expiresAt`/soft-delete → purge on a schedule. Scheduling is
  **host cron only** (org decision 2026-10-09 — no SQL Agent job): the delete
  lives in a stored procedure, and a cron route calls it
  (cicd-setup `references/scheduled-jobs.md`):

```sql
CREATE OR ALTER PROCEDURE usp_PurgeActivityLogs @Days INT = 180 AS
  SET NOCOUNT ON;
  DELETE FROM ActivityLogs WHERE CreatedAt < DATEADD(day, -@Days, GETDATE());
  SELECT @@ROWCOUNT AS Deleted;
```

```ts
// app/api/cron/audit-retention/route.ts — body of the scheduled-jobs.md route
const [{ Deleted }] = await prisma.$queryRaw<{ Deleted: number }[]>`EXEC usp_PurgeActivityLogs @Days = 180`;
```

- **That route is the only code path that deletes audit rows** — no delete
  action, button or API anywhere else

### Once the window is fixed, the viewer query enforces it too

The shipped `audit-logs/page.tsx` has **no** retention floor — the window is a
per-project decision. When the project documents one, add the floor to the
page (or API) WHERE clause as well: the cleanup job runs on a schedule, and
between runs stale rows stay readable:

```ts
// ✅ the query enforces the floor regardless of the job schedule
const retentionCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
const where = {
  createdAt: {
    // a fromDate older than the cutoff must not reopen expired rows
    gte: fromDate
      ? new Date(Math.max(new Date(`${fromDate}T00:00:00+07:00`).getTime(), retentionCutoff.getTime()))
      : retentionCutoff,
    ...(toDate
      ? { lt: new Date(new Date(`${toDate}T00:00:00+07:00`).getTime() + 86_400_000) }
      : {}),
  },
};

// ❌ no floor → old rows queryable until the job happens to run
const where = { createdAt: { gte: fromDate ? new Date(fromDate) : undefined } };
```
