# Naming Conventions — SQL Server (full version)

Naming standards for every object type in org databases. The Prisma examples
illustrate the reference implementation.

## 1. Tables

**Real DB: PascalCase plural — Prisma model: camelCase singular + `@@map()` always**

```prisma
model rolePermission {
  // ...
  @@map("RolePermissions")   // ✅ PascalCase plural
}
```

| ✅ | ❌ |
| --- | --- |
| `@@map("Users")` | `@@map("user")` |
| `@@map("RolePermissions")` | `@@map("rolePermission")` |
| `@@map("HolidayItems")` | `@@map("holiday_items")` |

### Read-only tables populated by external systems

Tables that a **SQL Server Agent Job / ETL / external SP** INSERTs into (the
app only reads) take a group prefix such as `<EXT>_` (pick one short prefix per
project and keep it fixed):

- `<EXT>_WeeklySummary`, `<EXT>_AccessDetail` → SELECT-only from the app side
- App-owned tables (the app may write) → **no prefix** — `HolidayLists`, `AppSettings`
- The prefix is an ownership signal: see the prefix = never write; to adjust a
  value, create an app-side override table

**Append-only override pattern** (when the read-only source is re-populated daily):
create an app-side `*Overrides` table; never update/delete existing rows —
always insert a new one; at read time a central resolver picks the latest
`CreatedAt` row and overlays it on the raw value.

## 2. Columns

**Real DB: PascalCase — Prisma field: camelCase + `@map()` on every field**

```prisma
model user {
  id        String   @id @default(cuid()) @map("Id")
  empCode   String?                       @map("EmpCode")
  createdAt DateTime @default(now())      @map("CreatedAt")
  updatedAt DateTime @updatedAt           @map("UpdatedAt")
  @@map("Users")
}
```

### Standard audit columns

App-owned master / transaction tables must carry this set:

| Column | Type (Prisma) | Notes |
| --- | --- | --- |
| `Id` | `String @id @default(cuid())` or `Int @id @default(autoincrement())` | PK is always named `Id` |
| `CreatedAt` | `DateTime @default(now())` | |
| `UpdatedAt` | `DateTime @updatedAt` | |
| `CreatedBy` | `String` | user id / login of the creator |
| `UpdatedBy` | `String?` | nullable — a new row has never been edited |
| `IsActive` | `Boolean @default(true)` | enable/disable (master data) |
| `IsDeleted` | `Boolean @default(false)` | soft delete — never hard-delete data that needs history |

Key/value or log tables whose semantics don't cover the full set (e.g. settings
that only ever get edited) may trim to the meaningful subset
(`UpdatedAt`/`UpdatedBy`) — but never rename the columns.

### T-SQL reserved words — never as column names

Fix by **adding a qualifier**, not by hiding behind `[brackets]`. Frequent
offenders:

| Reserved | Use instead (per context) | Why |
| --- | --- | --- |
| `key` | `SettingKey`, `BucketKey`, `PermKey` | `KEY` is a reserved keyword |
| `value` | `SettingValue`, `VerificationValue` | `VALUE` is semi-reserved |
| `group` | `GroupName` | `GROUP` (GROUP BY) |
| `count` | `RequestCount`, `ItemCount` | `COUNT` is an aggregate function |
| `order` | `SortOrder` | `ORDER` (ORDER BY) |
| `day`, `month`, `year` (careful) | `DayOfMonth`, `MonthName` | `DAY()`/`MONTH()`/`YEAR()` are built-in functions — bare `Year` is fine, but qualify when paired with another function name |
| `user`, `session` (table names) | Fine when quoted via Prisma, but plurals (`Users`, `Sessions`) avoid the clash altogether | |

In the schema, annotate every reserved-word workaround:

```prisma
key   String @unique @map("PermKey")   // KEY is T-SQL reserved
group String         @map("GroupName") // GROUP is T-SQL reserved
```

### Common type mappings

| Data | Prisma attribute |
| --- | --- |
| Long text / JSON blob | `@db.NVarChar(Max)` |
| Thai text (bounded length) | `@db.NVarChar(200)` etc. — always `NVarChar` when Thai is involved |
| Codes | `@db.NVarChar(50)` |
| Decimals (days/hours) | `@db.Decimal(5, 1)` per actual precision |
| Date only (no time) | `DateTime @db.Date` |

## 3. Stored Procedures

- Prefix **`usp_`** + PascalCase naming the action: `usp_RecalculateWeeklySummary`, `usp_DumpAccessDetail`
- Never `sp_` (collides with SQL Server system procedures and gets the master
  DB scanned first)
- SPs reading app-table config must use the real column names, e.g.
  `SELECT SettingValue FROM dbo.AppSettings WHERE [SettingKey] = '...'` —
  column names must stay in sync with `@map()` in the schema

## 4. Functions / Views

| Kind | Prefix | Example |
| --- | --- | --- |
| Scalar / table-valued function | `fn` | `fnGetScheduleActual(@EmpCode)` |
| View | `vw` | `vwEmployee` |

Views on a linked server are always read-only (see `raw-sql-and-sp.md`).

## 5. Indexes / Constraints (when writing migration SQL by hand)

Follow the shapes Prisma generates, for consistency:

- PK: `<Table>_pkey` — `CONSTRAINT [HolidayLists_pkey] PRIMARY KEY CLUSTERED ([Id])`
- Default: `<Table>_<Column>_df` — `CONSTRAINT [HolidayLists_IsActive_df] DEFAULT 0`
- FK: `<Table>_<Column>_fkey`
- Filtered unique index (hand-written): `UX_<Table>_<Columns>_<condition>`
