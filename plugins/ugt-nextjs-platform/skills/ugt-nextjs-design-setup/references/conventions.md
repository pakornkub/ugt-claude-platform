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
| `components/theme-provider.tsx` | standard next-themes wrapper | ship with theme-toggle when dark mode = มี; wraps app in layout.tsx |
| `components/theme-toggle.tsx` | HRMS | ship only when dark mode = มี (needs `next-themes`) |
| `components/language-switcher.tsx` | HRMS | ship only when ภาษา = th+en (needs `next-intl` + `lib/actions/locale.ts`) |
| `lib/format.ts` | merge: HRMS `format-date.ts` (Intl + cache + wall-clock/instant contract) + BOI `formatNumber`/`bangkokToday` + new `formatExportDate` (ISO) | the only formatter |
| `lib/table-query.ts` · `lib/table-prefs.ts` · `lib/pagination.ts` | BOI | URL-state + column prefs + page params for server-mode tables (`table-query` imports `firstParam` from `pagination`) |
| `lib/actions-locale.ts` → `lib/actions/locale.ts` | HRMS | th+en only; Server Action guarded by `lib/auth` (auth-setup) |
| `ui/button-variants.md` | BOI → recipes on the radix-mira button, colors mapped to org tokens | the sanctioned `components/ui/button.tsx` edit |
