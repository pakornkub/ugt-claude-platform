# Primitive edits (org sanctioned) — card · table · dialog · sheet · alert-dialog

<!-- source: ugt-hrms components/ui/{card,table,dialog,sheet,alert-dialog}.tsx (radix-mira) — classes re-applied onto the base-mira files by ugt-nextjs-design-setup; the Base UI structure of each file stays as the registry ships it -->

ไฟล์เหล่านี้มาจาก `npx shadcn@latest add` (base-mira) — kit **ไม่ทับทั้งไฟล์** แก้เฉพาะ
string ของ `className` ที่ระบุด้านล่าง (มติ 2026-10-16 D3/B10/A8/A9, platform `docs/backlog.md` §14
รุ่น 2) · คู่กับ `button-variants.md` (size `cta` ต้องมีก่อน — footer ใช้ขนาดเดียวกัน) ·
**ตรวจกับ registry ก่อนแก้เสมอ**: `curl -s https://ui.shadcn.com/r/styles/base-mira/<name>.json`
(ตรวจล่าสุด 2026-10-16 — string "เดิม" ข้างล่างตรงกับ registry วันนั้นทุกตัว) ·
ถ้า string เดิมไม่ตรงแล้ว (registry เปลี่ยน / โปรเจคเคยแก้) ให้ใส่ "สิ่งที่ต้องได้" ลงไปเองโดยคง class
อื่นของไฟล์ไว้ — อย่าลอกไฟล์ทั้งไฟล์จาก hrms (เป็น Radix)

`verify.mjs` เตือน (ไม่ fail) เมื่อข้อใดยังไม่ได้แก้ — โปรเจคที่ติดตั้งก่อนรุ่นนี้รับผ่าน
"sync ข้อตกลง design"

## `components/ui/card.tsx` — elevation (D3) + หัวการ์ดตัด pt เอง (B2)

`Card` (บรรทัด className ของ `data-slot="card"`):

- เดิม `… text-card-foreground ring-1 ring-foreground/10 …` → **`… text-card-foreground shadow-xs ring-1 ring-border …`**
- เพิ่ม **`has-[>[data-slot=card-heading]]:pt-0`** ต่อจาก `has-[>img:first-child]:pt-0`
  (ลูกตรงเท่านั้น — การ์ดนอกที่มีการ์ดซ้อนข้างในไม่เสีย pt)

**ห้ามแตะ `rounded-lg`** — การ์ด = 7.2px (มติ TK-RAD) · เงาตั้งที่นี่จุดเดียว ห้ามใส่ `shadow-*`
รายหน้า · หัวการ์ดเองคือ kit component `ui/card-heading.tsx` (ไม่ใช่ฟังก์ชันใน card.tsx — แยกไฟล์
เพื่อให้ `ugt-nextjs-kit-sync` อัปเดตได้)

## `components/ui/table.tsx` — ตัวอักษรตาราง (B10)

`Table` (`<table data-slot="table">`): เดิม `"w-full caption-bottom text-xs"` →
**`"w-full caption-bottom text-xs 2xl:text-sm"`** (12px → 14px ตั้งแต่ 1536px — หัวและเนื้อขยายพร้อมกัน ·
ห้าม override ราย cell)

## `components/ui/input.tsx` · `textarea.tsx` — ช่องพิมพ์ 16px บนมือถือ (มติ 2026-10-18)

ใน className ของ primitive แทน token **`text-sm` → `text-base`** (คง `md:text-xs/relaxed` ไว้) — Safari บน iOS
ซูมทั้งหน้าเมื่อโฟกัสช่องที่ตัวอักษร < 16px แล้วไม่ซูมกลับ · ตั้งแต่ `md` ขนาดเดิม · `InputGroup`/`TimeInput`/
`Combobox` ได้ตามเพราะใช้ `Input` ตัวนี้ · `select` ของ kit เป็นปุ่ม (ไม่ซูม) ไม่ต้องแก้ · **ห้าม**
`maximum-scale=1` ใน viewport แทน (ปิดการซูมของคนสายตาไม่ดี)

## `components/ui/dialog.tsx` — 3 โซน หัว/เนื้อ/ท้าย (A8)

- `DialogHeader`: เดิม `"flex flex-col gap-1"` → **`"-mx-4 flex flex-col gap-1 border-b px-4 pb-3"`**
- `DialogFooter`: เดิม `"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"` →

  ```ts
  "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/40 px-4 py-3 sm:flex-row sm:justify-end [&_button]:h-11 [&_button]:px-4 [&_button]:text-sm sm:[&_button]:h-9"
  ```

  เส้นบน + พื้นเทาอ่อน**ชนขอบ** dialog (`-mx-4 -mb-4` หักล้าง `p-4` ของ `DialogContent`) · ปุ่มทุกตัว
  ใน footer ได้ขนาด `cta` เองโดยไม่ต้องส่ง `size` รายปุ่ม — **descendant** (`[&_button]` ไม่ใช่ `*:`)
  จึงถึงปุ่มที่ห่อใน `<div>` ด้วย · Base UI วาด `Switch`/`Checkbox` เป็น `<span>` จึงไม่โดนกฎนี้

## `components/ui/sheet.tsx` — โซนเดียวกับ dialog

- `SheetHeader`: เดิม `"flex flex-col gap-1.5 p-6"` → **`"flex flex-col gap-1.5 border-b p-6"`**
- `SheetFooter`: เดิม `"mt-auto flex flex-col gap-2 p-6"` →

  ```ts
  "mt-auto flex flex-row justify-end gap-2 border-t bg-muted/40 p-6 [&_button]:h-11 [&_button]:px-4 [&_button]:text-sm sm:[&_button]:h-9"
  ```

(Sheet ไม่มี padding รอบนอก — `p-6` อยู่ที่ header/footer เอง จึงไม่ต้องหักขอบ)

## `components/ui/alert-dialog.tsx` — โซนเดียวกัน + ปุ่ม `cta` เป็นค่าเริ่มต้น

- `AlertDialogHeader`: เติม **`-mx-4`** หน้า class เดิม และ **`border-b px-4 pb-3`** ต่อจาก `gap-1`
  (เดิม `"grid grid-rows-[auto_1fr] place-items-center gap-1 text-center …"` →
  `"-mx-4 grid grid-rows-[auto_1fr] place-items-center gap-1 border-b px-4 pb-3 text-center …"` — ส่วน `…`
  คงเดิมทั้งหมด)
- `AlertDialogFooter`: เติม **`-mx-4 -mb-4`** หน้า class เดิม และ **`rounded-b-xl border-t bg-muted/40 px-4 py-3`**
  ต่อจาก `gap-2` (คง `group-data-[size=sm]/…:grid-cols-2` และ `sm:flex-row sm:justify-end` ไว้)
- `AlertDialogAction`: รับ `size = "cta"` ใน destructure แล้วส่ง `size={size}` ให้ `<Button>`
  (registry ไม่ destructure size — ปล่อยให้ Button ใช้ `default`)
- `AlertDialogCancel`: ค่าเริ่มต้น `size = "default"` → **`size = "cta"`**

**ห้ามใส่เนื้อหาใน `AlertDialogHeader`** (A9) — หัวเป็น grid `place-items-start` ที่บีบกล่อง/รายการ/
ช่องกรอกให้แคบ · หัวมีแค่ `AlertDialogTitle` + `AlertDialogDescription` สั้น ๆ · เนื้อหาวางเป็นลูกของ
`AlertDialogContent` ต่อจากหัว (`ConfirmActionDialog` รับเป็น `children`)

## กติกาที่มากับโซน

- **dialog/sheet ดูอย่างเดียว (ไม่มี action) ไม่มีโซนท้าย** — ปิดด้วย ✕ ของ `DialogContent`
  (`DetailDialogShell` ไม่ render footer เมื่อไม่ส่ง `footer`) · อย่าใส่ footer ที่มีแต่ปุ่ม "ปิด"
- footer: ยกเลิก (`outline`) ซ้าย · ยืนยัน (primary) ขวาสุด · primary ปุ่มเดียวต่อ dialog
- `FormDialogContent` เป็น `p-0` — `FormDialogHeader`/`FormDialogFooter` ของ kit หักล้าง `-mx-4 -mb-4`
  และตั้ง padding ของตัวเองให้แล้ว ใช้ตรงได้เลย

## `components/ui/sidebar.tsx` — อยู่ที่ `references/layout-shells.md`

สาม edit อยู่ที่ `references/layout-shells.md` §Org shell rules (ข้างกฎ shell ที่มันรับใช้): `scroll-thin`
(SidebarContent) · `min-w-0` (SidebarInset) · active row ทึบ `data-active:bg-sidebar-primary` + badge/action
`peer-data-active/menu-button:text-sidebar-primary-foreground` (มติ 2026-10-16 D7 — `verify.mjs` เตือนเมื่อยังเป็น Subtle)
