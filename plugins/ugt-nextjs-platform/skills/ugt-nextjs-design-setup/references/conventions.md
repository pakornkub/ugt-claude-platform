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

Contents: §ถูก/ผิด · §Control selection ladder · §ตรวจ API · §Dialog ladder ·
§Badge vs StatusBadge · §Icon mapping (+ IconAction tone) · §Feedback ·
§Tabs · Tooltip · Chart · Rich text · §i18n. Split out into topic files:

- `datatable.md` — page-level filter bar + DataTable (modes, toolbar,
  pagination, consistency obligations, kit status)
- `export.md` — Excel/CSV export (route order, DO/DON'T, `lib/export.ts` guards)
- `kit-inventory.md` — every kit file with provenance

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

## ตรวจ API ของ primitive กับ registry ก่อนเขียน (อย่าเดาจากความจำ Radix)

ทุก component ใน `components/ui/` มาจาก preset **base-mira = Base UI** ไม่ใช่
Radix — ความจำจาก shadcn ยุค Radix จะพาไป API ที่ Base UI **เมินเงียบ ๆ**
(component render ปกติ แต่ prop ไม่ทำงาน) ซึ่งตรวจด้วยตาไม่เจอและเคยหลุดถึง
production มาแล้ว ("ปุ่ม logout กดไม่ได้", checkbox กลุ่มโชว์ติ๊กเต็ม)

**แหล่งอ้างอิงที่ถือว่าจริง** เรียงตามลำดับ:

1. **registry ของ base-mira ตรง ๆ** — คำตอบจริงของ preset นี้:

   ```bash
   curl -s https://ui.shadcn.com/r/styles/base-mira/<component>.json
   ```

   > ⚠️ **plugin เคยประกาศ shadcn MCP ไว้ ถอดออกแล้วใน 4.43.0** — ตรวจ
   > 2026-08-21/23: `get_component("button")` คืนโค้ดที่ `import { Slot } from
   > "radix-ui"`, มี `asChild`, ขนาด `h-9`, `destructive` แบบ solid คือ
   > **ตรงข้ามกับ preset ทุกข้อ** และไม่มีพารามิเตอร์ให้เลือก style · ส่วน
   > `list_blocks` ที่เป็นเหตุผลเดียวที่เหลือให้เก็บไว้ ก็ error
   > (`Unexpected response from GitHub API`) · ถ้าเครื่องไหนยังต่อ MCP ตัวนี้
   > อยู่เอง **ห้ามลอกโค้ดจากมันเข้า kit** เพราะจะพา `asChild` กลับมา
   > (บั๊กเดียวกับที่ 4.25.0 ต้องไล่แก้)

2. **type ของ Base UI ที่ติดตั้งจริง** — `node_modules/@base-ui/react/<part>/…d.ts`
   (คำตอบสุดท้ายเรื่อง prop ของ primitive เช่น `CheckboxRoot.d.ts`)
3. โปรเจคจริงที่เป็น base-mira (เช่น `gov-boi-smart`) — ระวัง: โปรเจคอาจแก้
   variant ของตัวเองไว้ จึงยืนยัน "ของ preset" ไม่ได้ 100%

**ตารางความต่างที่กัดบ่อย** (ตรวจกับ registry แล้ว 2026-08-21):

| Radix (ความจำเก่า) | base-mira / Base UI |
| --- | --- |
| `asChild` | `render={<X />}` |
| `onSelect` บน menu item | `onClick` (+ `closeOnClick={false}` ถ้าอยากค้างเมนู) |
| `checked="indeterminate"` | `checked={boolean}` + `indeterminate={boolean}` แยก prop |
| `data-[state=open]` | `data-open` / `data-closed` / `data-popup-open` |
| `TooltipProvider delayDuration` | `TooltipProvider delay` |
| `onEscapeKeyDown` / `onPointerDownOutside` / `onInteractOutside` / `forceMount` | ไม่มี — Base UI จัดการเอง/ชื่ออื่น |

`scripts/lint-kit-assets.mjs` ของรีโปนี้บล็อกทุกแถวในตารางตอน release แล้ว

## Dialog ladder

| งาน | ภาชนะ |
| --- | --- |
| ฟอร์มสั้น ≤ ~6 ช่อง | `FormDialog` (compound: `FormDialogContent/Header/Body/Footer`, prop `height`: `fluid`/`auto`/`fill`) — ห้ามประกอบ `Dialog` ดิบเป็นฟอร์ม |
| ฟอร์มยาว / หลายขั้น | หน้าแยก — container กึ่งกลาง **ไม่ครอบการ์ด**: มาตรฐาน `max-w-3xl mx-auto` grid 2 คอลัมน์ · ข้อมูลเยอะ/หลาย section `max-w-5xl` grid 3 คอลัมน์ + หัวข้อ section + เส้นคั่น (DESIGN.md §4 ฟอร์มแยกหน้า) |
| ฟอร์มที่มี list/checklist **โตตามข้อมูล** (นับเป็น "ยาว" เสมอแม้วันนี้สั้น — Dialog สูงคงที่ ข้อมูลไม่คงที่) | `Sheet` (body เลื่อน) หรือหน้าแยก — บทเรียน 4.25.0: ฟอร์มบทบาท "3 ช่อง" + checklist สิทธิ์ |
| panel เปิดค้างดูคู่เนื้อหา (filter ชุดใหญ่, preview) | `Sheet` |
| ดูรายละเอียด read-only | `detail-dialog-shell` + `detail-row`/`detail-section` |
| ยืนยัน destructive | `AlertDialog` ผ่าน `ConfirmActionDialog` — ปุ่มมีข้อความ ไม่ใช่ icon ล้วน |
| system alert บังคับ action เดียว (session หมดอายุ) | `AlertDialog` ปิดไม่ได้ — **ไม่มีปุ่มยกเลิก** (ข้อยกเว้น footer ข้อเดียวที่อนุญาต เพราะ "ยกเลิก" ไม่มีความหมายเมื่อ session ตายแล้ว) · ตัวจริง: `session-expired-dialog.tsx` ของ auth-setup |

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
ลบ=แดง · กู้คืน=เขียว · แก้ไข=น้ำเงิน · เพิ่ม/สร้าง/Import=primary (มติ
2026-08-21) · อนุมัติ/ยืนยันเชิงบวก=เขียวทึบ (`success`).
ในแถวตาราง สีมาจาก prop `tone` ไม่ใช่ชื่อ variant — ดูตารางข้างล่าง.

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

หมายเหตุ "แดง": `destructive` ของ preset เป็น**พื้นจาง**
(`bg-destructive/10 text-destructive`) ไม่ใช่แดงทึบ — มติ 2026-08-21 ยึด preset
ไม่เพิ่ม variant แดงทึบของเราเอง ปุ่มยืนยันลบจึงออกมาเป็นแดงจาง.

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
- Chart: `ui/chart` (recharts via shadcn — `npx shadcn add chart` when the
  project first needs one) — no other chart lib, no hardcoded colors. Colors:
  generic series take `--chart-1..5` in order; a series that **is** a status
  (สำเร็จ/ข้าม/ผิดพลาด) takes the matching `--status-*` so the chart and the
  StatusBadge on the table tell the same story in the same color. Working
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

**คอมโพเนนต์ที่รับ label เป็น prop ไม่ต้องแตะ** — `ui/icon-action.tsx`,
`ui/bulk-action-bar.tsx`, `ui/status-badge.tsx`, `ui/page-shell.tsx`,
`ui/query-state.tsx`, `ui/detail-*.tsx` ออกแบบมาให้ผู้เรียกประกอบข้อความเอง
ตั้งแต่ต้นแล้ว ผู้เรียกเป็นคนแปล
