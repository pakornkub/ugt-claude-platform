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
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/0_init/migration.sql
   npx prisma migrate resolve --applied 0_init
   ```

4. To rename existing DB objects into convention → use the `sp_rename`
   technique from section 3
