# Component conventions — the deep rules behind DESIGN.md §4–6

DESIGN.md carries the agreement; this file carries the how + the edge cases.
Provenance — two source projects, two eras: HRMS = `ugt-hrms` (**radix-mira,
Radix**) · BOI = `gov-boi-smart` (**base-mira, Base UI** — same base as the
org standard since มติ 2026-08-04). Anything taken from HRMS was ported by
hand at the time it was added (`asChild` → `render`, `onSelect` → `onClick`,
`data-[state=…]` → `data-open`); **neither source repo syncs into the kit
and the kit does not sync back**. Copying UI code between the two repos by
hand is what produced the 4.25.0 dead-button bug — do not do it. (This is
unrelated to `ugt-nextjs-kit-sync`, which pushes kit → project.)

Contents: §ถูก/ผิด · §Control selection ladder · §ตรวจ API (moved) · §Dialog ladder ·
§Badge vs StatusBadge · §Icon mapping (+ IconAction tone) · §Feedback ·
§Tabs · Tooltip · Chart · Rich text · §i18n. Split out into topic files:

- `base-ui-api.md` — primitive API vs the base-mira registry; the Radix↔Base UI table
- `datatable.md` — page-level filter bar + DataTable (modes, toolbar, pagination, mobile)
- `export.md` — Excel/CSV export (route order, DO/DON'T, `lib/export.ts` guards)
- `kit-inventory.md` — every kit file with provenance
- `form-pages.md` · `dashboard.md` — form container ladder in depth + full-page form · the dashboard pattern

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
| วันที่ | `ui/date-picker` เสมอ · ช่วง = `ui/date-range-picker` · ช่วงเวลาระดับหน้า (เลื่อนวัน/สัปดาห์/เดือน/ปี) = `ui/period-navigator` · กรองแค่ปี = `ui/year-select` (+ `ui/month-select`) |
| เวลา | `ui/time-input` (`HH:MM` 24 ชม.) เสมอ — ห้าม `<input type="time">` (picker ตามภาษาเครื่อง AM/PM + ช่องวินาที) |

Sizes (A3/A7): **one toolbar row = one size** (`default`; `sm` only in dense panels; `ui/view-toggle` = 28px)
· `size="cta"` (44px phone / 36px ≥sm) **only** in `PageActions`, `PageFormActions` and dialog/sheet
footers — footers get it from the primitive (`assets/ui/button-variants.md`, `primitive-edits.md`).
Mobile toolbar (A12): navigation/search → filters → tools + column settings right — the page's
primary action never joins it; it stays in `PageActions` above the card (full-width `cta`).

## ตรวจ API ของ primitive กับ registry ก่อนเขียน (อย่าเดาจากความจำ Radix)

→ moved to `base-ui-api.md` (sources of truth in order + the Radix↔Base UI difference table).

## Dialog ladder

Chosen by the **job**, not field count alone (มติ 2026-10-16 A11 — replaces "FormDialog ≤ ~6 fields"):

| งาน | ภาชนะ |
| --- | --- |
| งานหลักหลายขั้น / ต้องเลือกวันบนปฏิทิน | หน้าแยก — คอลัมน์เดียวถึง cap 96rem · **การ์ดต่อ section** + `CardHeading` · `PageBackLink` · `PageFormActions` ขนาด `cta` ชิดขวา (มือถือ `[1fr_2fr]`) (มติ 2026-10-16 D4 แทน "กึ่งกลาง `max-w-3xl` ไม่ครอบการ์ด" · DESIGN.md §4 ฟอร์มแยกหน้า · `CardHeading` = `ui/card-heading`) |
| แก้ 1 record ของ master/ตั้งค่า ≥ 4 ช่อง | `ui/settings-sheet` — `SettingsSheetContent size="xl"` (576px) ฟอร์มล้วน · `size="5xl"` (1024px) มีตารางย่อย · 2 ขนาดเท่านั้น (`sm:max-w-*` เปล่าบน `SheetContent` แพ้ class ของ primitive) |
| ≤ 3 ช่อง จบในจังหวะเดียว | `FormDialog` (compound: `FormDialogContent/Header/Body/Footer`, prop `height`: `fluid`/`auto`/`fill`) — ห้ามประกอบ `Dialog` ดิบเป็นฟอร์ม · **ขอเหตุผล (ปฏิเสธ/ยกเลิก) = `ui/reason-dialog` ตัวเดียว** ห้ามทำใหม่รายหน้า |
| ฟอร์มที่มี list/checklist **โตตามข้อมูล** (นับเป็น "ยาว" เสมอแม้วันนี้สั้น — Dialog สูงคงที่ ข้อมูลไม่คงที่) | `Sheet` (body เลื่อน) หรือหน้าแยก — บทเรียน 4.25.0: ฟอร์มบทบาท "3 ช่อง" + checklist สิทธิ์ |
| ดูรายละเอียด read-only | `detail-dialog-shell` (หัว: ไอคอน + ชื่อ + `description` + `status`) + `DetailHighlights` + `DetailSection`/`DetailRow` |
| ยืนยัน destructive | `AlertDialog` ผ่าน `ConfirmActionDialog` — ปุ่มมีข้อความ ไม่ใช่ icon ล้วน |
| system alert บังคับ action เดียว (session หมดอายุ) | `AlertDialog` ปิดไม่ได้ — **ไม่มีปุ่มยกเลิก** (ข้อยกเว้น footer ข้อเดียวที่อนุญาต เพราะ "ยกเลิก" ไม่มีความหมายเมื่อ session ตายแล้ว) · ตัวจริง: `session-expired-dialog.tsx` ของ auth-setup |

**3 zones** at the primitive (A8, `primitive-edits.md`): header line · body · footer = top line +
`bg-muted/40` edge to edge, buttons `cta`. **Read-only = no footer** (✕ closes). **Only title + short
description in `AlertDialogHeader`** (A9 — its grid squeezes content; put it after, e.g.
`ConfirmActionDialog` `children`). Footer: ยกเลิก (outline) ซ้าย · ยืนยัน (primary) ขวาสุด · **one primary per
dialog**. No dialog-over-dialog except one AlertDialog confirm over a form. A dirty form never closes
silently on Esc/outside-click. Value-picking overlays go through `ui/responsive-popover` (bottom sheet on phones,
A12) — never a raw `Popover`; kit DatePicker/DateRangePicker/Combobox still are (backlog §14) · `form-pages.md`.

## Badge vs StatusBadge

- `StatusBadge` (tone + **required** leading icon + label) — any
  single-dimension state: pending/approved/rejected, active/inactive, risk.
  Formula per tone: `border-status-x/40 bg-status-x/10 text-status-x-foreground`. Tones:
  success=emerald · warning=amber · danger=red · cancel=coral · info=sky · neutral=gray ·
  violet (7th, TK-VIO — one group the project names in DESIGN.md §10, never a spare color).
  **sky ≠ primary**: sky labels information, primary marks interactive — never swap.
- `--cat-1..8` (มติ 2026-10-16) = identity/grouping, white text: avatar via
  `avatarColorClass(stableId)` + `getInitials(name)` (`lib/avatar.ts`, skips
  Thai leading vowels) · group dots · chart series > 5. Never a status, never
  "clickable" — literal classes only.
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
กรอง `Filter` · เมนูแถว `MoreHorizontal` · สำเร็จ `CheckCircle2` · อนุมัติ `Check` ·
ปฏิเสธ/ปิด `X`. Decorative icons (text alongside) get `aria-hidden`. Icon-only
buttons only via `IconAction` (label → aria-label + tooltip, delay 0). Action
colors: ลบ=แดง · กู้คืน=เขียว · แก้ไข=น้ำเงิน · เพิ่ม/สร้าง/Import=primary
(มติ 2026-08-21) · บันทึก/submit ทั่วไป=primary · **ปุ่มตัดสินแบบมีข้อความ: อนุมัติ =
เขียวทึบ `success` + `Check` · ปฏิเสธ = `outline` + `border-destructive/40 text-destructive`
+ `X`** (มติ 2026-10-16 D6 — เขียว = ผลบวกของการตัดสิน แยกจากปุ่มบันทึก primary).
ในแถวตาราง (ไอคอนล้วน) สีมาจาก prop `tone` ไม่ใช่ชื่อ variant — ดูตารางข้างล่าง.

**`IconAction` tone (มติ 2026-08-23)** — 4 โทนเท่านั้น ห้ามเพิ่ม เพราะสีต้องบอก
"อันตรายแค่ไหน" ไม่ใช่ "action ตัวที่เท่าไร" (ในกล่อง 28px คนแยกออกแค่ 3-4 สี):

| tone | ใช้กับ | เหตุผล |
| --- | --- | --- |
| `neutral` | ดู · ดาวน์โหลด · พิมพ์ | อ่านอย่างเดียว ไม่เปลี่ยนข้อมูล |
| `info` | แก้ไข · ตั้งค่า · ตั้งรหัสผ่าน | เปลี่ยนข้อมูล แต่ย้อนได้ |
| `danger` | ลบ · ยกเลิก · ปฏิเสธ | ย้อนยากหรือย้อนไม่ได้ |
| `success` | กู้คืน · อนุมัติ | คืนสภาพ / เดินหน้าเชิงบวก |

สีดึงจาก `--status-*` **ชุดเดียวกับ `StatusBadge`** — ทั้งแอปจึงมีระบบสีชุดเดียว
ไม่ใช่ปุ่มใช้ `--primary` แต่ป้ายสถานะใช้ `--status-*` · พื้น 10% ตอนพัก → 20%
ตอน hover · **ตอนพักต้องมีพื้น**: ไอคอนเปล่าบนการ์ดขาวไม่มีอะไรบอกว่าเป็นปุ่ม
และมือถือไม่มี hover จึงไม่มีทางรู้เลย (กลับมติ 4.33.0 เฉพาะแถวตาราง)

`variant="ghost"` / `soft-*` ยังใช้ได้และควรใช้ **ใน toolbar ที่ปุ่มเรียงติดกันเยอะ**
(เช่น `ui/tiptap-editor` 8-10 ปุ่ม) — ที่นั่นปุ่มรวมกันเป็นแถบอยู่แล้ว จึงเห็นว่ากดได้
โดยไม่ต้องมีพื้นทุกใบ · ส่ง `tone` กับ `variant` พร้อมกันไม่ได้

หมายเหตุ "แดง" (มติ 2026-10-16 D6 แทนมติ 2026-08-21): ยืนยันลบ = `destructive` **แดงทึบ** · ปฏิเสธ =
`outline` ขอบแดง · ปุ่มรองหัวหน้า = `soft` (มีพื้น ≠ `soft-primary` โปร่งใส) — ตารางเลือก variant
อยู่ที่ `assets/ui/button-variants.md` · ห้ามแต่ง className รายจุดให้ปุ่มทึบ/จางเอง.

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

- Tabs: sub-views of one page · state in `?tab=` · > ~5 = split · each tab's primary action swaps in
  `PageActions` (none if it creates nothing; page-wide = constant `soft`) — `references/tabbed-pages.md`.
- Tooltip: `TooltipProvider` delay 0 · never the sole carrier of essential
  info (mobile has no hover).
- Chart: `ui/chart` (recharts via shadcn — `npx shadcn add chart` when the
  project first needs one) — no other chart lib, no hardcoded colors. Colors:
  generic series take `--chart-1..5` in order; a series that **is** a status
  (สำเร็จ/ข้าม/ผิดพลาด) takes the matching `--status-*` so the chart and the
  StatusBadge on the table tell the same story in the same color; categories
  that need more than 5 distinct colors take `--cat-1..8`. Working
  example: `ui/chart-example.tsx` (copy, adapt, delete).
- Rich text: tiptap via the kit's `ui/tiptap-editor` — no other editor lib,
  no second editor component. Deps are the `@tiptap/*` ^3 set; install only
  when the project actually has rich text.

## i18n — เพิ่มข้อความใหม่ต้องทำอะไร

ตั้งแต่ 4.46.0 ทุกข้อความที่ผู้ใช้เห็นในคิตอ่านจาก `messages/` ไม่ใช่จาก jsx

**เพิ่มข้อความในคอมโพเนนต์ของคิต** (ไฟล์ใต้ `components/ui/`):

1. เพิ่ม key ใน `messages/kit.th.ts` **และ** `messages/kit.en.ts` — key ต้องตรงกัน
   ทั้งสองไฟล์ ไม่งั้น `check-i18n.mjs` FAIL
2. เรียกด้วย `const t = useTranslations('kit.<namespace>')` แล้ว `t('key')`
3. มีตัวแปรแทรก ใช้ `{name}` ของ next-intl **ไม่ใช่** `${name}` ของ JS:
   `t('filterAria', { label })` คู่กับ `filterAria: 'กรอง {label}'`

**เพิ่มข้อความของโปรเจคเอง** (ไม่ใช่ของคิต): สร้าง `messages/app.th.ts` /
`app.en.ts` ของตัวเองแล้วลงทะเบียนใน `i18n/messages.ts` — **ห้ามเพิ่ม key ลง
ไฟล์ `kit.*`** เพราะ `/plugin update` เขียนทับไฟล์ของคิตทั้งไฟล์ ของที่เพิ่มเข้าไป
จะหายเงียบ (`ugt-nextjs-kit-sync` เตือนตอนไฟล์ตกรุ่น แต่กู้ของที่หายไปแล้วไม่ได้)

**คอมโพเนนต์ที่รับ label เป็น prop ไม่ต้องแตะ** — `ui/icon-action` `bulk-action-bar` `status-badge` `page-shell`
`card-heading` `view-toggle` `stat-card` `time-input` `settings-sheet` `responsive-popover` `query-state` `detail-*`
ออกแบบมาให้ผู้เรียกประกอบข้อความเองตั้งแต่ต้นแล้ว ผู้เรียกเป็นคนแปล
