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
2. **แก้ไฟล์ใน `components/ui/` ได้เฉพาะ** variant ที่ประกาศในส่วน 4 และ sanctioned edit ของ
   ข้อตกลงนี้ (`select` w-full · `card` เงา · `table` 2xl · `dialog`/`sheet`/`alert-dialog` 3 โซน) —
   นอกนั้นห้ามแตะ (อัปเดตจาก registry: `npx shadcn@latest add <x> --overwrite`)
3. **Icon = lucide เท่านั้น ห้าม emoji** · mapping งาน→icon ตายตัว (ส่วน 4)
4. **ขนาด = `default` ทุกตัว** · ข้อยกเว้น: **ปุ่มไอคอนล้วนใช้ `size="icon"`
   ได้ทุกที่** (`aria-label` บังคับ — มติ 2026-08-21 ขยายกฎให้ตรงของจริง: theme
   toggle · SidebarTrigger · ปุ่มตั้งค่าคอลัมน์ · ปุ่ม pagination) · **แต่ปุ่มใน
   row ตารางต้องผ่าน `IconAction` เสมอ** — ที่นั่น tooltip คือสิ่งเดียวที่บอกว่า
   ไอคอนแต่ละตัวทำอะไร · **หนึ่งแถว toolbar = หนึ่งขนาด** (`default` ทุกปุ่ม/Select
   ในแถว — `sm` ใช้ได้เฉพาะใน panel แน่น เช่นใน popover ตัวกรอง และห้ามปนกับ
   `default` ในแถวเดียวกัน · มติ 2026-10-16 A3) · **`size="cta"`** (44px บนมือถือ /
   36px ตั้งแต่ `sm` · ตัวอักษร 14px) ใช้ได้**เฉพาะ** ปุ่มหลักของหน้า · แถบปุ่ม
   ท้ายฟอร์ม · footer ของ dialog/sheet — ที่อื่นยัง `default` (มติ 2026-10-16 A7 ·
   footer ได้ `cta` จาก primitive เอง ไม่ต้องส่ง `size` รายปุ่ม) · **ห้าม override กล่องขนาดของ control
   ด้วย className** (`h-*` `p-*` `size-*` เช่น `size-7 p-0`) — ไม่พอให้แก้ที่
   `components/ui/button.tsx` · ข้อยกเว้นสองอย่าง: `w-*`/`w-full` เป็น layout
   ไม่ใช่ขนาด control · `variant="link"` เป็นข้อความไม่ใช่ปุ่ม จึงถอด `h-auto p-0`
   ได้ (base-mira ไม่ได้ล้าง padding ให้ variant นี้)
   · **ปุ่ม action ในแถวตารางส่ง `tone` เสมอ** (`neutral` ดู · `info` แก้ไข ·
   `danger` ลบ/ยกเลิก · `success` กู้คืน) — มีพื้นจางตั้งแต่ตอนพัก ไม่ใช่ขึ้น
   ตอน hover เพราะบนมือถือไม่มี hover เลยไม่มีอะไรบอกว่ากดได้ (มติ 2026-08-23
   กลับมติเดิมที่ให้ใสตอนพัก) · toolbar ที่ปุ่มเรียงติดกันเยอะใช้ `ghost`/`soft-*`
   ตามเดิม — พื้น 8-10 กล่องติดกันหนักกว่าที่ช่วย
   · `xs`/`icon-xs` สงวนไว้ให้ **องค์ประกอบย่อยภายใน control ของ kit เอง**
   (ปุ่ม ✕ ของ chip ตัวกรอง · จุดจับลากคอลัมน์ · ปุ่ม sort ในหัวตาราง — ดูตาราง
   radius ส่วน 1) ไม่ใช่ขนาดที่หน้าเลือกใช้เอง
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
  (ขาว `oklch(1 0 0)` ของการ์ด/popover/sidebar เป็นพื้นผิว ไม่ใช่เทา) · ข้อยกเว้นเดียว:
  พื้นหน้า light `oklch(0.976 0.006 264.5)` (#f5f7fb) อยู่บน hue ของ indigo องค์กร
  ให้การ์ดขาวลอยจากพื้น (มติ 2026-10-16 TK-BG)
- **dark mode**: __DARK_MODE__ · กฎ dark: border ≥ ขาว 16% · elevation จาก
  lightness (background < card < popover) · วง focus (`--ring`) สว่างกว่า
  primary dark หนึ่งขั้น ไม่งั้นหายกลืนรอบปุ่ม primary (มติ 2026-10-16 TK-RING)
- **Elevation โหมดสว่าง** (มติ 2026-10-16 D3): พื้นหน้าเทาฟ้า #f5f7fb · **การ์ดขาว
  `shadow-xs ring-1 ring-border`** (เงาชั้นเดียวบางมาก) · **sidebar ขาว** แยกจากพื้น
  ด้วยเส้นขอบ · **ห้ามซ้อนเงา** (การ์ดมีเงาห้ามอยู่ในการ์ดมีเงาอีกชั้น) ·
  เงาของการ์ดตั้งที่ `components/ui/card.tsx` จุดเดียว ห้ามใส่ `shadow-*` รายหน้า
  > Card ของ registry = `ring-1 ring-foreground/10` ไม่มีเงา — sanctioned edit แทนเป็น
  > `shadow-xs ring-1 ring-border` (`primitive-edits.md` ของ skill · `verify.mjs` เตือนเมื่อยังไม่แก้)
- **สีสถานะ 7 ตัว** (`--status-*` + `-foreground` — ค่ากลางองค์กร):
  amber=รอ/เตือน · emerald=สำเร็จ · red=ปฏิเสธ/ลบ · coral=ขอยกเลิก ·
  **violet=กลุ่มที่โปรเจคตั้งชื่อเอง** (ยังไม่ใช้จนกว่าจะมีมติส่วน 10 บอกว่ากลุ่มไหน) ·
  sky=ข้อมูล/ระบบ (**ไม่ใช่ของกดได้ — นั่นคือ primary**) ·
  gray=ยกเลิก/ร่าง · ใช้ผ่าน `StatusBadge` เท่านั้น (tone + icon บังคับ)
  > violet (มติ 2026-10-16 TK-VIO) = สถานะกลุ่มเดียวที่โปรเจคตั้งชื่อเอง สำหรับกลุ่มที่ถ้าไม่มี
  > จะต้องยืมสีข้างเคียง (hrms: การลา — coral ใกล้ amber เกินไป) · ใช้ผ่าน
  > `<StatusBadge tone="violet">` / `TONE_STYLES.violet` เมื่อส่วน 10 บอกแล้วว่ากลุ่มไหน —
  > ห้ามประกอบป้ายสถานะ violet เองด้วย utility
- **สีแยกหมวด `--cat-1..8`** (มติ 2026-10-16 TK-CAT): 8 hue ตัวอักษรขาวผ่าน AA ทุกตัว
  ค่าเดียวทั้ง light/dark · ใช้กับ avatar สีตามชื่อ (`avatarColorClass()` +
  `getInitials()` ใน `lib/avatar.ts` — seed = รหัสที่ไม่เปลี่ยน) · จุดสีกลุ่ม/หมวด ·
  กราฟเกิน 5 series · **ตกแต่งเท่านั้น: ห้ามใช้บอกสถานะ** (นั่นคือ `--status-*` + icon)
  **และห้ามใช้บอกว่ากดได้** (นั่นคือ primary) · class เขียนเป็น literal (`bg-cat-3`)
  ห้ามประกอบ `bg-cat-${i}`
- **Gradient** (มติ 2026-10-16 D9): แบนเป็นค่าเริ่มต้น · gradient ได้**เฉพาะ hero /
  banner ต้อนรับ** (ไม่เกินหนึ่งจุดต่อหน้า) สร้างจาก token (`primary` / `--cat-*`)
  ห้าม hex ตายตัว · ตัวอักษรบนนั้นผ่าน AA ด้วย scrim · ห้าม gradient บนการ์ด ปุ่ม
  ตาราง หรือเป็นของตกแต่งที่อื่น · Tailwind v4 = `bg-linear-to-*`
- **สีปุ่ม action**: ลบ=แดง · กู้คืน=เขียว · แก้ไข=น้ำเงิน · เพิ่ม/สร้าง/Import=
  **primary** (มติ 2026-08-21 — CTA หลักของหน้า) · บันทึก/ส่ง/submit ทั่วไป = **primary** ·
  **ตัดสินคำขอ** (มติ 2026-10-16 D6 — แก้มติวันเดียวกัน): อนุมัติ = **เขียวทึบ
  `success`** + ไอคอน `Check` · ปฏิเสธ = `outline` ขอบแดง (`border-destructive/40
  text-destructive`) + ไอคอน `X` — เขียว = ผลบวกของการตัดสิน แยกจากปุ่มบันทึก primary
  ทั่วไปของหน้า ผู้อนุมัติจะไม่อ่าน "อนุมัติ" เป็น "บันทึก" · ปุ่มรองข้างปุ่มหลักในหัวหน้า =
  variant **`soft`** (พื้น primary/10 ขอบ primary/25) · ในตารางใช้ `IconAction tone`
  > **ยืนยันลบ = แดงทึบ** (มติ 2026-10-16 D6 แทนมติ 2026-08-21 "ยึด preset แดงจาง"):
  > `destructive` เป็น `bg-destructive text-white` (แทน variant ของ base-mira ที่เป็นแดงพื้นจาง
  > ที่ `components/ui/button.tsx`) · ห้ามแต่ง className รายจุดให้ทึบ/จางเอง ·
  > `soft-destructive` คนละตัว: พื้นโปร่งใสตอนพัก จางตอน hover (toolbar ปุ่มติดกันเยอะ)
- **เมนู** (จาก preset กลาง): สี Default · พื้นทึบ (Solid — ไม่ใช้
  translucent/blur) · เมนูที่เลือก = **พื้นทึบสี primary** (มติ 2026-10-16 D7 —
  sanctioned edit ที่ `components/ui/sidebar.tsx` จุดเดียว) · มีช่องค้นหาเมนูใต้ชื่อแอป ·
  หัวกลุ่มมีจุดสีจาก `--cat-*` (ตั้งที่ nav config — breadcrumb แสดงจุดเดียวกัน) ·
  ห้ามใช้สีสถานะเป็นสีกลุ่มเมนู · sidebar = `components/app-sidebar.tsx` ของ kit
- **มุมโค้ง = สเกลตายตัว 4 บทบาท** (มติ 2026-10-16 TK-RAD "ผสม" แทนมติ 2026-08-09
  ที่ให้ preset คูณจาก `--radius`): ค่าแบบ ugt-hrms ทุกระดับ **ยกเว้นการ์ด** ที่คง
  ค่าเดิมของ kit — อยู่ใน `@theme` ของ `app/globals.css`:

  | tier | px | ใช้กับอะไรจริง |
  | --- | --- | --- |
  | `sm` | 4 | **องค์ประกอบย่อยใน control** — ปุ่ม `size="xs"`/`icon-xs` · จุดที่รับ focus ring แต่ไม่ใช่ปุ่มเต็มตัว (ปุ่ม ✕ ของ chip, จุดจับลากคอลัมน์, ปุ่ม sort ในหัวตาราง) · tooltip · เมนูใน sidebar |
  | `md` | 6 | **control หลัก** — input / select / button |
  | `lg` | 7.2 | **การ์ด** (ค่าเดิมของ kit) + popup เล็กที่ registry ให้ `rounded-lg` (popover / select / dropdown) |
  | `xl` | 14 | **overlay กลางจอ** — dialog / alert dialog / command |

  > **Badge / StatusBadge / chip ไม่ได้อยู่ในสเกลนี้** — ใช้ `rounded-full`
  > (แคปซูล) เสมอ · อย่าสับสนกับ `sm` ที่บางเอกสารเคยเรียกผิดว่า "chip"
  - `--radius: 0.75rem` ใน `:root` **ไม่ใช่ตัวคูณแล้ว** — เหลือให้ของที่อ่าน
    `var(--radius)` ตรง ๆ (toast) · ปรับความโค้ง = แก้ค่าตายตัวในตาราง เป็น**มติ**
    เพราะกระทบทุกหน้า
  - บทบาทที่ใช้จริงมี 4 ระดับ: chip → control → card → overlay ·
    **ห้ามใช้ `rounded-2xl`/`3xl`/`4xl`** ถึงแม้ token file จะนิยามไว้ให้ก็ตาม
    (`verify.mjs` ตรวจให้) และ **ห้าม override ราย callsite** ใช้ตัวแปรเสมอ
  > ทำไมผสม: mira ให้ระดับเล็กแทบตรงกับ hrms อยู่แล้ว (control 5.8 vs 6 · chip 4.3
  > vs 4) ต่างจริงที่การ์ด (7.2 vs 12) กับ overlay (10.1 vs 14) — มติเลือก overlay แบบ
  > hrms แต่คงการ์ด 7.2 ไว้ · บทบาทการ์ดอยู่ที่ `lg` ทั้งสองฝั่ง ผูก `lg` ไว้ที่ค่าเดิม
  > จึงไม่ต้องแก้ `card.tsx` เลย
  > **ผลข้างเคียงที่ยอมรับแล้ว**: popover / select / dropdown ของ base-mira วาดด้วย
  > `rounded-lg` ตัวเดียวกับการ์ด จึง**คง 7.2px** (ไม่ใช่ 12px แบบ hrms) — ไม่ต้องแก้
  > หรือ override ให้โค้งขึ้น (มติผู้ดูแล 2026-10-16)

## 2. Typography

- **__FONT__** ผ่าน `next/font` · mono = Geist Mono ·
  ฐาน html 16px ไม่ override
- น้ำหนัก 400/500 · 600 เฉพาะ title หน้า ·
  Title: `text-2xl font-semibold tracking-tight` ไม่มีไอคอนนำ
- **ห้าม uppercase eyebrow กับข้อความไทย** (ไทยไม่มี case + tracking ทำสระลอย)
- ตาราง `text-xs 2xl:text-sm` (12px → 14px ตั้งแต่จอ ≥1536px — หัวและเนื้อขยายพร้อมกัน ·
  มติ 2026-10-16 B10 = ข้อยกเว้นเดียวของกฎ "ทุก breakpoint เท่ากัน" ฝั่งตัวอักษร) ตั้งที่ราก
  `ui/table.tsx` จุดเดียว (sanctioned edit) — ห้าม override ราย cell · ตัวเลขชิดขวา tabular

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
  `ube-logo-long.svg` (มี tagline) — ห้าม embed logo เป็นรูปอื่น/สีเพี้ยน ·
  แสดงผ่าน CSS mask เท่านั้น ห้าม `<img>` (SVG ใน `<img>` รับสีจาก CSS ไม่ได้ ออกมาเป็นสีดำ)
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
- **Site header = `components/site-header.tsx` เสมอ** (ทุก shell ที่มี
  sidebar — mount เป็น child แรกของ `SidebarInset`): `SidebarTrigger` ·
  เส้นคั่นแนวตั้ง · breadcrumb เส้นทางเต็ม · ขวาสุด = `LanguageSwitcher`
  (เมื่อ th+en) แล้ว `ThemeToggle` (เมื่อ dark = มี) · มี `border-b` คั่นกับ
  เนื้อหา · แผงขาว (`bg-card shadow-xs`) เหมือน sidebar — header ที่มีแต่ trigger เปล่า ๆ คือการติดตั้งที่ไม่ครบ
- **Breadcrumb อยู่ใน site-header ที่เดียว** (ห้ามวางเหนือ title ในหน้า):
  `ไอคอนบ้าน › group (จุดสี) › หน้า › segment ลึกกว่า` — เริ่มด้วยไอคอนบ้าน · หัวกลุ่มมีจุดสีของ
  กลุ่ม · label มาจาก nav config ชุดเดียวกับ sidebar ห้าม hardcode · ตัวสุดท้าย = หน้าปัจจุบัน
  ไม่เป็นลิงก์ · ตัวก่อนหน้าเป็นลิงก์สี muted · **มือถือเหลือ "จุดสี + หน้าปัจจุบัน"** (ตัดคำ)
  ไม่เบียดปุ่มขวา (มติ 2026-10-16 D7)
- โครงทุกหน้า = `ui/page-shell` เสมอ:
  `PageShell > PageHeader > PageTitle + PageDescription` แล้ว actions ขวาบน
  — **ทุกหน้าต้องมี subtitle** ไม่ใช่หัวข้อลอย ๆ
- **ความกว้างเนื้อหา** (มติ 2026-10-16 A1): ทุกหน้า cap `max-w-[96rem]` (1536px)
  จัดกลาง `mx-auto` · topbar/site-header ยังเต็มกว้าง — จอกว้างบรรทัดและตารางยืดจน
  อ่านยาก (1536 ไม่ใช่ 1280/1440 เพราะแอปข้อมูลหนาแน่น) · cap อยู่ที่ `PageShell`
  จุดเดียว ห้ามตั้งรายหน้า
- **หัวหน้า**: `PageEyebrow` (ไม่บังคับ — หมวด/กลุ่มเมนูของหน้า ตัวพิมพ์ปกติ ห้าม uppercase) เหนือ
  title · หน้าย่อยมี `PageBackLink` "‹ <ชื่อหน้าแม่>" (12px muted ลิงก์ไปหน้าแม่ที่ตายตัว ไม่ใช่
  ถอยตามประวัติ · ข้อความคือชื่อหน้าปลายทาง ไม่ใช่ "ย้อนกลับ") เหนือ eyebrow/title · ปุ่มหลัก 1 ปุ่ม variant
  `default` (primary) + ปุ่มรอง variant `soft` ใน `PageActions` — ทุกปุ่มขนาด `cta` (มติ 2026-10-16 A10/B11)
- **รูปแบบหน้ามี 3 แบบ ห้ามคิดแบบใหม่รายหน้า** (มติ 2026-10-16 D12 เพิ่มแบบที่ 3):
  - **หน้าข้อมูล** — หัวหน้า + actions + เนื้อหาในการ์ด
  - **หน้าฟอร์ม** — ส่วน 4 §ฟอร์มแยกหน้า (คอลัมน์เดียว การ์ดต่อ section)
  - **หน้า dashboard** — hero (จุดเดียวที่ gradient ได้) → แถว `StatCard`
    (`grid-cols-2 lg:grid-cols-4` · ค่า + delta เทียบช่วงก่อน · กดแล้วไปหน้าที่เกี่ยว) →
    แถวการ์ดที่มี `CardHeading` (`ui/card-heading`) สูงเท่ากันต่อแถว
    > `StatCard` มากับ kit ≥ next release — ยังไม่มีไฟล์ใน kit วันนี้
    > ห้าม hand-build การ์ดตัวเลขเองระหว่างรอ ใช้ `Card` + `CardHeading` + ข้อความ
- **แถบ filter ระดับหน้า** (filter ที่อยู่นอกตาราง เช่น ปี/เดือน/หน่วยงาน):
  อยู่ใน**หัวการ์ดเดียวกับตาราง** (ไม่ลอยเหนือการ์ด ไม่แยกการ์ด) · **ชิดซ้าย**
  เรียง**กว้างไปแคบ**: ช่วงเวลา → หน่วยงาน/ขอบเขต → สถานะ · ปุ่ม action ของหน้า
  ยังอยู่ขวาบนใน `PageActions` เหมือนเดิม ห้ามย้ายลงมาปนแถบ filter ·
  control เลือกตามบันไดส่วน 4 (≤5 = RadioGroup · 6–15 = Select · >15 =
  Combobox · ช่วงวันที่ = `ui/date-range-picker`) — **ห้ามใช้ Input เปล่า
  เป็น filter** ยกเว้นช่องค้นหาอิสระ ซึ่งเป็นของ DataTable อยู่แล้ว
  ห้ามทำซ้ำที่แถบนี้ · **ตารางโหมด server ก็ไม่ใช่ข้อยกเว้น**: ส่ง prop
  `serverSearch={{ value, onChange }}` แล้ว DataTable วาดช่องเดิมให้ +
  หน่วงการพิมพ์ให้ ส่วนหน้าแม่แค่ push คำค้นลง URL (การเขียน Input + ไอคอน
  แว่นเองในโหมด server คือที่มาของข้อนี้)
  > เหตุผลที่พินตำแหน่ง: หน้าที่ทำทีหลังจะได้ไม่หลุดไปวางขวา/แยกการ์ด แล้ว
  > ผู้ใช้ต้องมองหา filter ใหม่ทุกหน้า
- **เลือกหลายแถวแล้วสั่งงานรวม = `ui/bulk-action-bar.tsx`** วางเหนือการ์ดตาราง —
  โผล่เมื่อเลือก **ตั้งแต่ 2 แถวขึ้นไป** (แถวเดียวใช้ปุ่มในแถวตามเดิม) และ
  ระหว่างที่แถบขึ้นให้**ซ่อนปุ่มสั่งงานรายแถว** ไม่ให้มีสองทางสั่งงานพร้อมกัน ·
  ล้างการเลือกผ่าน `resetSelectionKey` ของ `DataTable` ไม่ใช่ remount ทั้งตาราง
- **Mobile เป็นระบบ ไม่ใช่รายหน้า** (มติ 2026-10-16 D8/A12): ตาราง → **list แถวคั่น
  เส้นในการ์ดใบเดียว** (ไม่ใช่การ์ดต่อแถวลอยบนพื้นเทา — DataTable จัดให้) · แถว toolbar
  เต็มกว้าง เรียง **นำทาง/ค้นหา → filter → แถวเครื่องมือรอง** (`toolbarExtra` + ปุ่มตั้งค่า
  คอลัมน์ชิดขวา — ปุ่มตั้งค่าคอลัมน์ไม่ซ่อน) · **ปุ่มหลักของหน้าไม่อยู่ใน toolbar** — อยู่ใน
  `PageActions` เหนือการ์ด เต็มกว้าง `cta` 44px (แถว filter ไม่มีปุ่ม action ตามสัญญากลาง) ·
  popover และ dialog → bottom sheet
- **หน้า login = สองคอลัมน์** (`components/login-shell.tsx` จาก auth-setup): ซ้าย =
  hero ตั้งแต่ `lg` ขึ้นไป (`bg-primary` + รูป `public/login-hero.webp` ถ้ามี ใต้ overlay
  `bg-primary/65`) เรียง 3 แถว — `ube-logo-long.svg` · ชื่อระบบ + คำอธิบาย 1 บรรทัด +
  ฟีเจอร์ 3–4 แถว (ไอคอนใน tile `size-10` + หัวข้อ + บรรทัดรอง) · footer · ขวา = ฟอร์มกลาง
  `bg-muted/30` · มือถือเห็นฟอร์มอย่างเดียว · ข้อความมาจาก `messages/app.*` ของโปรเจค
- Landing page: __LANDING__

## 4. Components

- **สเกล control**: __CONTROL_SCALE__
  (ค่า kit = mira: control `h-7` 28px · ตาราง `text-xs` — โปรเจคใหม่ใช้ค่านี้;
  โปรเจคเดิมที่ตอบข้อ 9 = "ยึดของเดิม" บันทึกค่าที่วัดจริงแทน เช่น
  "control 48px `h-12` · `text-base` · radius 8px — อ้างมติในส่วน 10" และ rebase
  `components/ui/*` ตาม §Scale bridge ของ skill) — ทุก breakpoint เท่ากัน
  ไม่ bump บนมือถือ · ข้อยกเว้นที่ตกลงแล้วมีสองจุดเท่านั้น: ปุ่ม `size="cta"` (§0 ข้อ 4)
  กับตัวอักษรตาราง `2xl:text-sm` (§2)
- **กฎสเกล**: control ทุกตัวในฟอร์มเดียวกันสูงเท่ากันเสมอ · เปลี่ยนขนาดได้ที่
  `components/ui/*` ต้นทางเท่านั้น — ห้าม override ขนาดรายหน้า/รายจุด
- เลือก control: ≤5 = RadioGroup · 6–15 = Select · >15/ค้นหา = Combobox ·
  วันที่ = `ui/date-picker` เสมอ (ยกเว้น filter ปี/เดือน = Select)
- Form: label บนช่อง · required = `*` แดง · **ผูก zod + react-hook-form ผ่าน
  `zodResolver` เสมอ** (ไม่ใช่ `useState` ต่อช่อง) · error ของช่องอยู่ใต้ช่อง
  ผ่าน `ui/field` · **error ระดับฟอร์ม** (ล็อกอินผิด, เซิร์ฟเวอร์ปฏิเสธ) เป็น
  `Callout tone="danger"` ค้างอยู่ในฟอร์ม **ไม่ใช่ toast** — toast หายไปเอง
  คนอ่านไม่ทันแล้วไม่รู้ว่าทำไมกดไม่ผ่าน · ฟอร์มใน dialog ใช้ `FormDialog`
  (หรือ `Sheet` ตามบันไดด้านล่าง) แล้วผูกปุ่ม submit ที่อยู่นอก `<form>` ด้วย `form="<id>"`
  · validate ตอน submit แล้ว re-validate ต่อ field
  > **`*` ต้องอยู่บรรทัดเดียวกับข้อความ label เสมอ** — ตัว label เป็น flex row
  > ไม่ใช่ grid item แยก ไม่งั้น `*` ตกลงบรรทัดใหม่ กลายเป็นดาวลอยเหนือช่อง
- **ความกว้าง control ในฟอร์ม = เต็มช่อง grid เสมอ (`w-full`)** — ห้ามปล่อย
  ยุบตามข้อมูล: `SelectTrigger` ของ base-mira default เป็น `w-fit` พอเลือก
  ค่าสั้นช่องจะหดเหลือตามค่า (บั๊กหน้างานจริง) → sanctioned edit: เพิ่ม
  `w-full` ใน base classes ของ `SelectTrigger` ที่ `components/ui/select.tsx`
  ต้นทาง (`verify.mjs` ตรวจให้) · ความกว้างที่ต่างกันระหว่างช่องแสดงผ่าน
  `col-span` ของ grid ไม่ใช่ `w-*` รายช่อง · ข้อยกเว้น: control ใน
  toolbar/filter ของตารางส่ง `w-*` คงที่ทับได้ (`w-44`, `w-20` ฯลฯ)
- **ฟอร์มแยกหน้า** (มติ 2026-10-16 D4 แทน "container กึ่งกลาง `max-w-3xl` ไม่ครอบการ์ด"):
  **คอลัมน์เดียวกว้างถึง cap ของหน้า (96rem)** · **แต่ละ section เป็นการ์ด** ที่มี
  `CardHeading` (ไอคอน primary + ชื่อ section) · ช่องเรียงแนวนอนเมื่อจอกว้าง
  (grid ภายในการ์ด) · `PageBackLink` `‹ ชื่อหน้าแม่` เหนือ title + คำอธิบาย · แถบปุ่มท้ายฟอร์ม
  = `PageFormActions` ชิดขวา ขนาด `cta` (ยกเลิก/กลับ `outline` ก่อน · ส่ง primary หลัง) — มือถือ
  ติดขอบล่างเต็มกว้าง grid `[1fr_2fr]` (รอง │ หลัก) · ห้ามข้อมูลสรุปปนในแถบ — ทำไมเปลี่ยน: พอการ์ด
  ขาวลอยบนพื้นเทา (§1 Elevation) ฟอร์มที่ไม่มีการ์ดดูลอยกลางพื้น ไม่เข้าพวกกับหน้าอื่น
- **แถวคู่ label–ค่า** (detail dialog, สรุป, การ์ดข้อมูล): flex `justify-between`
  + `align-items:center` + ระยะระหว่างคอลัมน์ ≥16px + ความสูงแถวขั้นต่ำ ~24px
  — ค่าที่เป็น `StatusBadge` จะได้ไม่ชนข้อความฝั่งซ้าย (badge สูงกว่าข้อความธรรมดา)
- **บันไดเลือกภาชนะฟอร์ม** (มติ 2026-10-16 A11 แทน "FormDialog ≤6 ช่อง" — เลือกจาก
  **งาน** ไม่ใช่จำนวนช่องอย่างเดียว):

  | งาน | ภาชนะ |
  | --- | --- |
  | งานหลักหลายขั้น / ต้องเลือกวันบนปฏิทิน | หน้าเต็ม (§ฟอร์มแยกหน้า) |
  | แก้ 1 record ของ master/ตั้งค่า ≥ 4 ช่อง | `Sheet` — **2 ขนาดเท่านั้น**: `xl` (576px) ฟอร์มล้วน · `5xl` (1024px) มีตารางย่อย |
  | ≤ 3 ช่อง จบในจังหวะเดียว (ขอเหตุผลปฏิเสธ/ยกเลิก) | `FormDialog` (compound + height `fluid`/`auto`/`fill`) |
  | ยืนยันอย่างเดียว ไม่มีช่องกรอก | `ConfirmActionDialog` (`AlertDialog`) ปุ่มมีข้อความ |

  panel ค้างดูคู่เนื้อหา = `Sheet` · read-only = `detail-dialog-shell` · system alert
  บังคับ action เดียว (session หมดอายุ) = `AlertDialog` ปิดไม่ได้ ปุ่ม primary เดียว
  **ไม่มีปุ่มยกเลิก** — ข้อยกเว้น footer ข้อเดียวที่อนุญาต
  > ขนาด Sheet `xl`/`5xl` ตั้งผ่าน `className` ของ `SheetContent` (`sm:max-w-xl` /
  > `sm:max-w-5xl`) ได้สองค่านี้เท่านั้น · ฟอร์มตั้งค่าใน Sheet แบบสำเร็จรูปมากับ kit
  > ≥ next release
  > **นิยาม "ยาว" ให้นับเนื้อหาที่โตตามข้อมูลด้วย** — ฟอร์มที่มี
  > list/checklist ซึ่งความยาวขึ้นกับข้อมูลจริง (เช่น checklist สิทธิ์ที่โต
  > ตาม `ALL_PERMISSIONS`) ถือว่า "ยาว" เสมอแม้วันนี้จะสั้น เพราะ Dialog
  > สูงคงที่แต่ข้อมูลไม่คงที่ → ใช้ `Sheet` (body เลื่อน) หรือหน้าแยก
  > (บทเรียนจริง 4.25.0: ฟอร์มบทบาท "3 ช่อง" เลยถูกยัดใส่ Dialog
  > จน checklist สูงเกินจอแล้ว scroll ไม่ได้)
- **Dialog/Sheet = 3 โซน หัว/เนื้อ/ท้าย** (มติ 2026-10-16 A8 — ตั้งที่ primitive จุดเดียว):
  หัวมีเส้นล่าง · ท้ายมีเส้นบน + พื้น `muted/40` ชนขอบ · **dialog ดูอย่างเดียวไม่มีโซนท้าย** ปิดด้วย ✕
  · **ห้ามใส่เนื้อหา (กล่อง/รายการ/ช่องกรอก) ใน `AlertDialogHeader`** (A9) — หัวมีแค่ title +
  คำอธิบายสั้น เนื้อหาวางต่อจากหัว
- Footer dialog: ยกเลิก (outline) ซ้าย · ยืนยัน primary ขวาสุด · primary
  **ปุ่มเดียว**ต่อ dialog · ปุ่ม footer ขนาด `cta` (มาจาก primitive) · ห้ามซ้อน dialog (ยกเว้น
  AlertDialog ยืนยัน 1 ชั้น) · ฟอร์ม dirty ปิดต้องถามก่อน
- Variant เพิ่มที่อนุญาต: Button `success` (ปุ่มอนุมัติ §1), `soft` (ปุ่มรองในหัวหน้า — มีพื้น),
  `soft-primary`, `soft-destructive`, `soft-success` (toolbar ปุ่มติดกันเยอะ — โปร่งใสตอนพัก),
  `field` (trigger ของ datepicker/combobox — ผิวเหมือน Input), `destructive` แบบทึบ (แทนของ
  preset) และ size `cta` (มติ 2026-10-16) — เพิ่มอื่นต้องเป็นมติส่วน 10 · `ViewToggle`
  (`ui/view-toggle`) = segmented 2–4 ตัวเลือก สลับมุมมอง/ค่าเดียวสั้น ๆ — เกินนั้น `Select`/`Tabs`
- Row actions: ≤3 = `IconAction` · >3 = `DropdownMenu` + `MoreHorizontal`
  > **ทำไม่ได้เพราะสิทธิ์ = ซ่อนปุ่ม** (กฎ §3) · **ทำไม่ได้เพราะ business
  > rule** (แถว system, มีข้อมูลผูกอยู่) = **disabled + tooltip บอกเหตุผล**
  > (มติ 2026-08-21 — ผู้ใช้ต้องเห็นว่าปุ่มมีแต่ใช้ไม่ได้เพราะอะไร;
  > `IconAction` รองรับ `disabled` พร้อม tooltip แล้ว ให้ label เป็นเหตุผล)
- **ไอคอนในวงกลม** (hero ของหน้าเดี่ยว: setup / ยืนยัน / สำเร็จ) — **ไม่มีของกลาง
  ใน shadcn**: `EmptyMedia` ของ registry เป็นสี่เหลี่ยม `size-8 bg-muted` และเป็นช่อง
  ของ empty state คนละงานกัน · จึงใช้ utility ตรง ๆ ตาม §0.1 แต่ **ค่าตายตัวชุดเดียว
  ทั้งองค์กร** ห้ามคิดขนาด/สีเอง:
  `<div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">`
  + ไอคอน `className="size-7 text-primary" strokeWidth={2}` · ใช้ครบ 3 ที่เมื่อไร
  ค่อยยกเป็น component กลาง (วันนี้มีที่เดียว = `admin-setup-form`)
- **Icon mapping**: เพิ่ม `Plus` · แก้ไข `Pencil` · ลบ `Trash2` · กู้คืน
  `RotateCcw` · ดู `Eye` · Import `Upload` · Export `Download` · ค้นหา
  `Search` · กรอง `Filter` · เมนูแถว `MoreHorizontal` · สำเร็จ `CheckCircle2`
  · อนุมัติ `Check` · ปฏิเสธ/ปิด `X` — งานเดียวกันห้ามคนละไอคอน
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
  = แตกหน้า · **ปุ่มหลักของแต่ละแท็บอยู่ใน `PageActions` บนหัวหน้า และเปลี่ยนตามแท็บที่เปิด**
  (มติ 2026-10-16): แท็บละปุ่มหลักเดียว ไม่โชว์ปุ่มของแท็บอื่นค้าง · แท็บที่ไม่มีอะไรให้สร้าง =
  ไม่แสดงปุ่ม (ไม่ใช่ปุ่ม disabled) · ปุ่มที่ใช้ได้ทุกแท็บ (เช่น ส่งออกทั้งหมด) = `soft` คงที่
  ซ้ายของปุ่มหลัก · หัวหน้าอ่าน `?tab=` เพื่อเลือกปุ่ม · มือถือ = `cta` เต็มกว้างใต้ชื่อหน้า
  เหนือแถบแท็บ · toolbar ของตารางในแท็บยังมีแค่ค้นหา/filter/เครื่องมือ (`references/tabbed-pages.md`)
- Tooltip: delay 0 · ห้ามซ่อนข้อมูลจำเป็นไว้ใน tooltip อย่างเดียว
- Chart: `ui/chart` + `--chart-1..5` (series ทั่วไป) · series ที่เป็นสถานะ =
  `--status-*` ตัวเดียวกับ StatusBadge · หมวดที่เกิน 5 สี/ต้องแยกกันชัด = `--cat-1..8`
  — ห้ามสี hardcode · Rich text: tiptap ผ่าน component กลางเท่านั้น
- **DataTable ชุดมาตรฐานเต็ม**: global search · filter รายคอลัมน์
  (Popover+chip+clear) · sort · pagination (default 10 · 10/20/50) · dnd
  สลับคอลัมน์ · ซ่อน/แสดงคอลัมน์ (จำ localStorage) · คืนค่าเริ่มต้น — ปิดได้
  ราย prop · **ห่อการ์ดเดียวทั้งชุดเอง** (toolbar หัวการ์ด · ตารางชิดขอบ ·
  pagination ท้ายการ์ด — มติ 2026-08-21 ตาม §3 "เนื้อหาในการ์ด") ห้ามห่อการ์ด
  ซ้อนอีกชั้น; ตารางใน dialog/sheet ส่ง `card={false}` · การ์ดของ DataTable ใช้เงาเดียวกับ Card
  (`shadow-xs ring-1 ring-border`) · legend ของตารางใส่ prop `footer` (ในการ์ดเดียวกัน — B3) ·
  `sortable` = sort ฝั่ง client แบบ opt-in **ห้ามคู่ `serverPagination`** (sort ได้แค่หน้าเดียว —
  ตาราง server sort ผ่าน `serverQuery` · `verify.mjs` fail)
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

- จอ: `DD/MM/YYYY` **ค.ศ. เสมอ** (iron rule — `lib/format.ts` บังคับ
  `-u-ca-gregory`, ไม่มีทางเลือก พ.ศ.) · มีเวลา = เติม `HH:MM` · wall-clock date
  อ่าน UTC parts (กันเลื่อนวัน) · instant จริงแสดงเวลาไทย Asia/Bangkok
- **ไฟล์ export (Excel/CSV): ISO `yyyy-MM-dd` เสมอ** — คนละมาตรฐานกับจอ
  โดยตั้งใจ (DD/MM ทำ Excel สลับวัน-เดือนตาม locale ผู้รับ)
- **`Date` ที่มาจาก local** (เซลล์ปฏิทินที่ผู้ใช้คลิก, `new Date()`) → `toDateKey()`
  เท่านั้น **ห้าม `formatExportDate`** — ตัวนั้นอ่าน UTC parts พอเจอเที่ยงคืน local
  ที่ +07:00 วันร่นไปหนึ่ง (คลิก 23 ได้ 22) · แยกกันที่ input มาจากไหน ไม่ใช่หน้าตา output
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
- Error ระดับหน้า: `Callout` บนสุดของการ์ด · ระดับฟอร์ม: `Callout` ในฟอร์ม · ระดับ field: ใต้ช่องผ่าน `ui/field` (รายละเอียดที่ส่วน 4)

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
  ทุกหน้าใช้ tab แยกสถานะ", "ตารางที่ผู้ใช้เลือกหลายแถวได้ ให้ยืนยันครั้งเดียว
  ท้ายงาน ไม่ถามทีละแถว") → เป็นมติส่วน 10 พร้อมเหตุผล และถ้าเป็นกฎถาวรให้เขียนเข้า
  ส่วนที่เกี่ยวข้อง (3/4/6) ด้วย ไม่ใช่ทิ้งไว้ใน log อย่างเดียว
  > เส้นแบ่ง: ถามว่า "หน้าถัดไปที่คล้ายกันต้องทำแบบนี้ไหม" — ถ้าใช่ = มติ
- มติ design ทั้งหมดอยู่ไฟล์นี้ (ส่วน 10) — **ไม่ใช่**บ้านมติทั่วไปของโปรเจค
  (`docs/project-context/decisions.md` หรือ `docs/adr/` ตามที่ `00-index.md`
  ระบุ) ซึ่งเก็บมติเรื่องอื่นทั้งหมด

## 9. Deviations (เฉพาะโปรเจคเดิม — จาก scan ตอนติดตั้ง)

| จุดที่ขัดข้อตกลง | ตัดสินใจ | หมายเหตุ |
| --- | --- | --- |
| __DEVIATIONS__ | | |

## 10. มติ (decision log)

| วันที่ | มติ | เหตุผล |
| --- | --- | --- |
| __DATE__ | ติดตั้งข้อตกลงฉบับแรก — __ANSWERS_SUMMARY__ | ตาม interview (__ANSWERED_BY__) |
