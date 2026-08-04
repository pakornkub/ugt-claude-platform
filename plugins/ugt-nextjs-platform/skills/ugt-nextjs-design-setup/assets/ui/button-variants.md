# Button variants เพิ่มเติม (org sanctioned)

<!-- source: extracted from gov-boi-smart components/ui/button.tsx (base-mira) — installed by ugt-nextjs-design-setup -->

เพิ่ม variant 4 ตัวลงใน `components/ui/button.tsx` (radix-mira) ของโปรเจกต์ —
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

- `success` ใช้ `text-white` ตามแบบแผนเดียวกับ variant `destructive` ของ shadcn (radix-mira)
  — ไม่ใช้ `text-status-emerald-foreground` เพราะ token นั้นเป็นสีตัวอักษรสำหรับพื้นจาง (badge/tint)
  ไม่ใช่สำหรับพื้น solid
- ตัวต้นทางมี `focus-visible:ring` เฉพาะสีบน variant `destructive` — ถ้า button.tsx ปลายทาง
  มีแบบแผนนั้น จะเพิ่มให้ `success` ด้วยก็ได้:
  `focus-visible:ring-status-emerald/20 dark:focus-visible:ring-status-emerald/40`
- variant `soft-*` ออกแบบมาใช้คู่กับ `size="icon"` ใน `<IconAction>` (ดู `ui/icon-action.tsx`)
  — พื้นโปร่งใส ตัวอักษร/ไอคอนมีสี แล้วค่อยขึ้นพื้นจาง (10%) ตอน hover

## variant `field` (จำเป็น — `ui/date-picker` ใช้)

trigger ของ popover ที่ทำหน้าที่แทนช่องกรอก (datepicker/combobox) — ผิวต้องเหมือน
`Input`/`SelectTrigger` ไม่ใช่ปุ่ม (ที่มา: ugt-hrms `components/ui/button.tsx`;
registry radix-mira ปัจจุบันไม่มี variant นี้แล้ว จึงต้องเพิ่มเองเสมอ):

```ts
field:
  'border-input bg-input/20 hover:bg-input/50 hover:text-foreground aria-expanded:border-ring aria-expanded:ring-2 aria-expanded:ring-ring/30 disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 dark:bg-input/30 dark:hover:bg-input/50 dark:disabled:bg-muted',
```
