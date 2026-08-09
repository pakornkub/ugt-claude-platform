# ร่าง — `ugt-nextjs-design-setup` (design agreement skill)

> ## ⛔ อย่าใช้ไฟล์นี้เป็นมาตรฐาน — เนื้อหาถูก supersede ไปแล้ว
>
> เอกสารนี้คือ **ร่างตอนออกแบบ skill (2026-08-03)** เก็บไว้เพื่อตอบว่า "ทำไมตอนนั้น
> ถึงเลือกแบบนี้ / ทำไมถึงปัดตัวเลือกอื่นทิ้ง" เท่านั้น — **ไม่ใช่มาตรฐานปัจจุบัน**
> และหลายจุดขัดกับของจริงไปแล้ว ตัวอย่างที่ทำให้เข้าใจผิดได้ทันที:
> ร่างนี้ยังพูดถึง `radix-mira` (Radix UI) แต่**มติ 2026-08-04 เปลี่ยนเป็น `base-mira`
> (Base UI) ไปแล้ว** — ทำตามร่างนี้จะได้ preset ผิด
>
> **มาตรฐานปัจจุบันอยู่ที่**: `plugins/ugt-core/contracts/design.md` (ข้อกำหนดกลาง) ·
> `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/` (การนำไปใช้จริง) ·
> `docs/design-preview.html` (ดูหน้าตาที่ได้)
>
> ชื่อ skill/ไฟล์บางตัวก็เปลี่ยนแล้วใน v3.0 (`ugt-checkpoint`→`ugt-handoff` ·
> `ugt-mode`→`ugt-model-mode` · `ugt-nextjs-setup`→`ugt-nextjs-full-setup` ·
> `ugt-nextjs-quality-setup`→`ugt-nextjs-test-lint-setup` ·
> `.claude/state/project-notes.md` ยุบเข้า `docs/project-context/`)
> — ไม่แก้ย้อนหลังในไฟล์นี้ เพราะจะทำให้บันทึกประวัติเพี้ยน


> สถานะ: **ร่างเพื่อ review** (2026-08-03) — ยังไม่ใช่ skill จริง
> ที่มา: สกัดจาก `ugt-hrms` (ตัวตั้งต้น — docs/DESIGN.md + MOTION.md ผ่านการใช้จริง)
> และ `gov-boi-smart` (lib/format.ts, IconAction, บทเรียน retheme 2 รอบ)
> ประกอบ 3 ส่วน: **A.** DESIGN.md template · **B.** คำถาม interview · **C.** รายการ assets

---

# A. DESIGN.md template

ไฟล์ที่ skill gen ลงโปรเจคเป็น `docs/DESIGN.md` — `{{...}}` = ค่าจาก interview,
ที่เหลือคือกฎตายตัว/ default กลางที่มากับ template เลย
โครงลอกแบบ HRMS: **ฉบับใช้งานสั้น ๆ** ไม่ใช่ spec ยาว · token จริงอยู่ `app/globals.css`

```markdown
# {{PROJECT_NAME}} — Design Agreement

> Gen โดย ugt-nextjs-design-setup {{VERSION}} เมื่อ {{DATE}} ·
> อิงมาตรฐานกลาง `ugt-core/contracts/design.md` **{{STD_VERSION}}**
> Token จริงอยู่ที่ `app/globals.css` — ไฟล์นี้คือข้อตกลง "ใช้อย่างไร"
> เปลี่ยนข้อตกลง = แก้ไฟล์นี้ + เพิ่มแถวใน "มติ" (ส่วน 10) พร้อมวันที่และเหตุผล
> Plugin อัปเดตมาตรฐานกลาง = สั่ง "sync ข้อตกลง design" → skill diff ให้ดู
> แล้วบันทึกเป็นมติ ไม่ทับของเดิมเงียบ ๆ

## 0. กฎเหล็ก (ทุกโปรเจคเหมือนกัน — ไม่มีข้อยกเว้น)

1. **shadcn-first ladder**: shadcn primitive → shadcn block/template → compose
   จาก primitive → custom ได้เฉพาะ Tailwind utilities
   ห้ามเขียน component ที่ shadcn มีอยู่แล้ว · ห้าม raw CSS / CSS-in-JS / inline
   style (ยกเว้นค่า dynamic จริง ๆ) · `globals.css` รับเฉพาะ token / `@layer` /
   pattern ที่ Tailwind เขียนไม่ได้
2. **แก้ไฟล์ใน `components/ui/` ได้เฉพาะ**: (ก) เพิ่ม variant ที่ประกาศไว้ใน
   ไฟล์นี้ (ส่วน 4) (ข) จุดที่ระบุใน override checklist — นอกนั้นห้ามแตะ
   (อัปเดตจาก registry ใช้ `npx shadcn@latest add <x> --overwrite`)
3. **Icon = lucide เท่านั้น** — ห้าม emoji ใน UI (บทเรียน gov-boi: AI gen แรก
   ใส่ emoji ในปุ่ม ต้องไล่แก้ทั้งแอป)
4. **ขนาด: `default` ทุกตัว** — ห้าม className ปรับ height/font-size ของ
   component · ข้อยกเว้นที่อนุญาต: ปุ่มใน row ตาราง = `size="icon"` (ผ่าน
   `IconAction`) · toolbar แน่น = `sm` · จบแค่นี้
5. **ตาราง = `DataTable` กลางเท่านั้น** — ห้าม `<table>`/`ui/table` ตรง ๆ ในหน้า
6. **วันที่/ตัวเลข ผ่าน formatter กลาง (`lib/format.ts`) เท่านั้น** — ห้าม
   `toLocaleDateString`/format inline (บทเรียนบั๊กวันที่เลื่อนทั้ง 2 โปรเจค)
7. **Accessibility ขั้นต่ำ**: สถานะห้ามใช้สีเดี่ยว (สี + icon เสมอ) · ปุ่มไอคอน
   ล้วนต้องมี label (ผ่าน `IconAction`) · ห้ามปิด focus ring · motion ทุกจุด
   เงียบเมื่อ `prefers-reduced-motion`

## 1. Visual identity

- **แหล่งอ้างอิง**: {{REFERENCE: ไม่มี — ใช้ค่ากลางองค์กร / path prototype / brand}}
  (ถ้ามี prototype: token ต้องสกัดจาก prototype ก่อนเขียน UI หน้าแรก —
  บทเรียน gov-boi ที่ต้อง retheme ทั้งแอป 2 รอบ)
- **primary**: {{PRIMARY_COLOR}} — ใช้กับ **interactive เท่านั้น** (ปุ่มหลัก,
  ลิงก์, focus ring, สถานะเลือก) · dark mode ต้องสว่างกว่า light
- **base**: neutral tint เย็น hue ~258 chroma 0.004–0.02 — ห้ามเทา chroma 0 เพิ่ม
- **dark mode**: {{DARK_MODE: มี + toggle / ไม่มี (เตรียม token ไว้)}} ·
  กฎ dark: border ≥ ขาว 16% · elevation จาก lightness (background < card < popover)
- **สีสถานะ 6 ตัว** (`--status-*` + `-foreground` — ค่ากลางองค์กร ผ่าน WCAG AA แล้ว):

  | token | ความหมาย | ใช้กับ |
  | --- | --- | --- |
  | `status-amber` | รอดำเนินการ / เตือน | badge PENDING, stat รออนุมัติ |
  | `status-emerald` | สำเร็จ / อนุมัติ | badge APPROVED, toast success |
  | `status-red` | ปฏิเสธ / ผิดพลาด / ลบ | badge REJECTED, ปุ่มลบ |
  | `status-coral` | ขอยกเลิก / ครึ่งทาง | badge CANCEL_REQUESTED |
  | `status-sky` | ข้อมูล / งานระบบ | badge "อัตโนมัติ" (sky ≠ primary: sky ไม่กดได้) |
  | `status-gray` | ยกเลิก / ร่าง / ปิดใช้ | badge CANCELLED/DISABLED |

  สูตร badge: `border-status-x/40 bg-status-x/10 text-status-x-foreground` +
  icon เสมอ · ใช้ผ่าน `StatusBadge` เท่านั้น · เปลี่ยนค่าสีเมื่อไรต้องรัน
  `scripts/check-contrast.mjs` ซ้ำ
- **สีสื่อความหมายของปุ่ม action** (จาก gov-boi): ลบ = แดง · กู้คืน = เขียว ·
  แก้ไข = น้ำเงิน · เพิ่ม/Import = เขียวทึบ · ในตารางใช้ variant `soft-*`
  (พื้นจางตอน hover — สีไม่ตะโกนทุกแถว)

## 2. Typography

- **Inter (ละติน) + Noto Sans Thai (ไทย)** ผ่าน `next/font` · mono = Geist Mono
  (ค่ากลาง — ทั้ง 2 โปรเจคจบที่ชุดนี้; gov-boi อ้อมไป Sarabun แล้วถอยกลับ)
- ฐาน html 16px — ไม่ override (สเกลแน่นมาจากชุด mira แล้ว)
- น้ำหนัก 400/500 เป็นหลัก · 600 เฉพาะ title หน้า
- Title หน้า: `text-2xl font-semibold tracking-tight` — ไม่มีไอคอนนำ
- **กฎภาษาไทย**: ห้าม uppercase eyebrow (ไทยไม่มี case + tracking ทำสระลอย) →
  ใช้ sentence case + น้ำหนักแทน · ระวัง line-height ตัดสระบน-ล่าง
- ตาราง: `text-xs` ทั้ง header+cell (ตั้งที่ราก `ui/table.tsx` จุดเดียว) —
  ห้าม override ราย cell (มติ HRMS 2026-07-23 หลังกวาด ~30 จุด/14 ไฟล์)
- ตัวเลขในตาราง: ชิดขวา + tabular

## 3. Layout & app shell

- **Shell**: {{SHELL: sidebar (shadcn sidebar block, collapse ได้) / topbar /
  sidebar+topbar}} · ใช้ shadcn block เป็นฐาน ไม่ประกอบเอง
- shell overflow: เมนูยาวเกิน = scroll แนวนอน ห้าม wrap ตกบรรทัด
  (บทเรียน gov-boi `ff8a95e`)
- nav highlight: เทียบ longest-prefix ด้วย `${href}/` (กันสองเมนูติดพร้อมกัน
  และกัน "/" ติดทุกหน้า)
- เมนูตามสิทธิ์: **ซ่อน ไม่ disable** — UI เป็นแค่ UX เส้นกั้นจริงคือ guard
  ฝั่ง server (ตาม ugt-nextjs-auth-setup)
- **โครงสร้างเมนู**: ทุกรายการ = icon (lucide) + label เสมอ · จัดกลุ่มเป็น
  section เมื่อเกิน ~7 รายการ · ลึกสุด 2 ชั้น — ลึกกว่านั้นให้แตกเป็น tab
  ในหน้าแทน · ลำดับ: งานหลักบนสุด → รายงาน → ตั้งค่า/admin ล่างสุด
- **User menu** (avatar + ชื่อ + logout): sidebar = ล่างสุด (`nav-user`) ·
  topbar = dropdown มุมขวาสุด · เมนู admin/ตั้งค่าอยู่กลุ่มเดียวกันนี้
  ไม่ปนกับเมนูงาน
- **Breadcrumb**: มีเมื่อหน้าอยู่ลึกเกิน 2 ชั้นจากราก — วางเหนือ page title ·
  ชั้นเดียว/สองชั้นไม่ต้องมี
- โครงทุกหน้า list: page title + ปุ่ม action ขวาบน + เนื้อหาในการ์ด — pattern
  เดียวทุกหน้า ห้ามปั้น UI เฉพาะหน้า
- **mobile-first แบบเป็นระบบ**: ตาราง→การ์ด · dialog→bottom-sheet ·
  ยุบ/สแต็คตาม pattern กลาง ไม่ตัดสินรายหน้า
- Landing page: {{LANDING: ไม่มี — แอปภายใน / มี (shadcn block: {{BLOCK}})}}
- หน้า login/setup: ตาม ugt-nextjs-auth-setup — ธีมต้องตามไฟล์นี้

## 4. Components

- **Density**: ตระกูล mira (ค่ากลาง — ปุ่ม/control `h-7`, ตาราง `text-xs`)
  ทุก breakpoint เท่ากัน — ไม่ bump บนมือถือ (มติ HRMS 2026-07-25)
- **เลือก control ตามจำนวนตัวเลือก**: ≤5 = RadioGroup · 6–15 = Select ·
  >15 หรือค้นหาได้ = Combobox
- **วันที่**: `ui/date-picker` กลางเสมอ (ยกเว้น filter ปี/เดือนใน toolbar ใช้
  Select ได้) · ช่วงวันที่ = `ui/date-range-picker`
- **Form**: label บนช่อง · required = `*` แดงท้าย label · error ใต้ช่องผ่าน
  `ui/form` (zod + react-hook-form) · validate ตอน submit แล้วค่อย re-validate
  ต่อ field
- **Dialog/Modal (เกณฑ์เลือกภาชนะ)**: ฟอร์มสั้น (≤ ~6 ช่อง) = `FormDialog` ·
  ฟอร์มยาว/หลายขั้น = หน้าแยก · panel ข้างที่เปิดค้างดูคู่กับเนื้อหา
  (filter ชุดใหญ่, preview) = `Sheet` · ดูรายละเอียด read-only =
  `detail-dialog-shell` + `detail-row/section` · mobile: dialog →
  bottom-sheet อัตโนมัติ (อยู่ใน primitive แล้ว)
- **โครง FormDialog บังคับ**: compound `FormDialogContent/Header/Body/Footer` +
  prop `height` (`fluid`/`auto`/`fill`) — ห้ามประกอบ `Dialog` ดิบเป็นฟอร์มเอง ·
  Footer: ปุ่มยกเลิก (outline) ซ้าย · ยืนยัน (primary) ขวาสุด · primary ได้
  **ปุ่มเดียว**ต่อ dialog
- **ห้าม dialog ซ้อน dialog** — ยกเว้น `AlertDialog` ยืนยันทับฟอร์มได้ชั้นเดียว
- **ฟอร์ม dirty ปิดไม่เงียบ**: กด Esc/คลิกนอกขณะกรอกค้าง ต้องถามยืนยันก่อนทิ้ง
- **ลบ / action ย้อนกลับยาก**: ผ่าน `AlertDialog` เสมอ (`ConfirmActionDialog`)
  และปุ่มเป็นแบบมีข้อความ ไม่ใช่ icon ล้วน
- **Variant เพิ่มที่ประกาศอนุญาต** (ตามกฎเหล็กข้อ 2): Button `success`,
  `soft-primary`, `soft-destructive`, `soft-success` — นอกเหนือจากนี้ต้องเพิ่ม
  เป็นมติในส่วน 10 ก่อน
- Row actions ในตาราง: ≤3 ปุ่ม = `IconAction` เรียงแถว · >3 = `DropdownMenu`
  + `MoreHorizontal`
- **Icon mapping ตายตัว** (เพิ่มได้เป็นมติในส่วน 10): เพิ่ม `Plus` · แก้ไข
  `Pencil` · ลบ `Trash2` · กู้คืน `RotateCcw` · ดูรายละเอียด `Eye` · Import
  `Upload` · Export `Download` · ค้นหา `Search` · กรอง `Filter` · เมนูแถว
  `MoreHorizontal` · สำเร็จ `CheckCircle2` · ปิด `X` — งานเดียวกันห้ามใช้
  ไอคอนต่างกันคนละหน้า · icon ที่มี text ประกบ = `aria-hidden` เสมอ
- **Badge vs StatusBadge**: `StatusBadge` (tone+icon จาก `--status-*`) =
  สถานะ/ความรุนแรงเท่านั้น · `Badge` ธรรมดา = label/จำนวน/chip — **ห้าม**ใส่
  class สีสถานะ inline เองทั้งสองกรณี · mapping สถานะ→tone ประกาศที่เดียว
  ต่อ domain (ไม่กระจายตามหน้า)
- **Tabs**: ใช้เมื่อเนื้อหาเป็นมุมมองย่อยของสิ่งเดียวกันในหน้าเดียว ·
  tab ที่เป็น navigation หลักของหน้า = state ใน URL (`?tab=`) แชร์ลิงก์ได้ ·
  เกิน ~5 tab = แตกหน้า
- **Tooltip**: `TooltipProvider` delay 0 (มติ gov-boi) · บังคับบนปุ่ม icon
  ล้วน (มากับ `IconAction` แล้ว) · ห้ามซ่อนข้อมูลจำเป็นไว้ใน tooltip
  อย่างเดียว (mobile ไม่มี hover)
- **Chart**: ใช้ `ui/chart` (recharts ผ่าน shadcn) + สีจาก `--chart-1..5`
  เท่านั้น — ห้าม lib กราฟอื่น / ห้าม hardcode สี
- **Rich text**: ต้องการ editor = tiptap ผ่าน `ui/tiptap-editor` กลาง —
  ห้าม lib อื่น
- **Pagination default**: 10 แถว/หน้า · ตัวเลือก 10/20/50 — เหมือนกันทุกตาราง
- **DataTable ชุดมาตรฐานเต็ม**: global search · filter รายคอลัมน์ (Popover +
  chip + clear) · sort · pagination · dnd ลากสลับคอลัมน์ · ซ่อน/แสดงคอลัมน์
  (จำใน localStorage) · ปุ่มคืนค่าเริ่มต้น — ทุก feature ปิดได้ราย prop แต่
  default = ครบ
- **เกณฑ์เลือกโหมด (ตัดสินรายตารางตอนเขียน ไม่ต้องถามใคร)**: ข้อมูล bounded
  ดึงทั้งชุดได้ (master data) = โหมด client (default) · ข้อมูลโตไม่จำกัด
  (transaction/log) หรือ query paginate ฝั่ง server อยู่แล้ว = **โหมด server
  (URL-state) ทั้ง sort/filter/paginate — ห้าม sort ฝั่ง client บนข้อมูลที่เห็น
  ไม่ครบ**

## 5. Format การแสดงผล (ทุกตัวผ่าน `lib/format.ts`)

- **วันที่บนจอ**: `DD/MM/YYYY` **ค.ศ. เสมอ** (มติร่วม 2 โปรเจค — HRMS ยกเลิก
  พ.ศ. 2026-07-09) · มีเวลา = เติม `HH:MM` · โซนเวลา: wall-clock date อ่าน
  UTC parts (กันเลื่อนวัน) / instant จริงแสดงเวลาไทย `Asia/Bangkok`
- **วันที่ในไฟล์ export (Excel/CSV)**: ISO `yyyy-MM-dd` เสมอ — คนละมาตรฐานกับ
  บนจอโดยตั้งใจ (DD/MM ทำ Excel สลับวัน-เดือนตาม locale เครื่องผู้รับ)
- **ตัวเลข**: comma คั่นหลักพัน · ทศนิยม: การเงิน/ปริมาณตามที่ DB ให้มา
  ไม่ปัดเอง (บทเรียน gov-boi: ปัดเศษ = เปลี่ยนตัวเลขที่ยื่นราชการ) ·
  ค่าว่างแสดง `-` ไม่ใช่ `0`
- **ภาษา UI**: {{LANG: ไทยล้วน / th+en ผ่าน i18n (ทุก UI ใหม่มี key ครบ 2 ภาษา)}}
- ศัพท์บังคับ: ดู `requirements/glossary.md` ของโปรเจค (ถ้ามี)

## 6. Feedback & states

- Toast (sonner `richColors`): success = สำเร็จจริงเท่านั้น · error = พังจริง ·
  warning = ทำได้แต่มีเงื่อนไข · info = เฉย ๆ — ห้าม `toast.error` แทน warning
- Loading: โครงหน้า/ตาราง = `Skeleton` · การกระทำ = spinner ในปุ่ม (disabled)
- Data state จาก react-query แสดงผ่าน `ui/query-state` (loading/error/empty
  ครบในตัวเดียว) — ไม่เขียน if-loading เองรายหน้า
- Empty: `ui/empty` ทุกกรณี (ตารางว่าง / ไม่มีสิทธิ์ / 404) — icon + ข้อความ +
  CTA ถ้ามี action ต่อได้
- Error ระดับหน้า: banner บนสุดของการ์ดเนื้อหา · ระดับ field: ใต้ช่องผ่าน `ui/form`

## 7. Motion (น้อยแต่มีระบบ)

- กฎ 4 ข้อ (จาก HRMS MOTION.md): (1) "ไม่มีแล้วเสียอะไร" — ไม่เสีย = ไม่ใส่
  (2) CSS ก่อนเสมอ · แพ็กเกจ `motion` เฉพาะ layoutId / AnimatePresence
  (3) 150–250ms ease-out · ระยะ ≤ 12px (4) ทุกจุดเงียบเมื่อ
  `prefers-reduced-motion` (จุดที่ใช้ `motion` ต้อง `useReducedMotion()` เอง)
- จุดที่มีมาให้แล้วจาก shadcn/tw-animate (dialog, dropdown, skeleton) = พอแล้ว
  ไม่เพิ่มจนกว่ามีเหตุ

## 8. Governance

- ไฟล์นี้คือ source of truth ของ design — ขัดกันเมื่อไรให้ไฟล์นี้ชนะโค้ด
- Skill/plugin เสริมความสวยงาม (`frontend-design`, `impeccable`, ฯลฯ)
  ใช้ช่วยคิด/ขัดเกลาได้ แต่**ผลลัพธ์ต้องไม่ขัดไฟล์นี้** — ขัดเมื่อไรไฟล์นี้ชนะ
- คำถาม design ที่ยังไม่ปิด → `docs/design-questions.md` (คำถาม + พฤติกรรม
  ระหว่างรอ ต่อข้อ — ไม่บล็อกงาน) — pattern จาก gov-boi
- Deviation ของโปรเจคเดิม: บันทึกในส่วน 10 ว่า migrate หรือ grandfather พร้อมเหตุผล

## 9. Deviations (เฉพาะโปรเจคเดิม — จาก scan ตอนติดตั้ง)

| จุดที่ขัดข้อตกลง | ตัดสินใจ | หมายเหตุ |
| --- | --- | --- |
| {{SCAN_RESULT}} | migrate / grandfather | |

## 10. มติ (decision log)

| วันที่ | มติ | เหตุผล |
| --- | --- | --- |
| {{DATE}} | ติดตั้งข้อตกลงฉบับแรก ({{ANSWERS_SUMMARY}}) | ตาม interview |
```

---

# B. คำถาม interview

## หลักการ

- เปิดด้วยทางลัด: **"ตามมาตรฐานทั้งหมด"** → ข้าม interview ได้ default ทุกข้อ
  โดนถามเฉพาะข้อที่ไม่มี default ไม่ได้ (ชื่อโปรเจค + primary ถ้าองค์กรยังไม่เคาะ)
- ถามผ่าน AskUserQuestion เป็นชุด ≤4 ข้อ · ตัวเลือกแรก = default "(แนะนำ)" ·
  ทุกข้อมีช่อง "อื่นๆ" พิมพ์เอง · คำตอบทุกข้อ (รวมที่รับ default) ลง DESIGN.md
- **โปรเจคเดิม**: scan ก่อน (globals.css, components.json, components/ui/,
  layout, ฟ้อนต์) → สรุป "draft ข้อตกลงจากของจริง" ให้ยืนยัน → ถามเฉพาะข้อที่
  scan ไม่เจอ/ขัดแย้ง → gen ส่วน 9 (Deviations)

## ชุด 1 — Visual identity (4 ข้อ)

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 1 | มี prototype / ระบบเดิม / brand ที่ต้อง match ไหม? | ไม่มี / มี (ระบุ path หรือ URL) | ไม่มี — ใช้ค่ากลางองค์กร |
| 2 | สี primary? | ค่ากลางองค์กร / indigo (HRMS) / พิมพ์ hex | ค่ากลางองค์กร |
| 3 | Dark mode? | มี + toggle / ไม่มี (เตรียม token ไว้) | มี + toggle |
| 4 | ภาษา UI? | ไทยล้วน / ไทย+อังกฤษ (i18n เต็ม) | ไทยล้วน |

## ชุด 2 — Layout (3 ข้อ)

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 5 | App shell? | Sidebar collapse ได้ / Topbar / Sidebar+Topbar | Sidebar |
| 6 | Landing page? | ไม่มี — เข้าแอปเลย / มี (เลือก shadcn block) | ไม่มี |
| 7 | ปี ค.ศ. ใช่ไหม? (ยืนยันครั้งเดียว) | ค.ศ. / พ.ศ. (ต้องมีเหตุผลทางธุรกิจ — บันทึกเป็นมติ) | ค.ศ. |

## ชุด 3 — เฉพาะโปรเจคเดิมที่ scan เจอความขัดแย้ง

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 8 | ต่อ deviation แต่ละจุด (ถามรวมเป็นนโยบายเดียว): จะทำอย่างไร? | migrate ทันที / grandfather ไว้ก่อน (บันทึกลงส่วน 9) / เลือกรายจุด | grandfather + บันทึก |

**สิ่งที่จงใจไม่ถาม** (เป็นค่ากลาง/กฎเหล็กไปเลย): ฟ้อนต์ · density/ขนาด ·
radius · ชุดสีสถานะ · format วันที่-ตัวเลข · toast semantics · motion ·
icon lib · กฎ a11y — 2 โปรเจคพิสูจน์แล้วว่าคำตอบเดียวกันหมด
(ใครอยากต่างจริง ๆ ใช้ช่อง "อื่นๆ" ได้ และถูกบันทึกเป็นมติ custom)

---

# C. รายการ assets ของ skill

## C1. ยกจาก HRMS (generalize — ตัดของ HR-specific ออก)

| Asset | จาก | งานที่ต้องทำก่อน ship |
| --- | --- | --- |
| `globals.tokens.css` | `ugt-hrms/app/globals.css` | แปลง primary เป็น placeholder · คง status-* 6 ตัว + radius tiers + dark |
| `ui/status-badge.tsx` | HRMS | ตัด status ที่ผูก domain HR (ถ้ามี) — เหลือ 6 tone กลาง |
| `ui/form-dialog.tsx` | HRMS | ใช้ตรง ๆ ได้ |
| `ui/data-table.tsx` | HRMS + gov-boi (**มติ 2026-08-04: ชุดเต็ม**) | ฐาน HRMS (tanstack: mobile card, selection, i18n) + ยก option เต็มชุดจาก gov-boi: filter รายคอลัมน์แบบ Popover+chip · dnd ลากสลับคอลัมน์ · ซ่อน/แสดงคอลัมน์ · จำ preference ใน localStorage (`table-prefs`) · คืนค่าเริ่มต้น/clear filter · โหมด server sort/filter/paginate ผ่าน URL ทั้งชุด (`table-query`) — ทุก feature เป็น prop รายตาราง, default = ครบชุด |
| `ui/date-picker.tsx` + `date-range-picker.tsx` | HRMS | ใช้ตรง ๆ |
| `ui/combobox.tsx` | HRMS | ใช้ตรง ๆ (employee-combobox ไม่เอา — HR-specific) |
| `ui/page-shell.tsx`, `detail-dialog-shell`, `detail-row/section`, `query-state`, `truncated-text` | HRMS | คัดเฉพาะตัวที่ generic จริง — รอบแรกเอาชุดนี้พอ |
| `theme-toggle.tsx` | HRMS | ship เมื่อตอบ dark mode = มี |
| `language-switcher.tsx` + โครง `messages/` | HRMS | ship เมื่อตอบ th+en |
| `MOTION.template.md` | HRMS `docs/MOTION.md` | เหลือหัวตาราง + กฎ 4 ข้อ (inventory ให้โปรเจคเติมเอง) |

## C2. ยกจาก gov-boi-smart

| Asset | จาก | งานที่ต้องทำก่อน ship |
| --- | --- | --- |
| `lib/format.ts` | gov-boi `lib/format.ts` + HRMS `lib/format-date.ts` | **merge**: โครง Intl + cache ของ HRMS + `formatNumber` (ไม่ปัดทศนิยม) + `bangkokToday` ของ gov-boi + เพิ่ม `formatExportDate` (ISO) |
| `ui/icon-action.tsx` | gov-boi (HRMS ก็มี — เทียบแล้วเอาตัวที่ generic กว่า) | ใช้ตรง ๆ |
| Button variants `success` / `soft-*` | gov-boi `ui/button.tsx` | สกัดเป็น patch/คำสั่งเพิ่ม variant ใน button ของ mira |
| `confirm-action-dialog.tsx` | gov-boi | ใช้ตรง ๆ |
| `design-questions.template.md` | gov-boi `docs/design/questions-for-designer.md` | เหลือโครง: คำถาม + สถานะ + พฤติกรรมระหว่างรอ |

## C3. สร้างใหม่

| Asset | คืออะไร |
| --- | --- |
| `DESIGN.template.md` | ส่วน A ของร่างนี้ |
| `ugt-core/contracts/design.md` (**มติ 2026-08-04: ขึ้น contract เลย**) | มาตรฐานกลางชั้น 1+2 ล้วน ๆ **เขียนแบบไม่มีคำว่า shadcn** + มี version — เป็น normative source แบบเดียวกับ database/delivery/identity · skill อ้าง contract นี้ ไม่ copy เนื้อหา · งานพ่วง: bump version + CHANGELOG ของ ugt-core ตามพิธี release เดิม |
| `references/interview.md` | ส่วน B + สคริปต์ scan โปรเจคเดิม (อ่านอะไร เทียบอะไร) |
| `scripts/check-contrast.mjs` | ตรวจ WCAG AA ≥ 4.5:1 ทุกคู่ token — รันตอน gen และเมื่อแก้สี |
| `references/layout-shells.md` | mapping คำตอบ shell → shadcn block ที่ใช้ + กฎ overflow/nav highlight |
| `references/conventions.md` | กฎใช้ component (ส่วน 4/6 แบบละเอียด + ตัวอย่างโค้ดถูก/ผิด) — รวมข้อยกเว้นระดับลึก เช่น `TONE_STYLES` สำหรับ label มีสีที่ห้ามมี icon (IN/OUT ใน log) |
| `evals/` | evals + trigger-evals ตาม convention ของ repo (ทุก skill ต้องมี) |
| shadcn MCP declaration | `.mcp.json` ของ plugin — ให้ Claude ค้น/ติดตั้ง component+block จาก registry ตรง · **TODO ตอนสร้าง: ตรวจคำสั่ง/config ปัจจุบันจาก docs จริงของ shadcn ห้ามเดา** |
| Harness auto-load rule | skill ระดับโปรเจค: แตะ `app/`/`components/` → ต้องอ่าน `docs/DESIGN.md` ก่อน (pattern เดียวกับ ugt-nextjs-clean-code) |
| แก้ `ugt-nextjs-setup` (ตัวแม่) | เพิ่ม design-setup เข้า pipeline โดยรัน**ก่อน auth-setup** (auth gen หน้า login ที่ต้องตามธีม — กัน retheme ซ้ำรอย gov-boi) |

## ข้อที่ต้องเคาะระหว่าง review ร่างนี้

1. ~~**สี primary ค่ากลางองค์กร**~~ — **เคาะแล้ว 2026-08-04: indigo ของ HRMS
   (`oklch(0.488 0.243 264.4)`)** — ผ่าน WCAG ทั้งชุดแล้ว · `#0d6efd` ของ
   gov-boi เป็นค่าที่ prototype บังคับ ไม่ใช่ทางเลือกองค์กร (เคสนั้นเดินผ่าน
   คำถาม interview ข้อ 1)
2. ~~**DataTable ฐานไหน**~~ — **เคาะแล้ว 2026-08-04: ฐาน HRMS + option เต็มชุดจาก gov-boi** (global search · filter รายคอลัมน์ Popover · sort · pagination 2 โหมด · dnd สลับคอลัมน์ · ซ่อน/แสดงคอลัมน์ · จำ preference · คืนค่าเริ่มต้น/clear filter) — งาน merge จริง ไม่ใช่ copy
3. ~~**shadcn style preset**~~ — ⚠️ **มติกลับ 2026-08-04 (รอบสอง): `base-mira` (Base UI)**
   — user เคาะเองตอนสร้าง org preset (`b1ZzrZbs0`) ว่าตั้งใจเลือก Base UI ·
   kit ports กลับเป็น `render` prop, verify.mjs เช็ค base-mira, HRMS
   (radix-mira) ยังเป็น reference ของ DataTable แต่ทุกครั้งที่ sync ต้อง
   port `asChild` → `render` · มติเดิมด้านล่างเก็บไว้เป็นประวัติ:
   ~~เคาะแล้ว 2026-08-04: `radix-mira` (Radix UI)~~
   — UI kit ที่ยกมาจาก HRMS สร้างบนตัวนี้ทั้งหมด + ecosystem block ของ shadcn
   เป็นฝั่ง Radix · หมายเหตุ: `base-mira` ของ gov-boi คือ Base UI (API `render`
   ไม่ใช่ `asChild`) → assets ที่ยกจาก gov-boi (IconAction,
   ConfirmActionDialog, button variants) ต้อง port เป็น Radix ตอนเข้า plugin
4. ~~**มาตรฐานกลางอยู่ที่ไหน**~~ — **เคาะแล้ว 2026-08-04: ขึ้น
   `ugt-core/contracts/design.md` เลย** แบบเดียวกับ database/delivery/identity
   (ผู้ใช้เลือกทางนี้แม้มี stack UI เดียว — ยอมจ่ายค่า release เพื่อความ
   สม่ำเสมอของ architecture)
5. ~~**DataTable สร้างที่ไหน**~~ — **เคาะแล้ว 2026-08-04: สร้าง+เทสต์ใน HRMS
   ก่อน** (มี test infra + ตารางจริงให้ลอง) แล้วค่อย copy เข้า plugin เป็น
   asset — HRMS ได้ของอัปเกรดฟรี
6. ~~**Definition of Done ต่อหน้า**~~ — **เคาะแล้ว 2026-08-04: ไม่ใส่** —
   ซ้ำกับ pipeline superpowers ที่ bundle มากับ ugt-nextjs-standard แล้ว
