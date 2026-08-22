---
name: ugt-nextjs-database-setup
description: >
  Use when a project needs SQL Server through Prisma — "ต่อ database", "ใช้ SQL
  Server", "ตั้ง prisma", "ยังไม่มี DB เลย" — or when designing any new table,
  column, stored procedure, view, or migration in an org project, because the
  naming convention and audit columns here are mandatory and expensive to change
  after data exists. Also use when writing raw SQL / `EXEC usp_*` calls, reading
  across a linked server, setting up type-safe env validation, or debugging MSSQL
  migration problems (column renames that would drop data, filtered unique
  indexes Prisma can't express, `url` in the wrong place breaking generate).
  Load it before touching `prisma/schema.prisma` even for a one-field change —
  a column that collides with a T-SQL reserved word or misses an audit column
  costs a data migration later.
  Don't use for the auth/RBAC tables themselves (→ ugt-nextjs-auth-setup) or CI
  (→ ugt-nextjs-cicd-setup).
---

# UGT Database Setup — SQL Server via Prisma

## Overview

This skill wires SQL Server into a project that has no DB yet (often
AI-generated) per org standards: connection through `@prisma/adapter-mssql`,
table/column/SP/function naming conventions, env validation via t3-env, and
safe raw-SQL patterns. Deep detail lives in `references/` — starter code in
`assets/`.

## Org Standards

Database-level standards every project shares:

| Named object | Convention | Example |
| --- | --- | --- |
| Table (app-owned) | **PascalCase plural**, no prefix | `Items`, `LeaveRequests`, `AppSettings` |
| Read-only table (external system dumps) | group prefix `__EXT___` | `__EXT___WeeklySummary` |
| Column | **PascalCase** | `Id`, `CreatedAt`, `EmpCode` |
| Stored procedure | `usp_*` (PascalCase after) | `usp_RecalculateWeeklySummary` |
| Function (scalar/TVF) | `fn*` | `fnGetScheduleActual` |
| View | `vw*` | `vwEmployee` |
| T-SQL reserved words | **never as column names** — add a qualifier | `key`→`SettingKey`, `group`→`GroupName` |

**Standard audit columns** — app-owned master/transaction tables must carry:
`Id`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsActive`, `IsDeleted`
(soft delete — never hard-delete data that needs history)

**Read-only rule**: tables prefixed `__EXT___` and views/tables on a linked
server are SELECT-only, always — no INSERT/UPDATE/DELETE from the app; to
adjust values, create an app-side override table and overlay at read time.

Full detail (reserved-word table, rationale per rule) → `references/naming-conventions.md`

## Interview — ask the user before starting (one batch)

1. **Database name**, and does it already exist? (existing → introspect /
   `migrate resolve`; new → `migrate dev` from the start)
2. **Server/instance + port** — this skill wires ONE `DATABASE_URL`
   (`.env.local` = the dev/local DB); the dev/prod split arrives later with
   cicd-setup §4.5 (`env-<project>` / `env-<project>-dev` credentials), so
   don't ask "separate dev and prod?" here — nothing in this skill consumes
   the answer
3. Will it call **stored procedures** or read across a **linked server**?
   (affects the raw-SQL patterns — and `requestTimeout`: the copied
   `lib/prisma.ts` ships 5 นาที for long SPs; **no SPs → lower it to the
   mssql default 15s** in that file, a hung query should fail fast)

## Setup Steps

### 1. Install dependencies

```bash
npm install @prisma/client @prisma/adapter-mssql @t3-oss/env-nextjs zod
npm install --save-dev prisma tsx dotenv
```

### 2. Copy assets and substitute placeholders

| Asset | Destination |
| --- | --- |
| `assets/prisma.config.ts` | `prisma.config.ts` |
| `assets/prisma/schema-skeleton.prisma` | `prisma/schema.prisma` |
| `assets/lib/prisma.ts` | `lib/prisma.ts` |
| `assets/lib/env.ts` | `lib/env.ts` |
| `assets/env.example` | `.env.example` (+ copy to `.env.local` and fill real values) |
| `assets/rules/ugt-nextjs-database.md` | `.claude/rules/ugt-nextjs-database.md` (whole-file overwritable on plugin update) |

**Keep the env files distinct**: `.env.example` = generic placeholders only
(committable) · `.env.local` = real values (never committed) — the values from
the placeholder table below go into `.env.local` only.

**All placeholders to substitute:**

| Placeholder | Meaning |
| --- | --- |
| `__DB_HOST__` | SQL Server hostname/IP |
| `__DB_PORT__` | port (usually `1433`) |
| `__DB_NAME__` | database name |
| `__DB_USER__` | SQL login |
| `__DB_PASSWORD__` | password (`.env.local` only — never committed) |
| `__PROJECT_NAME__` | project name (used in comments/app name) |
| `__EXT__` | prefix of read-only tables populated externally (if any) |
| `__LINKED_SERVER__` | linked-server name — **no database asset contains it**; it lives in auth-setup's `lib/directory.ts` (same value there). Kept in this table so the interview answer is recorded once |

> If the project has **no** external read-only tables / linked server →
> **delete the related comment lines** from the copied files (e.g. the `__EXT___`
> comment at the top of `schema.prisma`) — never leave `__EXT__` /
> `__LINKED_SERVER__` placeholders dangling.

### 3. Critical rules (break these and generate/build fails)

- **`url` lives in `prisma.config.ts` only** — never put `url` in the
  `datasource` block of `schema.prisma` (Prisma 7 + driver adapter fails)
- The generator must be **`provider = "prisma-client-js"`** — not
  `"prisma-client"` (the latter has no MSSQL driver adapter)
- **`import type sql from 'mssql'`** only — a value import breaks TypeScript
  (only the `sql.config` type is needed)
- Never touch `process.env` directly in app code — always import from
  `@/lib/env` (exception: `prisma.config.ts`, which runs outside the app)
- **Run `npx prisma generate` after every `prisma migrate dev`** and after
  every schema change

### 4. Build the schema + migrate

1. Write models per the skeleton's conventions (model camelCase →
   `@@map("PascalCasePlural")`, field camelCase → `@map("PascalCase")`, full
   audit columns)
2. `npx prisma migrate dev --name init`
3. `npx prisma generate`
4. Check for reserved words before every migrate → `references/naming-conventions.md`

Advanced migration work (data-preserving column renames via `sp_rename`,
filtered unique indexes Prisma can't express, deploy flow) →
`references/migrations.md`

### 5. Raw SQL / stored procedures (if the project needs them)

Mandatory pattern: **sanitize before parameterize, always**; call SPs with
`` $executeRaw`EXEC usp_Name ${p1}, ${p2}` ``; linked server = SELECT-only →
`references/raw-sql-and-sp.md`

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| `url` in `prisma.config.ts` only | `url` in the `schema.prisma` datasource |
| `provider = "prisma-client-js"` | `provider = "prisma-client"` |
| `import type sql from 'mssql'` | `import sql from 'mssql'` (value import) |
| `import { env } from '@/lib/env'` | raw `process.env.*` in app code |
| `@@map("PascalCasePlural")` on every model | camelCase table names leaking from models |
| `@map("PascalCase")` on every field | camelCase columns / reserved words (`key`, `group`) |
| sanitize regex before interpolating into `$queryRaw` | hand-built SQL strings / skipped sanitize |
| `` $executeRaw`EXEC usp_X ${a}, ${b}` `` (parameterized) | `$executeRawUnsafe` with user input |
| soft delete (`IsDeleted = 1`) | hard-deleting data that needs history |
| `npx prisma generate` after every migrate | leaving the generated client stale |

## Verification Checklist

**Run the script first** (cwd = target project root, path points into this
skill's folder):

```bash
node <skill-dir>/scripts/verify.mjs
```

It covers every machine-checkable item below automatically (exit 1 on
failure) — the rest must be run by hand:

- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` passes (and is re-run after every migrate)
- [ ] `schema.prisma` has no `url` in the datasource; `prisma.config.ts` has it
- [ ] no direct `process.env` reads outside `lib/env.ts` / `prisma.config.ts`
- [ ] every model has `@@map("PascalCasePlural")` and every field
      `@map("PascalCase")` — except the auth/RBAC tables installed by
      `ugt-nextjs-auth-setup`, which map **singular** as a set: `User`, `Session`,
      `Account`, `Verification`, `RateLimit`, `Role`, `Permission`,
      `RolePermission` (the five are Better Auth's own convention; the last
      three share the form because they live in the same file and are read
      together) — the only plural in that set is `ActivityLogs`
- [ ] no column name collides with a T-SQL reserved word (check against
      `references/naming-conventions.md`)
- [ ] master/transaction tables carry the full audit columns
      (`Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/IsActive/IsDeleted`)
- [ ] all raw SQL: sanitize + parameterize; no mutations against read-only
      tables/views
- [ ] `.env.local` is not committed; `.env.example` has all placeholders
- [ ] build passes with no live DB (`SKIP_ENV_VALIDATION=1` + the build guard
      in `lib/prisma.ts`)
