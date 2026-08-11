# Component conventions — the deep rules behind DESIGN.md §4–6

DESIGN.md carries the agreement; this file carries the how + the edge cases.
Provenance: HRMS = `ugt-hrms` (radix-mira — kit files from there are ported
`asChild` → Base UI `render` on sync) · BOI = `gov-boi-smart` (base-mira —
Base UI native, same base as the org standard since มติ 2026-08-04).

## ถูก/ผิด — the five violations that cover 90% of review comments

```tsx
// ❌ สีสถานะ inline — สีอย่างเดียว ไม่มี icon, ค่าหลุด token
<span className="rounded bg-green-100 px-2 text-green-700">อนุมัติแล้ว</span>
// ✅ StatusBadge: tone + icon บังคับ, สีมาจาก --status-* ที่ผ่าน WCAG แล้ว
<StatusBadge tone="success" icon={CheckCircle2}>อนุมัติแล้ว</StatusBadge>

// ❌ ตาราง hand-rolled — sort/filter/mobile/empty ต้องเขียนเองหมดและไม่เหมือนใคร
<table><thead>…</thead><tbody>{rows.map(…)}</tbody></table>
// ✅ DataTable กลาง — ได้ครบชุดและหน้าตาเดียวกันทุกหน้า
<DataTable id="projects" columns={columns} data={rows} />

// ❌ format วันที่ inline — server เป็น UTC วันเลื่อน, พ.ศ./ค.ศ. สุ่มตาม locale
{new Date(row.startDate).toLocaleDateString('th-TH')}
// ✅ formatter กลาง — DD/MM/YYYY ค.ศ. เสมอ, กัน timezone เลื่อนวันแล้ว
{formatDate(row.startDate)}

// ❌ ปรับขนาด/สีปุ่มเอง — density หลุดมาตรฐาน mira
<Button className="h-9 bg-blue-600 text-base">บันทึก</Button>
// ✅ variant/size ตามระบบ — ปุ่มหลักคือ default อยู่แล้ว
<Button type="submit">บันทึก</Button>

// ❌ ปุ่ม icon ล้วนเปล่า ๆ — screen reader อ่านไม่ออก, ไม่มี tooltip
<Button size="icon" onClick={onEdit}><Pencil /></Button>
// ✅ IconAction — label บังคับ กลายเป็นทั้ง aria-label และ tooltip
<IconAction label="แก้ไข" variant="soft-primary" onClick={onEdit}><Pencil /></IconAction>
```

## Control selection ladder

| ตัวเลือก | ใช้ |
| --- | --- |
| ≤ 5 | `RadioGroup` |
| 6–15 | `Select` |
| > 15 หรือต้องค้นหา | `Combobox` (command + popover) |
| วันที่ | `ui/date-picker` เสมอ · ช่วง = `ui/date-range-picker` · ยกเว้น filter ปี/เดือนใน toolbar ใช้ `Select` ได้ |

## Dialog ladder

| งาน | ภาชนะ |
| --- | --- |
| ฟอร์มสั้น ≤ ~6 ช่อง | `FormDialog` (compound: `FormDialogContent/Header/Body/Footer`, prop `height`: `fluid`/`auto`/`fill`) — ห้ามประกอบ `Dialog` ดิบเป็นฟอร์ม |
| ฟอร์มยาว / หลายขั้น | หน้าแยก |
| panel เปิดค้างดูคู่เนื้อหา (filter ชุดใหญ่, preview) | `Sheet` |
| ดูรายละเอียด read-only | `detail-dialog-shell` + `detail-row`/`detail-section` |
| ยืนยัน destructive | `AlertDialog` ผ่าน `ConfirmActionDialog` — ปุ่มมีข้อความ ไม่ใช่ icon ล้วน |

Footer: ยกเลิก (outline) ซ้าย · ยืนยัน (primary) ขวาสุด · **one primary per
dialog**. No dialog-over-dialog except a single AlertDialog confirm on top of
a form. A dirty form never closes silently on Esc/outside-click — confirm
first. Mobile: dialog renders as bottom sheet (built into the primitive).

## Badge vs StatusBadge

- `StatusBadge` (tone + **required** leading icon + label) — any
  single-dimension state: pending/approved/rejected, active/inactive, risk.
  Formula per tone: `border-status-x/40 bg-status-x/10
  text-status-x-foreground`. Tones: success=emerald · warning=amber ·
  danger=red · cancel=coral · info=sky · neutral=gray. **sky ≠ primary**:
  sky labels information, primary marks interactive — never swap.
- `Badge` plain — labels/counts/identifiers, text-only, **no status colors
  inline**.
- **TONE_STYLES exception**: a colored label that must stay icon-free (e.g.
  IN/OUT in raw logs) imports `TONE_STYLES` from `ui/status-badge` — same
  tokens, no re-declared colors.
- Status→tone(+icon) mapping is declared **once per domain** (one const map
  next to the domain enum), never scattered per page.

## Icon mapping (fixed — additions become มติ in DESIGN.md §10)

เพิ่ม `Plus` · แก้ไข `Pencil` · ลบ `Trash2` · กู้คืน `RotateCcw` ·
ดูรายละเอียด `Eye` · Import `Upload` · Export `Download` · ค้นหา `Search` ·
กรอง `Filter` · เมนูแถว `MoreHorizontal` · สำเร็จ `CheckCircle2` · ปิด `X`.
Decorative icons (text alongside) get `aria-hidden`. Icon-only buttons only
via `IconAction` (label → aria-label + tooltip, delay 0). Action colors:
ลบ=แดง · กู้คืน=เขียว · แก้ไข=น้ำเงิน · เพิ่ม/Import=เขียวทึบ; in table rows
use the `soft-*` button variants so colors don't shout on every row.

## Page-level filter bar (outside the table)

Filters that scope the whole page — period, org unit, status — are NOT the
table's per-column filters. Fixed placement so page N+1 never moves them:

- Lives in the **same card header as the table** — never floating above the
  card, never in its own card.
- **Left-aligned**, ordered **wide → narrow**: period → org unit/scope →
  status. Page actions stay top-right in `PageActions`; never mix an action
  button into the filter row.
- Control per the ladder above (≤5 RadioGroup · 6–15 Select · >15 Combobox ·
  date range = `ui/date-range-picker`). **A bare `Input` is never a filter** —
  free-text search is the DataTable's own toolbar search; do not duplicate it
  here.
- A filter that changes *which rows exist* must be part of the query key and
  re-fetch server-side (see `ugt-nextjs-pitfalls` → data-fetching) — the
  placement rule and the fetching rule are separate obligations.
- **One divider only** between the whole control block (filter row → DataTable
  toolbar → active-filter chips) and the table itself; the **last** control row
  present carries it. Inside the control block, spacing separates the rows —
  no hairlines between filters and search, or between search and chips: they
  are one card header, and slicing it into strips reads as three components.

## DataTable

Central component, two modes; the mode is decided **per table at build time**
(no interview):

- **client (default)** — bounded data fetched whole (master data): tanstack
  sort/filter/paginate in memory.
- **server (mandatory for unbounded/server-paginated data)** — sort + filter
  + paginate ALL through URL state; never half. Client-sorting a partial
  page shows wrong results with no error — the founding bug of this rule.

Standard feature set (each off-switchable per prop, default = on): global
search (toolbar) · per-column filter (header icon → Popover, active-filter
chips with per-chip ✕ and clear-all) · sort · pagination (default 10,
options 10/20/50) · column drag-reorder · column hide/show · user prefs
(order+hidden) persisted in localStorage · reset-to-default · mobile
table→card · row selection + bulk bar · built-in Empty state.

**Header cell anatomy** (left → right inside one cell, only what is enabled):
drag handle (`GripVertical`, dimmed) → column label as a sort button with a
direction indicator → per-column filter icon opening a Popover. Per-column
filter UI is **auto-suppressed** when a table passes `serverPagination`
without `serverQuery` — client-filtering one page of a server-paginated set
returns confident nonsense, so the component refuses rather than trusting the
caller.

**Toolbar** — fixed placement, matching the component (`data-table.tsx`):
**search input leftmost**, a flex spacer, then `toolbarExtra` (export menu and
friends) and the column-settings icon button hugging the **right** edge. The
column-settings Popover has drag-to-reorder + show/hide checkboxes + reset;
prefs persist per table `id`. When a page also has page-level filters, those
form their **own row above** this toolbar (left-aligned, wide → narrow — see
§Page-level filter bar); they never share the toolbar row, so search never
migrates to the right side.

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

## Feedback

- Toast (sonner `richColors`): success=สำเร็จจริง · error=พังจริง ·
  warning=ทำได้แต่มีเงื่อนไข · info=เฉย ๆ — never `toast.error` for warnings.
- Loading: `Skeleton` for structure · in-button spinner (disabled) for
  actions · data states via `ui/query-state` (loading/error/empty in one) —
  no hand-written if-loading per page.
- Empty: `ui/empty` everywhere (empty table / no permission / 404) — icon +
  message + CTA when actionable.
- Page-level error: banner at the top of the content card · field-level:
  under the field via `ui/field` (zod + react-hook-form; label above field,
  required = red `*`, validate on submit then re-validate per field).

## Tabs · Tooltip · Chart · Rich text

- Tabs: sub-views of one thing on one page · main-navigation tabs put state
  in the URL (`?tab=`) · > ~5 tabs = split pages.
- Tooltip: `TooltipProvider` delay 0 · never the sole carrier of essential
  info (mobile has no hover).
- Chart: `ui/chart` (recharts via shadcn) + `--chart-1..5` only — no other
  chart lib, no hardcoded colors.
- Rich text: tiptap via a central `ui/tiptap-editor` — no other editor lib.

## Export (Excel/CSV)

`ui/export-menu` in the table's `toolbarExtra` → POSTs to a **Route Handler**
(never a Server Action — 1 MB body cap) → `lib/export.ts` turns rows into the
file. One `ExportColumn[]` spec feeds both formats, so CSV and Excel can never
drift apart.

```ts
const COLUMNS: ExportColumn<LeaveRow>[] = [
  { header: 'รหัสพนักงาน', width: 12, value: (r) => r.empCode },
  { header: 'วันที่',      width: 14, value: (r) => formatExportDate(r.date) },
  { header: 'จำนวนวัน',    width: 10, value: (r) => r.days },        // number → Excel คำนวณต่อได้
];
return toExportResponse(format, COLUMNS, rows, {
  filename: `leave-requests-${bangkokToday(new Date())}`,
  sheetName: 'Leave Requests',
});
```

Route order, every time: **session → permission → scope → validate body (zod)
→ query capped at `EXPORT_MAX_ROWS` → audit row → build**. The export bypasses
the table's pagination, so the scope check is the only thing standing between a
user and every row in the table — it is not optional, and it must re-derive
scope server-side rather than trust anything in the body.

| DO ✅ | DON'T ❌ |
| --- | --- |
| One `ExportColumn[]` for both formats | Separate header string + row array (HRMS shipped a 15-vs-13 mismatch this way) |
| `formatExportDate` → ISO `yyyy-MM-dd` | `DD/MM/YYYY` in a file — Excel re-reads it by locale and silently swaps day/month |
| Numbers stay numbers | `String(n)` — the column becomes text and SUM stops working |
| `take: EXPORT_MAX_ROWS` in the query | Fetch everything and cap afterwards |
| Audit row before the file is built | Export with no trace of who took what |
| Send the table's current filters in `buildBody` | Export the unfiltered set from a filtered screen |
| Filename from `Content-Disposition` | A second filename guessed on the client |

`lib/export.ts` handles the three things everyone forgets: a UTF-8 **BOM** (no
BOM = Thai is garbage in Excel on Windows), a `'` in front of `= + - @` (a cell
starting with `=` is a **formula**, and that is remote code in a spreadsheet),
and CRLF per RFC 4180.

## Kit inventory (assets/ui/ + assets/lib/)

| File | From | Note |
| --- | --- | --- |
| `ui/data-table.tsx` | HRMS | see Kit status above |
| `ui/form-dialog.tsx` | HRMS | compound + height variants |
| `ui/status-badge.tsx` | HRMS | exports `TONE_STYLES` |
| `ui/icon-action.tsx` | BOI (Base UI native, `render` prop) | label required |
| `ui/confirm-action-dialog.tsx` | BOI (Base UI native) | destructive confirm |
| `ui/date-picker.tsx` / `ui/date-range-picker.tsx` | HRMS | |
| `ui/combobox.tsx` | HRMS | generic (employee-combobox ไม่เอา — HR-specific) |
| `ui/page-shell.tsx` · `ui/detail-dialog-shell.tsx` · `ui/detail-row.tsx` · `ui/detail-section.tsx` | HRMS | |
| `ui/query-state.tsx` · `ui/truncated-text.tsx` | HRMS | query-state needs `ui/callout` |
| `ui/callout.tsx` | HRMS | page-level banner; tones reuse `TONE_STYLES` |
| `ui/export-menu.tsx` | HRMS | ปุ่ม Excel/CSV สำหรับ `toolbarExtra`; ship only when a page exports (needs `dropdown-menu` + `sonner`) |
| `components/theme-provider.tsx` | standard next-themes wrapper | **fallback only** — the org preset scaffold ships its own (superset: hotkey + disableTransitionOnChange); keep the registry's file when present |
| `components/theme-toggle.tsx` | HRMS | ship only when dark mode = มี (needs `next-themes`) |
| `components/language-switcher.tsx` | HRMS | ship only when ภาษา = th+en (needs `next-intl` + `lib/actions/locale.ts`) |
| `lib/format.ts` | merge: HRMS `format-date.ts` (Intl + cache + wall-clock/instant contract) + BOI `formatNumber`/`bangkokToday` + new `formatExportDate` (ISO) | the only formatter |
| `lib/table-query.ts` · `lib/table-prefs.ts` · `lib/pagination.ts` | BOI | URL-state + column prefs + page params for server-mode tables (`table-query` imports `firstParam` from `pagination`) |
| `lib/actions-locale.ts` → `lib/actions/locale.ts` | HRMS | th+en only; Server Action guarded by `lib/auth` (auth-setup) |
| `lib/export.ts` | merge: HRMS's two hand-written export routes, collapsed into one column spec (+ BOM, formula guard, row cap) | server-only (`exceljs`); pairs with `ui/export-menu` |
| `ui/button-variants.md` | BOI → recipes on the base-mira button, colors mapped to org tokens | the sanctioned `components/ui/button.tsx` edit |
| `brand/ube-logo-short.svg` · `brand/ube-logo-long.svg` | company asset | → `public/brand/` · `fill="currentColor"` (tint via CSS) · short = shell header, long (tagline) = login/landing |
