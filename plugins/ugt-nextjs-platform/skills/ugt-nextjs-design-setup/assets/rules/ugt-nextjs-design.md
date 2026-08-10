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

- shadcn component exists → use it. Never hand-build, never raw CSS /
  CSS-in-JS / inline styles (only truly dynamic values).
- Sizes stay `default` (exceptions: `size="icon"` in table rows via
  `IconAction`, `sm` in dense toolbars — that's the whole list).
- lucide only, per the fixed icon mapping in DESIGN.md §4 — never emoji,
  never a different icon for the same action.
- Tables → `DataTable`. Server-paginated data must sort/filter server-side
  (URL state) — client-sorting a partial page silently lies.
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
  long forms on a page. One primary button per dialog; dirty forms confirm
  before closing.
- New colors or token edits → run the design skill's `check-contrast.mjs`
  before committing.
- Deviating from DESIGN.md on purpose? Add a dated มติ to its §10 — a silent
  deviation is a defect, and grandfathered code (§9) never spreads to new
  code.
