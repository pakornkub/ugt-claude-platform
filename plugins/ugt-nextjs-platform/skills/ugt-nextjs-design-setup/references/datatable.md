# DataTable + page-level filters — the table rules behind DESIGN.md §4–6

Contents: §Page-level filter bar (outside the table) · §DataTable (modes,
feature set, card · footer · sortable, mobile, row selection, header cell,
toolbar, pagination, consistency obligations, kit status)

## Page-level filter bar (outside the table)

Filters that scope the whole page — period, org unit, status — are NOT the
table's per-column filters. Fixed placement so page N+1 never moves them:

- **In the DataTable toolbar row, via the `toolbarFilters` slot** — right
  after the search box, ordered **wide → narrow**: period → org unit/scope →
  status (มติ 2026-08-11; the earlier separate filter row above the toolbar
  left the search row half empty and made the eye scan three strips for one
  job). On narrow screens the row wraps naturally.
- Page actions stay top-right in `PageActions`; never mix an action button
  into the toolbar's filter zone.
- **Kit pieces for this slot** (มติ 2026-10-16 A6/B4): the period is
  `ui/period-navigator` (`‹ label › today`, first in `toolbarFilters`) — not a
  year Select + month Select pair; a view switch that also changes granularity
  is one `ViewToggle` in `toolbarExtra` ([calendar | list | whole year]). A page
  with ≥ 3–4 filters folds the secondary ones into `ui/filter-popover`, **last**
  in `toolbarFilters` (count badge + clear; each field applies at once). No
  DataTable prop is needed — both stretch full width on phones like any filter.
- Control per the ladder (`conventions.md` §Control selection ladder) (≤5 RadioGroup · 6–15 Select · >15 Combobox ·
  date range = `ui/date-range-picker` with `hideLabels` — visible labels above the
  pickers push them below the search box; hidden they stay as placeholders +
  screen-reader text and the row lines up). **A bare `Input` is never a filter** —
  free-text search is the DataTable's own toolbar search; do not duplicate it
  here.
- A filter that changes *which rows exist* must be part of the query key and
  re-fetch server-side (see `ugt-nextjs-pitfalls` → data-fetching) — the
  placement rule and the fetching rule are separate obligations.
- **One divider only** between the control block (toolbar row → active-filter
  chips) and the table itself; the **last** control row present carries it.
  Inside the control block, spacing separates the rows — no hairline between
  the toolbar and the chips: they are one card header, and slicing it into
  strips reads as separate components.

## DataTable

Central component, two modes; the mode is decided **per table at build time**
(no interview):

- **client (default)** — bounded data fetched whole (master data): tanstack
  sort/filter/paginate in memory.
- **server (mandatory for unbounded/server-paginated data)** — sort + filter
  + paginate ALL through URL state; never half. Client-sorting a partial
  page shows wrong results with no error — the founding bug of this rule.

Standard feature set (each off-switchable per prop, default = on unless
noted): global search (toolbar) · per-column filter (header icon → Popover,
active-filter chips with per-chip ✕ and clear-all) · sort (server mode:
via `serverQuery`; client mode: **opt-in `sortable`**, below) · pagination
(default 10, options 10/20/50) · column drag-reorder · column hide/show ·
user prefs (order+hidden) persisted in localStorage · reset-to-default ·
mobile list · row selection · built-in Empty state · `footer` slot.

**Card** (`card`, default on): toolbar + chips → table (or the mobile list) →
pagination → `footer`, all in ONE card at every breakpoint, with the `Card`
elevation (`shadow-xs ring-1 ring-border`, มติ D3). `card={false}` only when
the table already sits on a surface (dialog, sheet, a tab's card) — never a
shadowed card inside a shadowed card.

**`footer`** (มติ B3): the last row inside the card, under pagination, with
a `border-t` — legends for the table's symbols/colours, a footnote. A legend
floating below the card reads as a separate thing.

**`sortable`** (มติ B3): header sort buttons for a **client-mode** table —
the same button, arrow and `aria-sort` as server mode; turn one column off
with `enableSorting: false`. Opt-in so a kit update doesn't change existing
headers. **Ignored when `serverPagination` is passed** (the same guard as
per-column filters): sorting the one page in hand shows the 10 visible rows
"sorted" and nothing tells the user the order is wrong. A server table sorts
through `serverQuery`. `scripts/verify.mjs` fails on a `<DataTable>` that
passes both.

### Mobile (<sm) — มติ 2026-10-16 D8/A12

Built into the component; never restyle it per page.

- **Rows = a list inside the one card**, divided by hairlines
  (`data-slot="data-table-mobile-row"`, `border-b` · last row none · selected
  = `bg-muted` like a selected `TableRow`). The first data column is the row
  heading, the rest are label/value pairs (`meta.mobileLabel` when the
  header isn't a string), the `actions` cell sits at the row's foot, the
  `select` checkbox leads the heading. Replaces the 2026-08-21 card-per-row
  layout, which put a card inside the card and spent the height on borders.
- **Toolbar rows go full width, in this order**: navigation (search box →
  `toolbarFilters`, each control stretched full width) → secondary tools
  (`toolbarExtra` + the column-settings button) together in one row,
  right-aligned. The column-settings button is never hidden on mobile; below 768px it opens a
  bottom sheet (`ui/responsive-popover`) with visible ▲▼ buttons — touch drag is not reliable.
- The page's **primary action is not in the toolbar** (contract: a filter row
  never hosts an action) — it stays in `PageActions` above the card, which
  on phones is the full-width `cta` button.

### Row selection, header, toolbar, pagination

ติ๊กเลือกแถวใช้ `selectionColumn()` จาก `ui/data-table` เป็นคอลัมน์แรกเสมอ —
อย่าเขียน header/cell เอง: helper บังคับ `aria-label` ที่ระบุแถวได้ (ไม่งั้น
screen reader อ่านทุกแถวว่า "checkbox") และให้ติ๊กหัวตารางนับจากแถว **ที่กรองอยู่**
ไม่ใช่ทั้งชุดข้อมูล · แถวที่ห้ามเลือกส่งผ่าน prop `enableRowSelection` ของตาราง
ทางเดียว ไม่ตั้งซ้ำในคอลัมน์

Row selection alone renders no toolbar of its own. The bulk bar is a
separate component the page composes — `ui/bulk-action-bar.tsx` — fed by
the table's `onSelectionChange` and cleared through its `resetSelectionKey`.
It appears only above **2 or more** selected rows, and while it is up the
page hides its per-row action buttons so there is never a second way to
issue the same command.

**Header cell anatomy** (left → right inside one cell, only what is enabled):
drag handle (`GripVertical`, dimmed) → column label as a sort button with a
direction indicator (server mode, or client mode with `sortable`) →
per-column filter icon opening a Popover. Per-column filter UI and client
sort are **auto-suppressed** when a table passes `serverPagination` without
`serverQuery` — client-filtering or client-sorting one page of a
server-paginated set returns confident nonsense, so the component refuses
rather than trusting the caller.

**Toolbar** — one row, fixed order, matching the component (`data-table.tsx`):
**search input leftmost** → `toolbarFilters` (page-level filters, wide →
narrow) → flex spacer → `toolbarExtra` (export menu and friends) and the
column-settings icon button hugging the **right** edge (phones: §Mobile). The column-settings
ResponsivePopover has drag-to-reorder + show/hide checkboxes + reset; prefs persist per
table `id`. Search never migrates to the right side, and filters never get
their own row above the toolbar (มติ 2026-08-11).

That search box belongs to the DataTable in **both** modes — client mode
passes `globalSearch`/`filterColumn`, server mode passes `serverSearch`
({ value, onChange, debounceMs? }): same box, same position, but the table
only debounces the typing and hands the trimmed term back, leaving the query
to the page (its meaning is page-specific — audit-logs searches across the
user table). A server-paginated page that hand-rolls its own `<Input>` +
magnifier is the drift this prop exists to remove (4.36.0).

**Pagination**: rows-per-page Select → `หน้า X จาก Y` → four icon buttons
(first · prev · next · last; first/last are `lg`-only). **No numbered page
list** — มติ 2026-08-09. All icon buttons use `size="icon"`; hardcoding
`size-8`/`h-8` is forbidden (it made the pagination row 32px while the
toolbar button stayed 28px in the same table — fixed 2026-08-09).

**Consistency obligations** (this is where page-to-page drift actually
happens — same component, different config):

- **`id` is mandatory on every table**, a stable app-unique slug. Prefs
  persist only when it is present, so a table without one silently "forgets"
  what every other table remembers. `scripts/verify.mjs` fails on a
  `<DataTable>` with no `id`.
- Turning a feature off needs a reason that would hold on any similar page
  ("3 columns, hiding them is meaningless"), not "this page's author didn't
  wire it". Same situation → same config.
- Page size stays at the standard 10 / 10-20-50 set; a different set is a
  มติ in DESIGN.md §10, not a per-page choice.

> **Kit status**: the shipped `ui/data-table.tsx` IS the full option set —
> built and tested inside ugt-hrms (per มติ 2026-08-04; ugt-hrms PR #166,
> 62/62 tests) then synced here. Server mode = pass `serverQuery`
> ({ query, baseParams, fields }) parsed via `lib/table-query.ts`; per-column
> filter UI is auto-suppressed on tables that pass `serverPagination` without
> `serverQuery` (partial-page guard). Prefs persist only when the `id` prop
> is given. **Since มติ 2026-08-04**: ugt-hrms and gov-boi-smart were the
> *source material* — their job is done. This plugin's copy is now the
> standalone source of truth for the kit; future improvements are made here
> directly (no sync-back obligation). The kit is Base UI (`render` prop) —
> grep `asChild` must stay 0 in shipped assets.
