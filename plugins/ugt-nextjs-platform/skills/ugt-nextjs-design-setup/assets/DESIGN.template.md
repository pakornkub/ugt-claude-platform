# {{PROJECT_NAME}} — Design Agreement

> Gen โดย ugt-nextjs-design-setup เมื่อ {{DATE}} ·
> อิงมาตรฐานกลาง `ugt-core/contracts/design.md` (ugt-core **{{STD_VERSION}}**)
> Token จริงอยู่ที่ `app/globals.css` — ไฟล์นี้คือข้อตกลง "ใช้อย่างไร"
> เปลี่ยนข้อตกลง = แก้ไฟล์นี้ + เพิ่มแถวใน "มติ" (ส่วน 10) พร้อมวันที่และเหตุผล
> Plugin อัปเดตมาตรฐานกลาง = สั่ง "sync ข้อตกลง design" — diff ให้ดูแล้ว
> บันทึกเป็นมติ ไม่ทับของเดิมเงียบ ๆ

## 0. กฎเหล็ก (ทุกโปรเจคเหมือนกัน — ไม่มีข้อยกเว้น)

1. **shadcn-first ladder**: primitive → block/template → compose →
   custom ได้เฉพาะ Tailwind utilities · ห้ามเขียน component ที่ shadcn มี ·
   ห้าม raw CSS / CSS-in-JS / inline style (ยกเว้นค่า dynamic จริง) ·
   `globals.css` รับเฉพาะ token / `@layer` / pattern ที่ utility เขียนไม่ได้
2. **แก้ไฟล์ใน `components/ui/` ได้เฉพาะ** variant ที่ประกาศในส่วน 4 —
   นอกนั้นห้ามแตะ (อัปเดตจาก registry: `npx shadcn@latest add <x> --overwrite`)
3. **Icon = lucide เท่านั้น ห้าม emoji** · mapping งาน→icon ตายตัว (ส่วน 4)
4. **ขนาด = `default` ทุกตัว** · ข้อยกเว้น: ปุ่มใน row ตาราง = `size="icon"`
   (ผ่าน `IconAction`) · toolbar แน่น = `sm` — จบแค่นี้
5. **ตาราง = `DataTable` กลางเท่านั้น** — ห้าม `<table>`/`ui/table` ตรงในหน้า
6. **วันที่/ตัวเลขผ่าน `lib/format.ts` เท่านั้น** — ห้าม format inline
7. **A11y ขั้นต่ำ**: สถานะ = สี+icon เสมอ · ปุ่ม icon ล้วนผ่าน `IconAction` ·
   ห้ามปิด focus ring · motion เงียบเมื่อ `prefers-reduced-motion` ·
   แก้สีเมื่อไรรัน `check-contrast` ซ้ำ
8. ไฟล์นี้ชนะโค้ดและชนะ skill เสริมความสวยงาม (`frontend-design`,
   `impeccable`) — ขัดกันเมื่อไรยึดไฟล์นี้

## 1. Visual identity

- **แหล่งอ้างอิง**: {{REFERENCE}}
- **primary**: {{PRIMARY}} — ใช้กับ **interactive เท่านั้น** (ปุ่มหลัก, ลิงก์,
  focus ring, สถานะเลือก) · dark mode สว่างกว่า light เสมอ
- **base**: neutral tint เย็น hue ~258 chroma 0.004–0.02 — ห้ามเทา chroma 0
- **dark mode**: {{DARK_MODE}} · กฎ dark: border ≥ ขาว 16% · elevation จาก
  lightness (background < card < popover)
- **สีสถานะ 6 ตัว** (`--status-*` + `-foreground` — ค่ากลางองค์กร):
  amber=รอ/เตือน · emerald=สำเร็จ · red=ปฏิเสธ/ลบ · coral=ขอยกเลิก ·
  sky=ข้อมูล/ระบบ (**ไม่ใช่ของกดได้ — นั่นคือ primary**) · gray=ยกเลิก/ร่าง ·
  ใช้ผ่าน `StatusBadge` เท่านั้น (tone + icon บังคับ)
- **สีปุ่ม action**: ลบ=แดง · กู้คืน=เขียว · แก้ไข=น้ำเงิน · เพิ่ม/Import=
  เขียวทึบ · ในตารางใช้ variant `soft-*`
- **เมนู** (จาก preset กลาง): สี Default · พื้นทึบ (Solid — ไม่ใช้
  translucent/blur) · highlight แบบ Subtle (พื้นจาง ไม่ใช่แถบ primary เต็ม)

## 2. Typography

- **Inter + Noto Sans Thai** ผ่าน `next/font` · mono = Geist Mono ·
  ฐาน html 16px ไม่ override
- น้ำหนัก 400/500 · 600 เฉพาะ title หน้า ·
  Title: `text-2xl font-semibold tracking-tight` ไม่มีไอคอนนำ
- **ห้าม uppercase eyebrow กับข้อความไทย** (ไทยไม่มี case + tracking ทำสระลอย)
- ตาราง `text-xs` ตั้งที่ราก `ui/table.tsx` จุดเดียว — ห้าม override ราย cell ·
  ตัวเลขชิดขวา tabular

## 3. Layout & app shell

- **Shell**: {{SHELL}} (จาก shadcn block — ดู layout-shells.md ของ skill)
- เมนู: icon+label เสมอ · จัดกลุ่มเมื่อเกิน ~7 · ลึกสุด 2 ชั้น · ลำดับ
  งานหลัก→รายงาน→ตั้งค่า/admin · **ซ่อนตามสิทธิ์ ไม่ disable** (guard ฝั่ง
  server คือเส้นกั้นจริง)
- User menu (avatar+ชื่อ+logout): sidebar = ล่างสุด · topbar = dropdown ขวาสุด
- **Logo บริษัท** (`public/brand/` — SVG ย้อมสีผ่าน CSS `color`):
  header ของ shell = `ube-logo-short.svg` · หน้า login/landing =
  `ube-logo-long.svg` (มี tagline) — ห้าม embed logo เป็นรูปอื่น/สีเพี้ยน
- Nav highlight: longest-prefix ด้วย `${href}/` · เมนูล้น = scroll แนวนอน
  ห้าม wrap
- โครงทุกหน้า: page title + actions ขวาบน + เนื้อหาในการ์ด — pattern เดียว
  ทุกหน้า · breadcrumb เมื่อลึกเกิน 2 ชั้น วางเหนือ title
- Mobile เป็นระบบ: ตาราง→การ์ด (DataTable จัดให้) · dialog→bottom-sheet
- Landing page: {{LANDING}}

## 4. Components

- Density ตระกูล mira: control `h-7` · ตาราง `text-xs` — ทุก breakpoint
  เท่ากัน ไม่ bump บนมือถือ
- เลือก control: ≤5 = RadioGroup · 6–15 = Select · >15/ค้นหา = Combobox ·
  วันที่ = `ui/date-picker` เสมอ (ยกเว้น filter ปี/เดือน = Select)
- Form: label บนช่อง · required = `*` แดง · error ใต้ช่องผ่าน `ui/field`
  (zod + react-hook-form) · validate ตอน submit แล้ว re-validate ต่อ field
- Dialog ladder: ฟอร์ม ≤6 ช่อง = `FormDialog` (compound + height
  `fluid`/`auto`/`fill`) · ยาว = หน้าแยก · panel ค้าง = `Sheet` ·
  read-only = `detail-dialog-shell` · destructive = `ConfirmActionDialog`
  ปุ่มมีข้อความ
- Footer dialog: ยกเลิก (outline) ซ้าย · ยืนยัน primary ขวาสุด · primary
  **ปุ่มเดียว**ต่อ dialog · ห้ามซ้อน dialog (ยกเว้น AlertDialog ยืนยัน 1 ชั้น)
  · ฟอร์ม dirty ปิดต้องถามก่อน
- Variant เพิ่มที่อนุญาต: Button `success`, `soft-primary`,
  `soft-destructive`, `soft-success`, `field` (trigger ของ
  datepicker/combobox — ผิวเหมือน Input) — เพิ่มอื่นต้องเป็นมติส่วน 10
- Row actions: ≤3 = `IconAction` · >3 = `DropdownMenu` + `MoreHorizontal`
- **Icon mapping**: เพิ่ม `Plus` · แก้ไข `Pencil` · ลบ `Trash2` · กู้คืน
  `RotateCcw` · ดู `Eye` · Import `Upload` · Export `Download` · ค้นหา
  `Search` · กรอง `Filter` · เมนูแถว `MoreHorizontal` · สำเร็จ `CheckCircle2`
  · ปิด `X` — งานเดียวกันห้ามคนละไอคอน
- **Badge**: `StatusBadge` = สถานะเท่านั้น · `Badge` ธรรมดา = label/จำนวน —
  ห้ามสีสถานะ inline · mapping สถานะ→tone ประกาศที่เดียวต่อ domain
- Tabs: มุมมองย่อยในหน้าเดียว · tab หลักของหน้า = `?tab=` ใน URL · เกิน ~5
  = แตกหน้า
- Tooltip: delay 0 · ห้ามซ่อนข้อมูลจำเป็นไว้ใน tooltip อย่างเดียว
- Chart: `ui/chart` + `--chart-1..5` เท่านั้น · Rich text: tiptap ผ่าน
  component กลางเท่านั้น
- **DataTable ชุดมาตรฐานเต็ม**: global search · filter รายคอลัมน์
  (Popover+chip+clear) · sort · pagination (default 10 · 10/20/50) · dnd
  สลับคอลัมน์ · ซ่อน/แสดงคอลัมน์ (จำ localStorage) · คืนค่าเริ่มต้น — ปิดได้
  ราย prop
- **เกณฑ์โหมดตาราง (ตัดสินรายตารางตอนเขียน)**: ข้อมูล bounded ดึงทั้งชุด =
  client (default) · ข้อมูลโตไม่จำกัด/query paginate ฝั่ง server = **โหมด
  server (URL-state) ทั้ง sort/filter/paginate — ห้าม sort ฝั่ง client บน
  ข้อมูลที่เห็นไม่ครบ**

## 5. Format การแสดงผล (ทุกตัวผ่าน `lib/format.ts`)

- จอ: `DD/MM/YYYY` **{{ERA}}** · มีเวลา = เติม `HH:MM` · wall-clock date
  อ่าน UTC parts (กันเลื่อนวัน) · instant จริงแสดงเวลาไทย Asia/Bangkok
- **ไฟล์ export (Excel/CSV): ISO `yyyy-MM-dd` เสมอ** — คนละมาตรฐานกับจอ
  โดยตั้งใจ (DD/MM ทำ Excel สลับวัน-เดือนตาม locale ผู้รับ)
- ตัวเลข: comma คั่นหลักพัน · ทศนิยมตามที่ DB ให้ ไม่ปัดเอง · ค่าว่าง = `-`
- **ภาษา UI**: {{LANG}}
- ศัพท์บังคับ: `requirements/glossary.md` (ถ้ามี)

## 6. Feedback & states

- Toast: success=สำเร็จจริง · error=พังจริง · warning=มีเงื่อนไข · info=เฉย ๆ
  — ห้าม `toast.error` แทน warning
- Loading: `Skeleton` โครง · spinner ในปุ่ม (disabled) สำหรับ action ·
  data state ผ่าน `ui/query-state` — ไม่เขียน if-loading เอง
- Empty: `ui/empty` ทุกกรณี (ตารางว่าง/ไม่มีสิทธิ์/404) — icon + ข้อความ +
  CTA ถ้ามีทางไปต่อ
- Error ระดับหน้า: banner บนสุดของการ์ด · ระดับ field: ใต้ช่องผ่าน `ui/field`

## 7. Motion

- 4 กฎ: (1) ไม่มีแล้วไม่เสียอะไร = ไม่ใส่ (2) CSS ก่อน · `motion` เฉพาะ
  layoutId/AnimatePresence (3) 150–250ms ease-out ระยะ ≤12px (4) ทุกจุดเงียบ
  เมื่อ `prefers-reduced-motion`
- ที่มากับ shadcn/tw-animate (dialog, dropdown, skeleton) = พอแล้ว — เพิ่ม
  จุดใหม่เมื่อไรบันทึกลง `docs/MOTION.md`

## 8. Governance

- ไฟล์นี้คือ source of truth ของ design — ขัดกันเมื่อไรไฟล์นี้ชนะโค้ด
- Skill เสริมความสวยงามใช้ช่วยคิดได้ แต่ผลลัพธ์ห้ามขัดไฟล์นี้
- คำถาม design ที่ยังไม่ปิด → `docs/design-questions.md` (คำถาม + พฤติกรรม
  ระหว่างรอ — ไม่บล็อกงาน)

## 9. Deviations (เฉพาะโปรเจคเดิม — จาก scan ตอนติดตั้ง)

| จุดที่ขัดข้อตกลง | ตัดสินใจ | หมายเหตุ |
| --- | --- | --- |
| {{DEVIATIONS}} | | |

## 10. มติ (decision log)

| วันที่ | มติ | เหตุผล |
| --- | --- | --- |
| {{DATE}} | ติดตั้งข้อตกลงฉบับแรก — {{ANSWERS_SUMMARY}} | ตาม interview ({{ANSWERED_BY}}) |
