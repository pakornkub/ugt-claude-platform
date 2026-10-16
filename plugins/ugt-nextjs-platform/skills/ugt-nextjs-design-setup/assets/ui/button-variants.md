# Button variants + size `cta` (org sanctioned)

<!-- source: gov-boi-smart components/ui/button.tsx (base-mira) + ugt-hrms components/ui/button.tsx (soft · destructive ทึบ · cta · field) — installed by ugt-nextjs-design-setup -->

แก้ `components/ui/button.tsx` (base-mira) ของโปรเจกต์ **เฉพาะ object สองตัวใน `cva(...)`** —
`variants.variant` และ `variants.size` · ไม่ต้องแตะส่วนอื่นของไฟล์ (มติ 2026-10-16 D6/A7,
platform `docs/backlog.md` §14 รุ่น 2):

| ที่ | ชื่อ | ทำอะไร | ใช้กับ |
| --- | --- | --- | --- |
| `variant` | `success` | **เพิ่ม** | ปุ่ม**อนุมัติ** (เขียวทึบ + `Check`) · ยืนยันที่เป็นผลบวก |
| `variant` | `destructive` | **แทนที่**ของ registry (พื้นจาง → **แดงทึบ** ตัวอักษรขาว) | ปุ่ม**ยืนยันลบ**/ทำลายข้อมูล (`ConfirmActionDialog`) |
| `variant` | `soft` | **เพิ่ม** | ปุ่ม**รองข้างปุ่มหลักในหัวหน้า** (`PageActions`) — มีพื้น + ขอบตั้งแต่ตอนพัก |
| `variant` | `soft-primary` · `soft-destructive` · `soft-success` | **เพิ่ม** (คงเดิม) | ปุ่มใน **toolbar ที่ปุ่มเรียงติดกันเยอะ** (`ui/tiptap-editor`) — โปร่งใสตอนพัก |
| `variant` | `field` | **เพิ่ม — จำเป็น** (`ui/date-picker` ใช้ ไม่มีแล้ว build พัง) | trigger ของ datepicker/combobox ที่ต้องดูเป็นช่องกรอก |
| `size` | `cta` | **เพิ่ม** | ปุ่มหลักของหน้า · แถบปุ่มท้ายฟอร์ม · footer ของ dialog/sheet (footer ใส่ให้เองผ่าน `primitive-edits.md`) |

สีถูกแปลงจาก token ของโปรเจกต์ต้นทางมาเป็น token ขององค์กรแล้ว:

| ความหมาย | token ต้นทาง | token องค์กร | utility |
|---|---|---|---|
| เขียว (อนุมัติ/กู้คืน) | `--success` | `--status-emerald` | `bg-status-emerald`, `text-status-emerald` |
| แดง (ลบ) | `--destructive` | `--destructive` | ตรงกันอยู่แล้ว |
| น้ำเงิน (หลัก/แก้ไข) | `--primary` | `--primary` | ตรงกันอยู่แล้ว |

(`--status-emerald` ถูก map ไว้ใน `@theme inline` ของ `globals.tokens.css` แล้ว —
utility `bg-status-emerald` / `text-status-emerald` ใช้ได้เลย ไม่ต้องประกาศเพิ่ม)

## `variants.variant` — แทน `destructive` แล้วเพิ่มต่อท้าย

```ts
        // แดงทึบ ตัวอักษรขาว — ยืนยันลบ/ทำลายข้อมูล (มติ 2026-10-16 D6 แทน "ยึด preset แดงจาง")
        // แทนบรรทัด destructive เดิมของ registry ทั้งบรรทัด
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:hover:bg-destructive/70 dark:focus-visible:ring-destructive/40',
        // org sanctioned (design-setup assets/ui/button-variants.md)
        // เขียวทึบ — ปุ่มอนุมัติ / action เชิงบวกที่เป็นผลของการตัดสิน
        success: 'bg-status-emerald text-white hover:bg-status-emerald/90',
        // ปุ่มรองข้างปุ่มหลักในหัวหน้า — มีพื้น primary/10 + ขอบ primary/25 ตั้งแต่ตอนพัก
        soft: 'border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 aria-expanded:bg-primary/15',
        // toolbar ที่ปุ่มเรียงติดกันเยอะ: โปร่งใสตอนพัก พื้นจางตอน hover
        'soft-primary': 'text-primary hover:bg-primary/10 hover:text-primary',
        'soft-destructive': 'text-destructive hover:bg-destructive/10 hover:text-destructive',
        'soft-success': 'text-status-emerald hover:bg-status-emerald/10 hover:text-status-emerald',
        // trigger ของ popover ที่ทำหน้าที่แทนช่องกรอก — ผิวเหมือน Input/SelectTrigger
        field:
          'border-input bg-input/20 hover:bg-input/50 hover:text-foreground aria-expanded:border-ring aria-expanded:ring-2 aria-expanded:ring-ring/30 disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 dark:bg-input/30 dark:hover:bg-input/50 dark:disabled:bg-muted',
```

## `variants.size` — เพิ่ม `cta` ต่อจาก `lg`

```ts
        // ปุ่ม action หลักของหน้า · แถบปุ่มท้ายฟอร์ม · footer ของ dialog/sheet
        // มือถือ 44px (ขนาดนิ้วแตะ) · ตั้งแต่ sm 36px · ตัวอักษร 14px (มติ 2026-10-16 A7)
        cta: "h-11 gap-1.5 px-4 text-sm sm:h-9 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
```

## เลือก variant ไหน — ตัวที่ชื่อคล้ายกันต่างกันตรงไหน

| ต้องการ | ใช้ | ห้ามสลับกับ |
| --- | --- | --- |
| บันทึก / ส่ง / สร้าง / ปุ่มหลักของหน้า | `default` (primary) | `success` — เขียวคือ "ผลบวกของการตัดสิน" ไม่ใช่ปุ่มบันทึก |
| อนุมัติ | `success` + `Check` | `default` — ผู้อนุมัติจะอ่าน "อนุมัติ" เป็น "บันทึก" |
| ปฏิเสธ | `outline` + `className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"` + `X` | `destructive` — แดงทึบสงวนให้การทำลายข้อมูล ปฏิเสธคำขอย้อนสถานะได้ |
| ยืนยันลบ (ใน `ConfirmActionDialog`) | `destructive` (แดงทึบ) | แต่ง className ให้แดงเอง |
| ปุ่มรองในหัวหน้า (Export, ตั้งค่า, …) | `soft` | `outline` (เลิกใช้ในหัวหน้า — hrms มติ 2026-09-30) · `soft-primary` (ไม่มีพื้น ดูไม่ออกว่าเป็นปุ่ม) |
| ปุ่มไอคอนในแถวตาราง | `<IconAction tone>` | `soft-*` — แถวตารางต้องมีพื้นตั้งแต่ตอนพัก (มือถือไม่มี hover) |
| toolbar ปุ่มติดกัน 8–10 ตัว | `ghost` / `soft-*` | `soft` — พื้นทุกใบติดกันหนักเกิน |

## หมายเหตุ

- **ตรวจกับ registry ก่อนเชื่อเอกสารนี้เสมอ** — ค่าจริงของ preset อยู่ที่
  `https://ui.shadcn.com/r/styles/base-mira/button.json` — **URL นี้เท่านั้น**
  (shadcn MCP ตอบ style default ที่เป็น Radix จึงถอดออกจาก plugin แล้ว) ·
  ตรวจล่าสุด 2026-10-16: registry **ไม่มี** `success` / `soft` / `soft-*` / `field` / size `cta`
  และ `destructive` ยังเป็นพื้นจาง (`bg-destructive/10 text-destructive`) — จึงยังต้องแก้ทั้งหมดตามไฟล์นี้
- `success` / `destructive` ใช้ `text-white` เพราะเป็นพื้น solid — ไม่ใช้
  `text-status-*-foreground` ซึ่งเป็นสีตัวอักษรสำหรับพื้นจาง (badge/tint) · จะเพิ่ม focus ring
  สีให้ `success` แบบเดียวกับ `destructive` ก็ได้:
  `focus-visible:ring-status-emerald/20 dark:focus-visible:ring-status-emerald/40`
- `destructive` ทึบมีผลกับทุกจุดที่ใช้ variant นี้ — หน้าที่เคยใช้ `destructive` เป็นปุ่ม
  "ปฏิเสธ" (แดงจางสมัย preset) ต้องย้ายไปเป็นปุ่มปฏิเสธแบบ outline ตามตารางข้างบน
- `cta` เป็นขนาดเดียวที่**ต่างกันตาม breakpoint** — ข้อยกเว้นที่ตกลงแล้วของกฎ "ทุก breakpoint
  เท่ากัน" (DESIGN.md §4) · ใน toolbar/ตาราง/ฟอร์มยังเป็น `default` (28px) เสมอ ห้ามใช้ `cta`
  ให้ปุ่มเด่นขึ้นในแถว toolbar (หนึ่งแถว = หนึ่งขนาด)
- footer ของ `Dialog`/`Sheet`/`AlertDialog` ได้ขนาด `cta` จาก primitive เอง (`primitive-edits.md`)
  — ไม่ต้องส่ง `size="cta"` ทุกปุ่มใน footer · หน้า/แถบปุ่มท้ายฟอร์มส่ง `size="cta"` เอง
- variant `field`: ที่มา ugt-hrms `components/ui/button.tsx` — registry base-mira ไม่มี
  variant นี้แล้ว จึงต้องเพิ่มเองเสมอ (`verify.mjs` fail เมื่อไม่มี)
