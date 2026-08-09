# Raw SQL & Stored Procedures — MSSQL via Prisma

Patterns for what normal Prisma Client queries can't do: reading across a
linked server, calling stored procedures, paginating over external views.

## 1. Iron rule: sanitize → parameterize (both layers, always)

`$queryRaw` tagged templates already parameterize, but the org standard
requires **regex-sanitizing input first** as defense-in-depth (against
injection that slips in through a later refactor, and against garbage values
that break the query):

```ts
export async function getRecordByCode(code: string): Promise<Row | null> {
  // Layer 1: sanitize — allow only alphanumerics + _ . -
  if (!/^[a-zA-Z0-9_.-]+$/.test(code)) {
    throw new Error('Invalid code format');
  }

  // Layer 2: parameterize — tagged template → a real sp_executesql parameter
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT TOP 1
      CAST(u.Code     AS VARCHAR(50))    AS Code,
      CAST(u.NameThai AS NVARCHAR(100))  AS NameThai
    FROM __LINKED_SERVER__.<db>.dbo.<view> AS u
    WHERE u.Code = ${code}
  `;
  return rows[0] ?? null;
}
```

- **Never** `$queryRawUnsafe` / `$executeRawUnsafe` with user-supplied values
- Lookups that may fail non-critically → return `null`/`[]` in `catch`
  (a downed linked server must not block the main flow) — functions that must
  fail loud → throw

## 2. Linked-server read-only view pattern

For projects reading master data from another DB over a linked server:

- Use the full 4-part name: `__LINKED_SERVER__.<db>.dbo.<view>`
- **Strictly SELECT-only** — never INSERT/UPDATE/DELETE across a linked server
- **`CAST(...)` every selected column** — type metadata across a linked server
  is unreliable (Thai columns → `NVARCHAR(n)`, codes → `VARCHAR(n)`, dates →
  `CONVERT(VARCHAR(10), x, 23)` gives `yyyy-MM-dd`)
- **Avoid recursive CTEs across a linked server** — pull the whole edge list
  once and compute (BFS/graph) in JS instead
- Columns older view versions may lack → try the full query in `try`, `catch`
  and fall back to a base-columns query (missing columns become `CAST(NULL AS ...)`)

### Search with LIKE

```ts
const term = `%${query.trim()}%`;   // wildcards on the JS side — the term itself stays a parameter
const rows = await prisma.$queryRaw<Row[]>`
  SELECT TOP 50 ...
  FROM __LINKED_SERVER__.<db>.dbo.<view> AS u
  WHERE u.LoginName LIKE ${term} OR u.NameThai LIKE ${term}
  ORDER BY u.NameEng
`;
```

Always bound the result set (`TOP 50`) against payload bloat.

### Pagination (OFFSET/FETCH + parallel COUNT)

```ts
const offset = (page - 1) * pageSize;
const [rows, countResult] = await Promise.all([
  prisma.$queryRaw<Row[]>`
    SELECT ...
    FROM __LINKED_SERVER__.<db>.dbo.<view> AS u
    WHERE u.OrgCode = ${orgCode}
    ORDER BY u.NameEng
    OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
  `,
  prisma.$queryRaw<[{ total: number }]>`
    SELECT COUNT(*) AS total
    FROM __LINKED_SERVER__.<db>.dbo.<view> AS u
    WHERE u.OrgCode = ${orgCode}
  `,
]);
return { data: rows, total: Number(countResult[0]?.total ?? 0), page, pageSize };
```

Note: `COUNT(*)` comes back as `number|bigint` depending on the driver —
always wrap in `Number()`.

## 3. Calling stored procedures (`EXEC usp_*`)

Use `$executeRaw` tagged templates — every argument becomes a real parameter,
no string concatenation:

```ts
try {
  await prisma.$executeRaw`EXEC usp_RecalculateWeeklySummary ${weekNo}, ${weekYear}`;
} catch (err) {
  // Log details server-side for the DBA — never return raw SQL errors to the client
  console.error('[recalculate] SP error:', err instanceof Error ? err.message : err);
  return { success: false, error: 'SP_ERROR' };
}
```

Standard frame when called from a Server Action (mutation):
session guard → permission check → validate input (Zod) → `EXEC` → audit log

## 4. requestTimeout for long-running SPs

The `mssql` default timeout is 15 seconds — heavy recalculation/dump SPs get
cut off. Set it in the adapter config (see `assets/lib/prisma.ts`):

```ts
return {
  server, port, database, user, password,
  options: { encrypt, trustServerCertificate },
  // allow for long stored procedures (e.g. weekly recalculation), up to 5 minutes
  requestTimeout: 5 * 60 * 1000,
};
```

Set it once for the whole app — never per call site (the adapter config is the
single place).

## 5. SQL fragment helpers (Prisma v7)

For dynamic fragment composition, don't import from `@prisma/client` — use the
runtime helpers:

```ts
import { sqltag, join, empty, raw, type Sql } from '@prisma/client/runtime/client';
```

(`raw()` only with hardcoded/allowlisted values — never with user input.)

## 6. MSSQL `TIME` column gotcha

The `mssql` driver maps SQL `TIME(0)` columns to a JS `Date` anchored at
`1970-01-01` with **the wall-clock value in the UTC part** — reading it with
local getters (`getHours()`, `toLocaleString()`) shifts it by the machine's
timezone → write one central formatter that reads via
`getUTCHours()`/`getUTCMinutes()` and force every call site to format through
it at the data layer, before the UI.
