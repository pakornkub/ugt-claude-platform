# Migrating a prototype data layer onto Prisma + SQL Server (SKILL §4b)

Why this file exists: field report 2026-09-09 — a Google AI Studio project
went through full-setup with "ใช้ design เดิม", got Prisma + SQL Server + Better
Auth installed, and every screen still ran on SQLite with mock data. The
skills installed infrastructure and stopped; nothing said "now move the
features onto it". This is that step. It runs in **preserve mode**: the
screens, routes and workflow logic stay — only what they read from changes.

## 1. Inventory — find the store and every path into it

Run from the project root; keep the output, it becomes the table in step 2.

```bash
# the store itself
grep -rn "better-sqlite3\|sqlite3\|sql\.js\|@libsql\|lowdb\|drizzle-orm\|provider *= *\"sqlite\"" package.json prisma/ lib/ src/ 2>/dev/null
find . -maxdepth 3 \( -name "*.db" -o -name "*.sqlite" -o -name "*.sqlite3" \) -not -path "./node_modules/*"
# mock / fixture data
grep -rln "export const .*: .*\[\] *= *\[\|\.json'" app components lib services src 2>/dev/null | head -50
ls data/ mocks/ fixtures/ services/ 2>/dev/null
# domain state in the browser
grep -rn "localStorage\.\(get\|set\)Item" app components lib src 2>/dev/null
# AI-studio / v0 shape: services/*.ts with hard-coded arrays + setTimeout "latency"
grep -rln "setTimeout(.*resolve" services lib src 2>/dev/null
```

Inventory table (one row per entity — what the UI thinks a "thing" is):

| Entity (prototype name) | Where stored | Read paths | Write paths | Sample rows worth keeping? |
| --- | --- | --- | --- | --- |

Two things that are **not** entities: per-user UI preferences in
`localStorage` (column order, collapsed sidebar) stay client-side; app-wide
settings become `AppSettings` (see auth/mail skills), not a table each.

## 2. Map entities → Prisma models (org conventions apply in full)

Per entity, one model — `naming-conventions.md` decides the names:

| Prototype shape | Prisma / SQL Server |
| --- | --- |
| `id INTEGER PRIMARY KEY AUTOINCREMENT` | `id Int @id @default(autoincrement()) @map("Id")` — or `String @default(cuid())` if the UI already treats ids as opaque strings |
| booleans stored as `0/1` | `Boolean` |
| dates as ISO strings / epoch numbers | `DateTime` — wall-clock dates read as UTC parts (`lib/format.ts` rules) |
| free-form JSON column | a real column set when the keys are known; `String @db.NVarChar(Max)` + a zod schema at the boundary only when they truly vary |
| `status: 'draft' \| 'sent' …` string unions | `String @db.NVarChar(20)` + the same zod enum in code (no DB enum — MSSQL has none) |
| foreign keys by name (`ownerName`) | a real FK to the owning table (`ownerId`) — resolve names once during seed |
| a column named `key` / `value` / `group` / `order` | rename with a qualifier (T-SQL reserved words) |

Every model gets `@@map("PascalCasePlural")`, `@map` on every scalar, and
the audit set `Id CreatedAt UpdatedAt CreatedBy UpdatedBy IsActive IsDeleted`.
Run `node <skill-dir>/scripts/verify.mjs` after writing the schema — it
enforces all of that.

## 3. Rewrite data access behind the SAME signatures

The rule that makes this "preserve mode" rather than a rewrite:

- Keep every exported function/action the screens call — same name, same
  arguments, same return shape. Change the **body**: `@/lib/prisma` instead
  of the store.
- Server-side only. A prototype that fetched from the browser (`services/`
  called in `useEffect`) moves to Server Actions or Route Handlers; the
  component keeps its props and state. Never import `@/lib/prisma` from a
  Client Component.
- Soft delete replaces `DELETE`: `isDeleted = true`, and every list query
  filters `isDeleted: false` (contract database.md).
- Actor columns (`createdBy`/`updatedBy`) come from the real session once
  auth-setup is in — until then leave them `null`, never a hard-coded name.

Do the entities one at a time, run the screen after each, then move on.

## 4. Seed data — a decision, recorded

Prototype rows are usually demo data. Ask (or read Q0b's answer): keep or
drop. Keep → `scripts/seed-from-prototype.ts` (tsx, reads the old store or
the JSON fixtures once, writes through Prisma, idempotent on re-run); it is
a one-off tool, not part of the app, and is deleted with the old store after
it has run. Drop → say so in `decisions.md`.

## 5. Delete the old store

Only after every read/write path is on Prisma:

```bash
npm uninstall better-sqlite3 sqlite3 sql.js @libsql/client lowdb drizzle-orm 2>/dev/null
git rm -r --cached data/ *.db 2>/dev/null   # then delete the files
```

Remove the fixture modules and every leftover import; remove the
`localStorage` domain keys (keep pure UI-preference keys). `verify.mjs`
fails on any remaining dep / `provider = "sqlite"` / `*.db` file, and warns
when nothing outside `lib/prisma.ts` imports `@/lib/prisma`.

## 6. Record it

`docs/project-context/decisions.md`: the entity map (prototype name → table),
fields dropped or renamed, the seed decision, the date. `architecture.md`:
data now lives in SQL Server via Prisma — the prototype store is gone.

## Traps seen

- **"Connected" that isn't** — Prisma present, `DATABASE_URL` set, screens
  untouched. The verify warning "nothing imports @/lib/prisma" is this.
- **Two stores at once during migration** — the UI shows a mix of old and
  new data and nobody can tell which; migrate entity by entity and switch
  each screen the moment its entity moves.
- **Dates shifted a day** — prototype stored `YYYY-MM-DD` strings; treat them
  as wall-clock dates (`lib/format.ts`), not instants, when importing.
- **Ids changed shape** — UI kept `Number(id)` while the new table uses
  cuid strings (or the reverse); pick the id type in step 2 from what the
  UI already does.
