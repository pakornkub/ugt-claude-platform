# Migrations — Prisma + MSSQL

## 1. Normal flow

```bash
# Dev — create a new migration from the schema diff
npx prisma migrate dev --name <snake_case_description>
npx prisma generate        # mandatory after every migrate — the generated client goes stale

# Prod / CI — apply existing migrations, create nothing new
npx prisma migrate deploy
```

- `DATABASE_URL` is read through `prisma.config.ts` (dotenv loads `.env.local`
  before `.env`)
- Seed: define in `prisma.config.ts` → `migrations.seed: 'npx tsx prisma/seed.ts'`
  then run `npx prisma db seed`
- Symptom "build reports dozens of implicit `any` from Prisma callbacks" =
  stale generated client → run `npx prisma generate` before chasing individual
  type errors

### 1.1 The shadow database — read this before the first `migrate dev`

`prisma migrate dev` (only `dev`; `deploy` never does this) needs a **second,
throwaway database**: it replays every migration there to detect drift and to
diff the schema. By default it tries to `CREATE DATABASE` / `DROP DATABASE` one
next to `DATABASE_URL`.

**On the org's shared SQL Server that fails unless the login may create
databases**, and it is the first thing a new project hits: rights granted
inside the project database (`db_datareader` · `db_datawriter` ·
`db_ddladmin` · `EXECUTE`) do not include `CREATE DATABASE` on the instance.
The error names permissions, not the shadow DB, so it reads like a wrong
password or a missing grant on the project database.

**Org rule (2026-11-16) — no pre-created shadow database, no
`SHADOW_DATABASE_URL` / `shadowDatabaseUrl`.** The DBA grants the project
login **`dbcreator` on the dev server only** (admin-handoff table A), and
`migrate dev` creates and drops its own temporary shadow DB each run.
`prisma.config.ts` carries `url` only. Production needs no extra right:
`migrate deploy` never uses a shadow database.

So when the first `migrate dev` fails with a permission error: check that the
login really has `dbcreator` on the **dev** server (`SELECT IS_SRVROLEMEMBER('dbcreator')`
→ `1`) before suspecting the password. Never run `migrate dev` against prod.

## 2. Hand-written migration SQL — always wrap in a transaction

Hand-written migrations use the same frame Prisma generates:

```sql
BEGIN TRY
BEGIN TRAN;

-- ... DDL/DML ...

COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
  THROW;
END CATCH;
```

## 3. Renaming columns/tables with `sp_rename` (no data loss)

**Problem:** change `@map()` in the schema and let Prisma diff it — Prisma sees
**DROP old column + ADD new column = data gone**.

**Correct approach:** a hand-written migration using `EXEC sp_rename`
(in-place rename):

```sql
-- migration.sql (new migration folder with a hand-set timestamp, e.g. 20260501000000_rename_columns)
BEGIN TRY
BEGIN TRAN;

EXEC sp_rename 'dbo.Items.id',        'Id',        'COLUMN';
EXEC sp_rename 'dbo.Items.createdAt', 'CreatedAt', 'COLUMN';
-- reserved word → qualifier added, with a comment
EXEC sp_rename 'dbo.Items.key',       'ItemKey',   'COLUMN'; -- key → ItemKey (KEY is T-SQL reserved)

COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH;
```

**Apply steps:**

1. Update `@map()`/`@@map()` in `schema.prisma` to the new names
2. Run the SQL above in SSMS (or `sqlcmd`) directly against the target database
3. Tell Prisma the migration is applied — **never** let `migrate dev` run it:

   ```bash
   npx prisma migrate resolve --applied 20260501000000_rename_columns
   ```

4. `npx prisma generate`

Note: the message "Caution: Changing any part of an object name could break
scripts and stored procedures" from `sp_rename` is informational, not an
error — but the warning is real: any SP/view referencing the old name must be
updated too.

## 4. Filtered (partial) unique indexes — the limitation

The Prisma schema **cannot express MSSQL filtered unique indexes**
(e.g. "unique `Year` only where `IsDeleted = 0`", or "one active row per
year"). Two options:

**Option A — write the index in hand-written migration SQL** (enforced at the DB):

```sql
CREATE UNIQUE NONCLUSTERED INDEX [UX_HolidayLists_Year_NotDeleted]
  ON [dbo].[HolidayLists]([Year])
  WHERE [IsDeleted] = 0;
```

- Put it in a (hand-written) migration folder — Prisma won't know the index but
  won't drop it either
- Caveat: the next `migrate dev` may warn about drift — always inspect the diff
  before applying
- The predicate takes only simple comparisons joined by `AND` (see §6) — no `NOT IN`,
  `OR`, `LIKE` or functions

**Option B — enforce at the application layer** (what the reference project chose):

- Wrap the logic in `prisma.$transaction`, e.g. activating a new year =
  de-activate all existing rows, then activate the target row, in one transaction
- Annotate the schema with where the constraint is enforced:

  ```prisma
  // Partial unique constraints (year uniqueness, max-1 active per year) are
  // enforced at the application layer; MSSQL filtered indexes cannot be
  // expressed in Prisma schema migrations.
  ```

Choose A when there are multiple writers (SPs/jobs writing the same table);
choose B when the app is the only writer and you want controllable error
messages.

## 5. Existing databases (brownfield)

1. `npx prisma db pull` to introspect → models with raw names
2. Refactor models/fields to camelCase + `@map()`/`@@map()` per convention
   (DB names unchanged — only the Prisma side changes)
3. Create a baseline migration and mark it applied:

   ```bash
   # --to-schema, not --to-schema-datamodel: the old flag was removed in Prisma 7
   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma \
     --script > prisma/migrations/0_init/migration.sql
   npx prisma migrate resolve --applied 0_init
   ```

   Two traps (eval run 2026-09-11): **(a)** anything `prisma.config.ts` prints
   lands in that file — the kit asset loads dotenv with `quiet: true` for this
   reason; a project whose config still calls `config()` bare gets dotenv 17's
   `◇ injected env …` lines at the top of `migration.sql` and `migrate deploy`
   fails on them. Open the file and check it starts with SQL. **(b)** this
   baseline is bookkeeping for `migrate resolve` only — **never execute it
   against the existing database**; the tables are already there.
   **(c)** `migrate diff` writes `migration.sql` only — no
   `migration_lock.toml`. When the baseline is created offline (brownfield
   before `migrate resolve`, or a greenfield project whose DB server does not
   exist yet and will be migrated by the pipeline's `migrate deploy`), write
   the lock file by hand with **`provider = "mssql"`** — Prisma 7's internal
   name — not the schema's `"sqlserver"`. With `"sqlserver"` every
   `migrate deploy` stops at **P3019** *"The datasource provider `mssql`
   specified in your schema does not match the one specified in the
   migration_lock.toml, `sqlserver`"* — and the error tells you to delete the
   migration history, which you must not do:

   ```toml
   # prisma/migrations/migration_lock.toml
   # Please do not edit this file manually
   # It should be added in your version-control system (e.g., Git)
   provider = "mssql"
   ```

4. To rename existing DB objects into convention → use the `sp_rename`
   technique from section 3

## 6. Filtered index `WHERE` takes only simple comparisons — `NOT IN` fails at deploy

**Symptom.** A hand-written migration with `CREATE UNIQUE INDEX … WHERE [Status] NOT IN (REJECTED,CANCELLED)` fails on `migrate deploy` with `P3018` / `Database error code: 102` / `Incorrect syntax near NOT`. Every later deploy against that database fails too.

**Root cause.** SQL Server accepts only simple predicates in a filtered index `WHERE`: `=`, `<>`, `IN (…)`, `IS [NOT] NULL`, joined by `AND`. `NOT IN`, `OR`, `LIKE` and functions are rejected at parse time. The batch fails as a whole, so no index is created, and `_prisma_migrations` records the migration as failed.

**Fix.** Write the exclusion with `<>` and `AND`:

```sql
CREATE UNIQUE NONCLUSTERED INDEX [UX_Requests_Source_Active]
  ON [dbo].[Requests]([EmpCode], [RequestDate])
  WHERE [Source] = AUTO AND [Status] <> REJECTED AND [Status] <> CANCELLED;
```

Before merge, parse-check every hand-written DDL without running it:
`SET NOEXEC ON; <DDL>; SET NOEXEC OFF;`. If a shared database already recorded the failed migration,
run `npx prisma migrate resolve --rolled-back <migration_name>`, then push the fixed file.

**Origin.** ugt-hrms · 2026-11-22
