# Base UI primitive API — check the registry before writing (not Radix memory)

Where to verify a `components/ui/` primitive's real API (base-mira = Base UI) and the Radix↔Base UI differences that bite most — moved out of `conventions.md` §ตรวจ API.

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
