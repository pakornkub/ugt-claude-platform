---
paths:
  - "prisma/**"
  - "prisma.config.ts"
  - "lib/prisma.ts"
  - "lib/env.ts"
  - "lib/actions/**"
---

<!-- Owned by ugt-database-setup — may be overwritten wholesale on /plugin update.
     Project-specific rules belong in a separate .claude/rules/<project>-*.md file, not here. -->

# Database rules (loads when touching schema / prisma / env / server actions)

## Connection

- `url` lives in `prisma.config.ts` **only** — putting it in the `datasource`
  block of `schema.prisma` makes Prisma 7 + driver adapter fail immediately
- The generator must be `provider = "prisma-client-js"` — `"prisma-client"` has no MSSQL driver adapter
- `import type sql from 'mssql'` only (a value import breaks TypeScript — only the `sql.config` type is needed)
- Set `requestTimeout` once in the adapter config for the whole app, not per call site

## Naming (machine-checked by ugt-database-setup's `verify.mjs`)

| Object | Convention |
| --- | --- |
| App-owned table | PascalCase **plural** — `@@map("Items")` |
| Column | PascalCase — `@map("CreatedAt")` |
| Stored procedure | `usp_PascalCase` (never `sp_` — collides with SQL Server system procedures) |
| Function / View | `fn*` / `vw*` |

**Single exception**: the auth/RBAC tables installed by `ugt-auth-setup` map to
**singular** names (`User`, `Session`, `Account`, `Verification`, `RateLimit`,
`Role`, `Permission`, `RolePermission`) with `ActivityLogs` as the one plural —
do not "fix" them.

**Never use a T-SQL reserved word as a column name** — `key`→`SettingKey`,
`value`→`SettingValue`, `group`→`GroupName`, `count`→`ItemCount`,
`order`→`SortOrder` (add a qualifier; don't hide behind `[brackets]`)

## Audit columns

App-owned master/transaction tables must carry the full set:
`Id`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsActive`, `IsDeleted`

- Delete data that needs history via **`IsDeleted = 1`**, never hard delete
- Lookup/join tables may be exempt, but record the exemption in
  `.claude/state/project-notes.md` → Deviations

## Migration

1. Edit `schema.prisma`
2. `npx prisma migrate dev --name <describes_the_change>`
3. **`npx prisma generate`** ← skip this and the generated types go stale,
   producing build failures that are hard to trace

Column renames need a hand-written migration using `sp_rename` — letting Prisma
diff it produces drop+add and loses the column's data.

## Raw SQL

- **Sanitize with a regex first, then parameterize** (always both layers)
- Call SPs with tagged templates: `` prisma.$executeRaw`EXEC usp_Name ${a}, ${b}` ``
- **Never** `$queryRawUnsafe` / `$executeRawUnsafe` with user-supplied input
- External tables/views and linked servers are **SELECT-only** — no INSERT/UPDATE/DELETE
- `CAST()` every column selected across a linked server (type metadata is unreliable)
- `COUNT(*)` comes back as `number|bigint` depending on driver → always wrap in `Number()`

## Env

- Never read `process.env` directly in app code — `import { env } from '@/lib/env'`
  (exceptions: `lib/env.ts`, root `*.config.ts`, `instrumentation*.ts`, `sentry.*.config.ts`, test files)
- `.env.example` = committed placeholders only · `.env.local` = real values, never committed
