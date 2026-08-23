# Button variants เพิ่มเติม (org sanctioned)

<!-- source: extracted from gov-boi-smart components/ui/button.tsx (base-mira) — installed by ugt-nextjs-design-setup -->

เพิ่ม variant 4 ตัวลงใน `components/ui/button.tsx` (base-mira) ของโปรเจกต์ —
แก้เฉพาะ object `variants.variant` ภายใน `cva(...)` ไม่ต้องแตะส่วนอื่นของไฟล์

สีถูกแปลงจาก token ของโปรเจกต์ต้นทาง (`--success`) มาเป็น token ขององค์กรแล้ว:

| ความหมาย | token ต้นทาง | token องค์กร | utility |
|---|---|---|---|
| เขียว (สำเร็จ/กู้คืน) | `--success` | `--status-emerald` | `bg-status-emerald`, `text-status-emerald` |
| แดง (ลบ) | `--destructive` | `--destructive` | ตรงกันอยู่แล้ว |
| น้ำเงิน (แก้ไข) | `--primary` | `--primary` | ตรงกันอยู่แล้ว |

(`--status-emerald` ถูก map ไว้ใน `@theme inline` ของ `globals.tokens.css` แล้ว —
utility `bg-status-emerald` / `text-status-emerald` ใช้ได้เลย ไม่ต้องประกาศเพิ่ม)

## สิ่งที่ต้องเพิ่มใน `variants.variant`

```ts
        // ปุ่ม solid เขียว — action เชิงบวก (อนุมัติ / ยืนยันสำเร็จ)
        success: 'bg-status-emerald text-white hover:bg-status-emerald/90',
        // ปุ่มไอคอนในตาราง: พื้นจางตอน hover ให้สีสื่อความหมายโดยไม่ตะโกนใส่ทุกแถว
        // (แก้ไข = น้ำเงิน · ลบ = แดง · กู้คืน = เขียว)
        'soft-primary': 'text-primary hover:bg-primary/10 hover:text-primary',
        'soft-destructive': 'text-destructive hover:bg-destructive/10 hover:text-destructive',
        'soft-success': 'text-status-emerald hover:bg-status-emerald/10 hover:text-status-emerald',
```

หมายเหตุ:

- **ตรวจกับ registry ก่อนเชื่อเอกสารนี้เสมอ** — ค่าจริงของ preset อยู่ที่
  `https://ui.shadcn.com/r/styles/base-mira/button.json` · **ไม่ใช่ shadcn MCP**
  ซึ่งตอบ style default (Radix) · ตรวจล่าสุด 2026-08-21: registry **ไม่มี**
  `success` / `soft-*` / `field` จึงยังต้องเพิ่มเองทั้งหมดตามไฟล์นี้
- `success` ใช้ `text-white` เพราะเป็นปุ่มพื้น solid — ไม่ใช้
  `text-status-emerald-foreground` ซึ่งเป็นสีตัวอักษรสำหรับพื้นจาง (badge/tint)
  > เดิมบรรทัดนี้อ้างว่า "ตามแบบแผนเดียวกับ variant `destructive` ของ base-mira"
  > ซึ่ง**ไม่จริงแล้ว**: registry ปัจจุบันให้ `destructive` เป็นพื้นจาง
  > (`bg-destructive/10 text-destructive`) ไม่ใช่ solid + `text-white` ·
  > ผลคือปุ่มยืนยันลบใน `ConfirmActionDialog` จะออกมาเป็นแดงจาง ไม่ใช่แดงทึบ
  > **มติ 2026-08-21: ยึด preset** — ไม่เพิ่ม variant แดงทึบของเราเอง
  > ปุ่มยืนยันลบจึงเป็นแดงพื้นจาง และ `design-preview.html` วาดตามนี้แล้ว
- ตัวต้นทางมี `focus-visible:ring` เฉพาะสีบน variant `destructive` — ถ้า button.tsx ปลายทาง
  มีแบบแผนนั้น จะเพิ่มให้ `success` ด้วยก็ได้:
  `focus-visible:ring-status-emerald/20 dark:focus-visible:ring-status-emerald/40`
- variant `soft-*` ออกแบบมาใช้คู่กับ `size="icon"` ใน `<IconAction>` (ดู `ui/icon-action.tsx`)
  — พื้นโปร่งใส ตัวอักษร/ไอคอนมีสี แล้วค่อยขึ้นพื้นจาง (10%) ตอน hover

## variant `field` (จำเป็น — `ui/date-picker` ใช้)

trigger ของ popover ที่ทำหน้าที่แทนช่องกรอก (datepicker/combobox) — ผิวต้องเหมือน
`Input`/`SelectTrigger` ไม่ใช่ปุ่ม (ที่มา: ugt-hrms `components/ui/button.tsx`;
registry base-mira ปัจจุบันไม่มี variant นี้แล้ว จึงต้องเพิ่มเองเสมอ):

```ts
field:
  'border-input bg-input/20 hover:bg-input/50 hover:text-foreground aria-expanded:border-ring aria-expanded:ring-2 aria-expanded:ring-ring/30 disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 dark:bg-input/30 dark:hover:bg-input/50 dark:disabled:bg-muted',
```
