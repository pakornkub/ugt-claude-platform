# Contract — Database (SQL Server, stack-agnostic)

Normative source for every stack platform. Stack skills restate these rules in
their own ORM's terms (Prisma `@@map`, SQLAlchemy `__tablename__`, …) — this
file is what a PR changes first when the standard itself changes.

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-database-setup` (primary), `ugt-nextjs-setup` (summary), and
> `ugt-nextjs-pitfalls` (gotchas). Bump the platform's `plugin.json` version
> and CHANGELOG when you do.

## Naming

| Object | Convention | Example |
| --- | --- | --- |
| Table (app-owned) | **PascalCase plural**, no prefix | `Items`, `LeaveRequests`, `AppSettings` |
| Read-only table (external system populates) | group prefix `<EXT>_` | `<EXT>_WeeklySummary` |
| Column | **PascalCase** | `Id`, `CreatedAt`, `EmpCode` |
| Stored procedure | `usp_*` (PascalCase after; never `sp_` — collides with system procedures) | `usp_RecalculateWeeklySummary` |
| Function (scalar/TVF) | `fn*` | `fnGetScheduleActual` |
| View | `vw*` | `vwEmployee` |
| PK constraint | `<Table>_pkey` · Default `<Table>_<Column>_df` · FK `<Table>_<Column>_fkey` · filtered unique `UX_<Table>_<Cols>_<cond>` | |

**T-SQL reserved words are never column names** — fix by adding a qualifier,
not `[brackets]`: `key`→`SettingKey`, `value`→`SettingValue`, `group`→`GroupName`,
`count`→`ItemCount`, `order`→`SortOrder`.

## Audit columns (app-owned master/transaction tables)

`Id` · `CreatedAt` · `UpdatedAt` · `CreatedBy` · `UpdatedBy` · `IsActive` · `IsDeleted`

- PK is always named `Id`
- Delete data that needs history via **`IsDeleted = 1`** (soft delete), never hard delete
- Lookup/join tables may trim the set, but exemptions are recorded in the
  project's Deviations notes
- Append-only log tables (e.g. audit logs) are exempt by nature

## Read-only and override rules

- Tables prefixed `<EXT>_` and views/tables reached over a linked server are
  **SELECT-only** — no INSERT/UPDATE/DELETE from the app, ever
- To adjust externally-owned values: an app-side append-only `*Overrides`
  table; a central resolver overlays the latest `CreatedAt` row at read time
- Raw SQL touching user input is **sanitized (regex allowlist) first, then
  parameterized** — both layers, always; no string-built SQL

## Connection & config

- The connection string lives in exactly **one** config location per stack and
  is validated at startup; app code never reads raw environment variables
  directly for it
- Long-running stored procedures get one app-wide request timeout setting, not
  per-call-site values
