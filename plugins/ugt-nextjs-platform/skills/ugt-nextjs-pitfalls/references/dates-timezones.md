# Dates & Timezones — MSSQL binding, anchors, Gregorian-only years

The single principle behind every rule here: **know which anchor your `Date`
object carries (UTC-midnight, local-midnight, or a real instant) — and make
every getter, serializer, and DB binding match that anchor.** Every incident
below was a mismatch between the two.

## 1. Binding dates into `$queryRaw` / stored procedures — strings, never `Date`

**Never pass a JS `Date` as a date filter parameter to `$queryRaw`/`EXEC` when
the target is a stored procedure or a linked-server table.** The
`@prisma/adapter-mssql` driver (tedious, `useUTC`) binds `Date` values as
**UTC** — a local-midnight `2026-06-03 00:00 +07:00` arrives as
`2026-06-02T17:00Z`, and `@StartDate` / `CAST(… AS DATE)` reads **the previous
day**. The symptom is silent wrong data (a shift read as OFF, a day window
missing its last day), never an error.

```ts
// ❌ shifts −7h on a UTC+7 server → reads the wrong day
await prisma.$queryRaw`EXEC usp_GetShiftSchedule ${startOfDay(date)}, ${empCode}`;

// ✅ bind a wall-clock string built with LOCAL getters
await prisma.$queryRaw`EXEC usp_GetShiftSchedule ${toLocalYmd(date)}, ${empCode}`;
```

Rules:

- One `toLocalYmd(d)` helper (`${y}-${MM}-${dd}` from **local** getters) lives
  in `lib/utils.ts` with a JSDoc warning. **Never define a second local-YMD
  helper in a service file** — a private copy is how one call site gets missed.
- `startOfDay(date)` before binding is the classic trap — it still returns a
  `Date`, which still shifts. Convert to string.
- When fixing this class of bug, **grep every `$queryRaw`/`EXEC` that filters
  by date and fix the whole set** — the incident recurred twice because only
  the reported call site was patched.
- App-internal Prisma tables are different: writes and reads shift **equally**
  through the adapter, so `Date` filters self-cancel there. Don't "fix" those —
  but know the stored calendar value is offset if the server timezone ever
  changes.
- Mocked `$queryRaw` tests never catch this (no SQL runs). Regression-test by
  asserting the **bound parameter**:
  `expect(queryRaw.mock.calls[0][2]).toMatch(/^\d{4}-\d{2}-\d{2}$/)`.

## 2. Getters must match the Date's anchor

| The `Date` came from | Anchor | Read/serialize with |
| --- | --- | --- |
| SQL `DATE` column via Prisma | UTC-midnight | `getUTCFullYear/Month/Date`, `toISOString().slice(0, 10)` |
| SQL `TIME(0)` via `mssql` driver | wall-clock stored in the UTC part | `getUTCHours`/`getUTCMinutes` via one central formatter |
| `new Date('2026-06-03T00:00:00')` (no `Z`) | local-midnight | **local** getters / `toLocalYmd` — `.toISOString()` shifts it −1 day |
| `createdAt` / `new Date()` | real instant | local getters for display; never date-only slice without deciding the timezone |

Cross-side comparisons (JS date-key ↔ SQL `DATE`) must use the **same anchor on
both sides**. And the value that one side *writes* and the other side *filters
by* must be serialized by the **same helper** — one side using a raw string and
the other `.toISOString()` produced a detail view that could never match its
summary.

## 3. Wall-clock vs instant — choose the formatter first

Maintain two formatters with opposite contracts, and classify every column
before picking one:

- **`formatDate`** — reads UTC parts (`timeZone: 'UTC'`). For **wall-clock
  dates**: Prisma `@db.Date`, leave/holiday dates. Using local getters here
  shifts the day for UTC+7 users.
- **`formatDateTime`** — reads local time, appends `HH:MM`. For **instants**:
  `createdAt`, `updatedAt`, `submittedAt`.

Diagnostic: a date that is correct in the daytime but **one day early for rows
created 00:00–06:59** = a UTC formatter applied to an instant. Blanket-applying
`formatDate` to every date column is how the regression shipped.

Writing a wall-clock time back: assemble with `Date.UTC(y, m - 1, d, hh, mm)`
so it reads back identically through UTC getters. Prefer `<input type="time">`
plus a separate date field over `datetime-local` — `new Date(localString)`
stores an offset value.

## 4. Years are Gregorian (ค.ศ.) everywhere — there is no BE code path

**Org contract (มติ 2026-08-24, ugt-core `contracts/design.md` §Dates):
store CE, display CE.** No conversion layer exists and none may be added —
พ.ศ. was explicitly abolished, so a `+543` anywhere in the tree is a bug, not
a display helper.

- **Stored, queried, and rendered years are all Gregorian.** Never store,
  never `WHERE year = …`, and never *show* a BE (พ.ศ.) value.
- **No `±543` anywhere — no exceptions, not even "just in the central
  helper".** There is no `displayYear`/`inputToCEYear` in the kit to put it
  in. `scripts/verify.mjs` (rule `BE-YEAR`) fails on any `+543`/`−543`.
- The reason a Thai locale needs no conversion is the formatter, not a
  helper: `lib/format.ts` pins `th-TH-u-ca-gregory` (plain `th-TH` would
  render พ.ศ. through `Intl`) and `en-GB` for DD/MM/YYYY. **Every year on
  screen goes through that module** — a hand-rolled `${d.getFullYear()}`
  string is how a stray BE year got back in.
- Symptom → cause: Thai text showing a year ~543 off means either an inline
  `+543` survived somewhere, or an `Intl` call built with a bare `th-TH`
  locale (or `toLocaleDateString('th-TH')`) instead of `lib/format.ts`. The
  fix is always to route through the formatter, never to add a conversion.
- Holiday/day-type matching: match by **date** (`holidayDate`), never by year
  column — year-keyed lookups are what broke when the conventions were mixed.

## 5. Small but expensive

- A loop that mutates a `Date` (`cur.setUTCDate(cur.getUTCDate() + 1)`) must
  use an **independent** Date as its bound. `const end = cond ? cur : other`
  aliases the same object — the bound moves with the cursor and the loop runs
  until `Date` overflows (observed: one test hung ~18 minutes and produced a
  garbage sum instead of failing).
