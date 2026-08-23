# __PROJECT_NAME__ — Design Agreement

> Gen โดย ugt-nextjs-design-setup เมื่อ __DATE__ ·
> อิงมาตรฐานกลาง `ugt-core/contracts/design.md` (ugt-core **__STD_VERSION__**)
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
4. **ขนาด = `default` ทุกตัว** · ข้อยกเว้น: **ปุ่มไอคอนล้วนใช้ `size="icon"`
   ได้ทุกที่** (`aria-label` บังคับ — มติ 2026-08-21 ขยายกฎให้ตรงของจริง: theme
   toggle · SidebarTrigger · ปุ่มตั้งค่าคอลัมน์ · ปุ่ม pagination) · **แต่ปุ่มใน
   row ตารางต้องผ่าน `IconAction` เสมอ** — ที่นั่น tooltip คือสิ่งเดียวที่บอกว่า
   ไอคอนแต่ละตัวทำอะไร · toolbar แน่น = `sm` · **ห้าม override กล่องขนาดของ control
   ด้วย className** (`h-*` `p-*` `size-*` เช่น `size-7 p-0`) — ไม่พอให้แก้ที่
   `components/ui/button.tsx` · ข้อยกเว้นสองอย่าง: `w-*`/`w-full` เป็น layout
   ไม่ใช่ขนาด control · `variant="link"` เป็นข้อความไม่ใช่ปุ่ม จึงถอด `h-auto p-0`
   ได้ (base-mira ไม่ได้ล้าง padding ให้ variant นี้)
5. **ตาราง = `DataTable` กลางเท่านั้น** — ห้าม `<table>`/`ui/table` ตรงในหน้า
6. **วันที่/ตัวเลขผ่าน `lib/format.ts` เท่านั้น** — ห้าม format inline
7. **A11y ขั้นต่ำ**: สถานะ = สี+icon เสมอ · ปุ่ม icon ล้วนต้องมี `aria-label`
   (ในตาราง = ผ่าน `IconAction` ซึ่งบังคับ label ให้เอง) ·
   ห้ามปิด focus ring · motion เงียบเมื่อ `prefers-reduced-motion` ·
   แก้สีเมื่อไรรัน `check-contrast` ซ้ำ
8. ไฟล์นี้ชนะโค้ดและชนะ skill เสริมความสวยงาม (`frontend-design`,
   `impeccable`) — ขัดกันเมื่อไรยึดไฟล์นี้

## 1. Visual identity

- **แหล่งอ้างอิง**: __REFERENCE__
- **primary**: __PRIMARY__ — ใช้กับ **interactive เท่านั้น** (ปุ่มหลัก, ลิงก์,
  focus ring, สถานะเลือก) · dark mode สว่างกว่า light เสมอ
- **base**: neutral tint เย็น hue ~258 chroma 0.004–0.02 — ห้ามเทา chroma 0
- **dark mode**: __DARK_MODE__ · กฎ dark: border ≥ ขาว 16% · elevation จาก
  lightness (background < card < popover)
- **สีสถานะ 6 ตัว** (`--status-*` + `-foreground` — ค่ากลางองค์กร):
  amber=รอ/เตือน · emerald=สำเร็จ · red=ปฏิเสธ/ลบ · coral=ขอยกเลิก ·
  sky=ข้อมูล/ระบบ (**ไม่ใช่ของกดได้ — นั่นคือ primary**) · gray=ยกเลิก/ร่าง ·
  ใช้ผ่าน `StatusBadge` เท่านั้น (tone + icon บังคับ)
- **สีปุ่ม action**: ลบ=แดง · กู้คืน=เขียว · แก้ไข=น้ำเงิน · เพิ่ม/สร้าง/Import=
  **primary** (มติ 2026-08-21 — CTA หลักของหน้า; เดิมเคยเขียนเขียวทึบแต่ของจริง
  ทั้งหมดเป็น primary) · อนุมัติ/ยืนยันเชิงบวก=เขียวทึบ (`success`) ·
  ในตารางใช้ variant `soft-*`
- **เมนู** (จาก preset กลาง): สี Default · พื้นทึบ (Solid — ไม่ใช้
  translucent/blur) · highlight แบบ Subtle (พื้นจาง ไม่ใช่แถบ primary เต็ม)
- **มุมโค้ง = ใช้ของ preset `base-mira` ทั้งชุด ไม่ตั้งทับ** (มติ 2026-08-09):
  `--radius: 0.45rem` (7.2px) แล้ว shadcn คำนวณระดับที่เหลือจากตัวนี้ด้วยการคูณ:

  | tier | px | ใช้กับอะไรจริง |
  | --- | --- | --- |
  | `sm` ×0.6 | 4.3 | **องค์ประกอบย่อยใน control** — ปุ่ม `size="xs"`/`icon-xs` · จุดที่รับ focus ring แต่ไม่ใช่ปุ่มเต็มตัว (ปุ่ม ✕ ของ chip, จุดจับลากคอลัมน์, ปุ่ม sort ในหัวตาราง) · tooltip · เมนูใน sidebar |
  | `md` ×0.8 | 5.8 | **control หลัก** — input / select / button |
  | `lg` ×1 | 7.2 | **การ์ด** |
  | `xl` ×1.4 | 10.1 | **overlay** — dialog / popover / dropdown |

  > **Badge / StatusBadge / chip ไม่ได้อยู่ในสเกลนี้** — ใช้ `rounded-full`
  > (แคปซูล) เสมอ · อย่าสับสนกับ `sm` ที่บางเอกสารเคยเรียกผิดว่า "chip"
  - **ปรับความโค้งทั้งแอปได้ที่ `--radius` ตัวเดียว** — ทุกระดับขยับตามเอง ·
    การเปลี่ยนค่านี้เป็น**มติ** เพราะกระทบทุกหน้า
  - บทบาทที่ใช้จริงมี 4 ระดับ: chip → control → card → overlay ·
    **ห้ามใช้ `rounded-2xl`/`3xl`/`4xl`** ถึงแม้ preset จะนิยามไว้ให้ก็ตาม
    (`verify.mjs` ตรวจให้) และ **ห้าม override ราย callsite** ใช้ตัวแปรเสมอ
  > ทำไมไม่ตั้งเอง: mira ออกแบบมาสำหรับ UI ข้อมูลหนาแน่นอยู่แล้ว และค่าที่มัน
  > ให้มาที่ระดับเล็กแทบตรงกับที่องค์กรเคยตั้งมือไว้ (control 5.8 vs 6 ·
  > chip 4.3 vs 4) ต่างกันจริงแค่การ์ด (7.2 vs 12) กับ overlay (10.1 vs 14)
  > — การรับของ preset จึงได้สเกลที่สอดคล้องกันทั้งชุด และได้ปุ่มปรับตัวเดียว
  > แทนเลขตายตัวสี่ตัวที่ขยับตามกันไม่ได้

## 2. Typography

- **Inter + Noto Sans Thai** ผ่าน `next/font` · mono = Geist Mono ·
  ฐาน html 16px ไม่ override
- น้ำหนัก 400/500 · 600 เฉพาะ title หน้า ·
  Title: `text-2xl font-semibold tracking-tight` ไม่มีไอคอนนำ
- **ห้าม uppercase eyebrow กับข้อความไทย** (ไทยไม่มี case + tracking ทำสระลอย)
- ตาราง `text-xs` ตั้งที่ราก `ui/table.tsx` จุดเดียว — ห้าม override ราย cell ·
  ตัวเลขชิดขวา tabular

## 3. Layout & app shell

- **Shell**: __SHELL__ (จาก shadcn block — ดู layout-shells.md ของ skill)
- เมนู: icon+label เสมอ · จัดกลุ่มเมื่อเกิน ~7 · ลึกสุด 2 ชั้น · ลำดับ
  งานหลัก→รายงาน→ตั้งค่า/admin · **ซ่อนตามสิทธิ์ ไม่ disable** (guard ฝั่ง
  server คือเส้นกั้นจริง)
- **User menu = `NavUser` เสมอ** (มาจาก `ugt-nextjs-auth-setup`): sidebar =
  ล่างสุด · topbar = dropdown ขวาสุด · ปุ่มแสดง avatar + ชื่อ + อีเมล +
  `MoreVertical` · เมนูมี 2 รายการตายตัว (+ **เปลี่ยนรหัสผ่าน** เฉพาะบัญชี
  local — บัญชี SSO/LDAP เปลี่ยนที่ directory ขององค์กร) — **บัญชีผู้ใช้**
  (เปิดการ์ดโปรไฟล์)
  และ **ออกจากระบบ** (มี spinner ระหว่างรอ · SSO ใช้ backchannel logout)
- **การ์ดโปรไฟล์** (เปิดจาก NavUser): banner ไล่สี → avatar ซ้อนขึ้นมา → ชื่อ →
  `Badge` ชื่อ role → รายการข้อมูลแบบ label–ค่า · แถวมาตรฐานคือ **อีเมล** กับ
  **วิธี Login ล่าสุด** (sso/ldap/local) · ข้อมูลเฉพาะโปรเจค (รหัสพนักงาน
  ตำแหน่ง แผนก) ใส่ผ่าน prop `extraRows` · **read-only ห้ามแก้ไขในนี้**
  > **มติ 2026-08-09 — ข้อยกเว้นที่บันทึกไว้**: การ์ดโปรไฟล์ใช้เส้นคั่นรายแถว
  > (`divide-y`) ได้ ทั้งที่ §4 ห้าม detail dialog ทั่วไปทำ — เพราะเป็นรายการ
  > สั้นชุดเดียว การแบ่ง section จะกลายเป็นหัวข้อที่ตั้งขึ้นมาลอย ๆ ·
  > ข้อยกเว้นนี้ใช้ได้เฉพาะการ์ดโปรไฟล์ ที่อื่นยังใช้ `DetailDialogShell` ตามเดิม
- **Logo บริษัท** (`public/brand/` — SVG ย้อมสีผ่าน CSS `color`):
  header ของ shell = `ube-logo-short.svg` · หน้า login/landing =
  `ube-logo-long.svg` (มี tagline) — ห้าม embed logo เป็นรูปอื่น/สีเพี้ยน
- Nav highlight: longest-prefix ด้วย `${href}/` · เมนูล้น = scroll แนวนอน
  ห้าม wrap
- **กฎ overflow — ข้อมูลต้องไม่หายเงียบ ๆ** (มติ 2026-08-09 จากบั๊กจริง):

  | จุด | ต้องเป็น |
  | --- | --- |
  | ตาราง แกน X | เลื่อนได้เสมอ (`scrollX` default = จริง) · จะ clip ต้องส่ง `scrollX={false}` **พร้อมคอมเมนต์เหตุผล** |
  | ตาราง แกน Y | เลื่อนตามหน้า + หัวตาราง `sticky` — ห้ามใส่ `max-h` ให้ตารางจนเกิด scroll ซ้อน |
  | Sidebar แนวตั้ง | เมนูยาวเกินจอต้องเลื่อนได้ **และเห็น scrollbar** — เปลี่ยน `no-scrollbar` ของ block เป็น `scroll-thin` |
  | Topbar แนวนอน | scroll แนวนอน ห้าม wrap |

  > `no-scrollbar` ของ shadcn คือ `scrollbar-width: none` + ซ่อน webkit
  > scrollbar — เลื่อนได้แต่**ไม่มีอะไรบอกผู้ใช้ว่ายังมีเมนูอีก** เราจึงเอาออก
  > หลักเดียวกันทั้งหมด: ถ้าเนื้อหาเกินกรอบ ต้องมีร่องรอยให้เห็น ห้ามตัดทิ้งเงียบ
- โครงทุกหน้า: page title + actions ขวาบน + เนื้อหาในการ์ด — pattern เดียว
  ทุกหน้า · breadcrumb เมื่อลึกเกิน 2 ชั้น วางเหนือ title
- **แถบ filter ระดับหน้า** (filter ที่อยู่นอกตาราง เช่น ปี/เดือน/หน่วยงาน):
  อยู่ใน**หัวการ์ดเดียวกับตาราง** (ไม่ลอยเหนือการ์ด ไม่แยกการ์ด) · **ชิดซ้าย**
  เรียง**กว้างไปแคบ**: ช่วงเวลา → หน่วยงาน/ขอบเขต → สถานะ · ปุ่ม action ของหน้า
  ยังอยู่ขวาบนใน `PageActions` เหมือนเดิม ห้ามย้ายลงมาปนแถบ filter ·
  control เลือกตามบันไดส่วน 4 (≤5 = RadioGroup · 6–15 = Select · >15 =
  Combobox · ช่วงวันที่ = `ui/date-range-picker`) — **ห้ามใช้ Input เปล่า
  เป็น filter** ยกเว้นช่องค้นหาอิสระ ซึ่งเป็นของ DataTable อยู่แล้ว
  ห้ามทำซ้ำที่แถบนี้
  > เหตุผลที่พินตำแหน่ง: หน้าที่ทำทีหลังจะได้ไม่หลุดไปวางขวา/แยกการ์ด แล้ว
  > ผู้ใช้ต้องมองหา filter ใหม่ทุกหน้า
- Mobile เป็นระบบ: ตาราง→การ์ด (DataTable จัดให้) · dialog→bottom-sheet
- Landing page: __LANDING__

## 4. Components

- **สเกล control**: __CONTROL_SCALE__
  (ค่า kit = mira: control `h-7` 28px · ตาราง `text-xs` — โปรเจคใหม่ใช้ค่านี้;
  โปรเจคเดิมที่ตอบข้อ 9 = "ยึดของเดิม" บันทึกค่าที่วัดจริงแทน เช่น
  "control 48px `h-12` · `text-base` · radius 8px — อ้างมติในส่วน 10" และ rebase
  `components/ui/*` ตาม §Scale bridge ของ skill) — ทุก breakpoint เท่ากัน
  ไม่ bump บนมือถือ
- **กฎสเกล**: control ทุกตัวในฟอร์มเดียวกันสูงเท่ากันเสมอ · เปลี่ยนขนาดได้ที่
  `components/ui/*` ต้นทางเท่านั้น — ห้าม override ขนาดรายหน้า/รายจุด
- เลือก control: ≤5 = RadioGroup · 6–15 = Select · >15/ค้นหา = Combobox ·
  วันที่ = `ui/date-picker` เสมอ (ยกเว้น filter ปี/เดือน = Select)
- Form: label บนช่อง · required = `*` แดง · error ใต้ช่องผ่าน `ui/field`
  (zod + react-hook-form) · validate ตอน submit แล้ว re-validate ต่อ field
  > **`*` ต้องอยู่บรรทัดเดียวกับข้อความ label เสมอ** — ตัว label เป็น flex row
  > ไม่ใช่ grid item แยก ไม่งั้น `*` ตกลงบรรทัดใหม่ กลายเป็นดาวลอยเหนือช่อง
- **แถวคู่ label–ค่า** (detail dialog, สรุป, การ์ดข้อมูล): flex `justify-between`
  + `align-items:center` + ระยะระหว่างคอลัมน์ ≥16px + ความสูงแถวขั้นต่ำ ~24px
  — ค่าที่เป็น `StatusBadge` จะได้ไม่ชนข้อความฝั่งซ้าย (badge สูงกว่าข้อความธรรมดา)
- Dialog ladder: ฟอร์ม ≤6 ช่อง = `FormDialog` (compound + height
  `fluid`/`auto`/`fill`) · ยาว = หน้าแยก · panel ค้าง = `Sheet` ·
  read-only = `detail-dialog-shell` · destructive = `ConfirmActionDialog`
  ปุ่มมีข้อความ
  > **นิยาม "ยาว" ให้นับเนื้อหาที่โตตามข้อมูลด้วย** — ฟอร์มที่มี
  > list/checklist ซึ่งความยาวขึ้นกับข้อมูลจริง (เช่น checklist สิทธิ์ที่โต
  > ตาม `ALL_PERMISSIONS`) ถือว่า "ยาว" เสมอแม้วันนี้จะสั้น เพราะ Dialog
  > สูงคงที่แต่ข้อมูลไม่คงที่ → ใช้ `Sheet` (body เลื่อน) หรือหน้าแยก
  > (บทเรียนจริง 4.25.0: ฟอร์มบทบาท "3 ช่อง" เลยถูกยัดใส่ Dialog
  > จน checklist สูงเกินจอแล้ว scroll ไม่ได้)
- Footer dialog: ยกเลิก (outline) ซ้าย · ยืนยัน primary ขวาสุด · primary
  **ปุ่มเดียว**ต่อ dialog · ห้ามซ้อน dialog (ยกเว้น AlertDialog ยืนยัน 1 ชั้น)
  · ฟอร์ม dirty ปิดต้องถามก่อน
- Variant เพิ่มที่อนุญาต: Button `success`, `soft-primary`,
  `soft-destructive`, `soft-success`, `field` (trigger ของ
  datepicker/combobox — ผิวเหมือน Input) — เพิ่มอื่นต้องเป็นมติส่วน 10
- Row actions: ≤3 = `IconAction` · >3 = `DropdownMenu` + `MoreHorizontal`
  > **ทำไม่ได้เพราะสิทธิ์ = ซ่อนปุ่ม** (กฎ §3) · **ทำไม่ได้เพราะ business
  > rule** (แถว system, มีข้อมูลผูกอยู่) = **disabled + tooltip บอกเหตุผล**
  > (มติ 2026-08-21 — ผู้ใช้ต้องเห็นว่าปุ่มมีแต่ใช้ไม่ได้เพราะอะไร;
  > `IconAction` รองรับ `disabled` พร้อม tooltip แล้ว ให้ label เป็นเหตุผล)
- **Icon mapping**: เพิ่ม `Plus` · แก้ไข `Pencil` · ลบ `Trash2` · กู้คืน
  `RotateCcw` · ดู `Eye` · Import `Upload` · Export `Download` · ค้นหา
  `Search` · กรอง `Filter` · เมนูแถว `MoreHorizontal` · สำเร็จ `CheckCircle2`
  · ปิด `X` — งานเดียวกันห้ามคนละไอคอน
- **Badge — มี component แค่ 2 ตัว `Badge` กับ `StatusBadge` (ซึ่งสร้างจาก
  `Badge variant="outline"`) ส่วน "chip" คือวิธีใช้ Badge แบบหนึ่ง ไม่ใช่ของใหม่**:

  | กรณี | ใช้ |
  | --- | --- |
  | สถานะ (รอ/อนุมัติ/ปฏิเสธ/ยกเลิก) | `StatusBadge` — tone + **ไอคอนบังคับ** |
  | ป้ายกำกับ/ตัวระบุ (ชื่อ role, ประเภท, template) | `Badge variant="outline"` ข้อความล้วน **ห้ามสีสถานะ** |
  | ตัวเลขนับ | `Badge` + `tabular-nums` |
  | chip ตัวกรองที่กดปิดได้ | `Badge variant="secondary"` + ปุ่ม ✕ |
  | ป้ายสีที่ต้องไม่มีไอคอน (เช่น IN/OUT ใน log ดิบ) | `Badge variant="outline"` + `TONE_STYLES` — ห้ามประกาศสีใหม่ |

  mapping สถานะ→tone ประกาศที่เดียวต่อ domain · ทุกตัวเป็น `rounded-full`
- **ตัวเลขนับท้ายเมนู sidebar** (มติ 2026-08-09): ใช้ได้เฉพาะเมนูที่มี
  **งานรอผู้ใช้คนนั้นทำ** (คิวอนุมัติ ฯลฯ) ไม่ใช่จำนวนข้อมูลทั่วไป ·
  `<Badge className="ml-auto h-5 min-w-5 rounded-full px-1 text-xs tabular-nums">` ·
  **เป็น 0 ให้ซ่อน ไม่แสดงเลข 0** · เกิน 99 แสดง `99+` · ตัวเลขต้องมาจาก
  query ที่ scope ตามสิทธิ์ผู้ใช้แล้ว ไม่ใช่ยอดรวมทั้งระบบ
- Tabs: มุมมองย่อยในหน้าเดียว · tab หลักของหน้า = `?tab=` ใน URL · เกิน ~5
  = แตกหน้า
- Tooltip: delay 0 · ห้ามซ่อนข้อมูลจำเป็นไว้ใน tooltip อย่างเดียว
- Chart: `ui/chart` + `--chart-1..5` เท่านั้น · Rich text: tiptap ผ่าน
  component กลางเท่านั้น
- **DataTable ชุดมาตรฐานเต็ม**: global search · filter รายคอลัมน์
  (Popover+chip+clear) · sort · pagination (default 10 · 10/20/50) · dnd
  สลับคอลัมน์ · ซ่อน/แสดงคอลัมน์ (จำ localStorage) · คืนค่าเริ่มต้น — ปิดได้
  ราย prop · **ห่อการ์ดเดียวทั้งชุดเอง** (toolbar หัวการ์ด · ตารางชิดขอบ ·
  pagination ท้ายการ์ด — มติ 2026-08-21 ตาม §3 "เนื้อหาในการ์ด") ห้ามห่อการ์ด
  ซ้อนอีกชั้น; ตารางใน dialog/sheet ส่ง `card={false}`
- **Pagination ของตาราง = แถวต่อหน้า + "หน้า X จาก Y" + ปุ่มไอคอน 4 ตัว**
  (แรก · ก่อน · ถัดไป · สุดท้าย — ตัวแรก/สุดท้ายซ่อนบนจอเล็ก) — **ไม่มีรายการเลขหน้า
  2 3 4 … 10 11** (มติ 2026-08-09: เลขหน้ากินพื้นที่และพังตอนข้อมูลว่าง
  จะเปลี่ยนต้องเป็นมติใหม่เพราะกระทบทุกโปรเจค)
- **ปุ่มไอคอนในตารางใช้ `size="icon"` ล้วน ห้าม hardcode `size-8`/`h-8` ทับ**
  (มติ 2026-08-09) — ไม่งั้นแถว pagination สูงไม่เท่าปุ่มตั้งค่าคอลัมน์ใน toolbar
  ของตารางเดียวกัน ซึ่งเคยหลุดมาแล้ว
- **ทุก `<DataTable>` ต้องส่ง `id` เสมอ** (ค่าคงที่ ไม่ซ้ำกันทั้งแอป เช่น
  `id="ot-requests"`) — prefs คอลัมน์ (ลำดับ/ซ่อน) persist เฉพาะตารางที่มี
  `id` ตารางที่ลืมส่งจะ "จำการตั้งค่าไม่ได้" ทั้งที่หน้าอื่นจำได้ ผู้ใช้อ่าน
  ออกทันทีว่าสองหน้าไม่เหมือนกัน · verify script เช็คข้อนี้ให้
- **ปิด feature ของตารางต้องมีเหตุผล**: default คือเปิดทั้งชุด — ปิดตัวไหน
  ให้ปิดเพราะ "หน้านี้ใช้ไม่ได้จริง" (เช่น ตาราง 3 คอลัมน์ไม่ต้องมีซ่อน
  คอลัมน์) ไม่ใช่เพราะลืมหรือขี้เกียจต่อ — ปิดเหมือนกันทุกหน้าที่สถานการณ์
  เดียวกัน
- **เกณฑ์โหมดตาราง (ตัดสินรายตารางตอนเขียน)**: ข้อมูล bounded ดึงทั้งชุด =
  client (default) · ข้อมูลโตไม่จำกัด/query paginate ฝั่ง server = **โหมด
  server (URL-state) ทั้ง sort/filter/paginate — ห้าม sort ฝั่ง client บน
  ข้อมูลที่เห็นไม่ครบ**

## 5. Format การแสดงผล (ทุกตัวผ่าน `lib/format.ts`)

- จอ: `DD/MM/YYYY` **__ERA__** · มีเวลา = เติม `HH:MM` · wall-clock date
  อ่าน UTC parts (กันเลื่อนวัน) · instant จริงแสดงเวลาไทย Asia/Bangkok
- **ไฟล์ export (Excel/CSV): ISO `yyyy-MM-dd` เสมอ** — คนละมาตรฐานกับจอ
  โดยตั้งใจ (DD/MM ทำ Excel สลับวัน-เดือนตาม locale ผู้รับ)
- ตัวเลข: comma คั่นหลักพัน · ทศนิยมตามที่ DB ให้ ไม่ปัดเอง · ค่าว่าง = `-`
- **ภาษา UI**: __LANG__
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
- **UX ของหน้าเดี่ยว ๆ จดเมื่อไร**: ตัดสินใจ layout/flow ของหน้าใดหน้าหนึ่ง
  ที่ยังอยู่ในกรอบข้อตกลงนี้ → **ไม่ต้องจดที่ไหน** โค้ดคือคำตอบแล้ว ·
  แต่ถ้าการเลือกนั้นจะกลายเป็น**บรรทัดฐานให้หน้าอื่นทำตาม** (เช่น "หน้าอนุมัติ
  ทุกหน้าใช้ tab แยกสถานะ", "ตารางที่มี filter ช่วงวันที่วางแถบ filter
  เหนือการ์ด") → เป็นมติส่วน 10 พร้อมเหตุผล และถ้าเป็นกฎถาวรให้เขียนเข้า
  ส่วนที่เกี่ยวข้อง (3/4/6) ด้วย ไม่ใช่ทิ้งไว้ใน log อย่างเดียว
  > เส้นแบ่ง: ถามว่า "หน้าถัดไปที่คล้ายกันต้องทำแบบนี้ไหม" — ถ้าใช่ = มติ
- มติ design ทั้งหมดอยู่ไฟล์นี้ (ส่วน 10) — **ไม่ใช่**
  `docs/project-context/decisions.md` ซึ่งเก็บมติเรื่องอื่นทั้งหมด

## 9. Deviations (เฉพาะโปรเจคเดิม — จาก scan ตอนติดตั้ง)

| จุดที่ขัดข้อตกลง | ตัดสินใจ | หมายเหตุ |
| --- | --- | --- |
| __DEVIATIONS__ | | |

## 10. มติ (decision log)

| วันที่ | มติ | เหตุผล |
| --- | --- | --- |
| __DATE__ | ติดตั้งข้อตกลงฉบับแรก — __ANSWERS_SUMMARY__ | ตาม interview (__ANSWERED_BY__) |
