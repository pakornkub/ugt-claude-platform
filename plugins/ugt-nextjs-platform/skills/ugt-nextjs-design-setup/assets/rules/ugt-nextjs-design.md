---
paths:
  - "app/**/*.tsx"
  - "components/**/*.tsx"
---

<!-- Owned by ugt-nextjs-design-setup — may be overwritten wholesale on /plugin update. -->

# Design rules (loads when touching any UI file)

**Before writing or changing UI, read `docs/DESIGN.md`** — it is the
project's design source of truth and wins over code, habit, and any
beautification skill. The short version that catches 90% of violations:

- **The kit is Base UI (base-mira), not Radix**: triggers take
  `render={<X />}`, menu items take `onClick`, checkbox tri-state is
  `checked` (boolean) + `indeterminate`, open-state styling is
  `data-[popup-open]`/`data-open`. Radix idioms — `asChild`, `onSelect` on a
  menu item, `checked="indeterminate"`, `data-[state=open]` — are **ignored
  silently**: the component renders and the button just does nothing.
- shadcn component exists → use it. Never hand-build, never raw CSS /
  CSS-in-JS / inline styles (only truly dynamic values).
- Sizes stay `default` (exceptions: `size="icon"` in table rows via
  `IconAction`, `sm` in dense toolbars — that's the whole list).
- lucide only, per the fixed icon mapping in DESIGN.md §4 — never emoji,
  never a different icon for the same action.
- Tables → `DataTable`. Server-paginated data must sort/filter server-side
  (URL state) — client-sorting a partial page silently lies. DataTable wraps
  itself in the §3 card — never wrap it in another Card (`card={false}` for
  tables inside a dialog/sheet).
- Can't-do-because-of-**permission** → hide the button. Can't-do-because-of-
  **business rule** (system row, record in use) → `IconAction disabled` with
  the reason as its label/tooltip (มติ 2026-08-21).
- Dates/numbers → `lib/format.ts` only. Screen `DD/MM/YYYY`; exported files
  ISO `yyyy-MM-dd` — different on purpose.
- Excel/CSV export → `lib/export.ts` + `ui/export-menu` from a **Route
  Handler**, one `ExportColumn[]` for both formats. Hand-rolling CSV loses
  the BOM (ไทยเพี้ยนใน Excel) and the `=`-formula guard. The export skips
  pagination, so it re-checks permission and scope server-side.
- Status UI → `StatusBadge` (tone + icon, both required). Plain
  labels/counts → `Badge`, colorless.
- Icon-only buttons → `IconAction` (label mandatory). Destructive actions →
  `ConfirmActionDialog`, text button.
- Forms → `ui/field` (zod + react-hook-form), short forms in `FormDialog`,
  long forms on a page. "Long" includes any form with a list/checklist that
  **grows with data** (permission checklists, option lists) — always long
  even if short today; those go in a `Sheet` (scrolling body) or a page,
  never a fixed-height Dialog. One primary button per dialog; dirty forms
  confirm before closing.
- New colors or token edits → run the design skill's `check-contrast.mjs`
  before committing.
- Deviating from DESIGN.md on purpose? Add a dated มติ to its §10 — a silent
  deviation is a defect, and grandfathered code (§9) never spreads to new
  code.
