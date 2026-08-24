# Interview — question bank, defaults, and the existing-project scan

Ask with AskUserQuestion, batches of ≤4, first option = the default marked
"(แนะนำ)". Every question has an "อื่นๆ" free-text escape (the tool adds it);
a free-text answer is a **custom มติ** — record it in DESIGN.md ส่วน 10 with
the user's reason.

**Fast path**: "ตามมาตรฐานทั้งหมด" accepts every default below. Still record
every value into DESIGN.md — a default answered is still an agreement.

**What is deliberately NOT asked** (iron rules / org defaults with converged
evidence — the user deviates only via "อื่นๆ", which forces a มติ): fonts ·
density/sizes · radius · the semantic-6 status set · date/number formats ·
toast semantics · motion rules · icon library · accessibility floor. **ปีบนจอ
เป็น ค.ศ. เสมอ ไม่ใช่แค่ default แต่ไม่มีทางเลือกให้ deviate เลย** —
`lib/format.ts` บังคับ `-u-ca-gregory` ที่ formatter เดียว ไม่มีโค้ดแปลง พ.ศ.
เส้นทางไหนก็ตาม ถามแล้วให้ตอบ "พ.ศ." คือสร้างมติที่โค้ดทำตามไม่ได้ — เคยเป็น
คำถามข้อ 7 มาก่อน ตัดออกเมื่อพบว่าขัดกับตัวมันเอง (2026-08-24)
**One exception**: an existing project whose measured control scale differs
from the kit gets ข้อ 9 — silently applying the org density there produces a
two-scale UI (a 48px legacy input next to a 28px kit button in the same form).

## ชุด 1 — Visual identity

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 1 | มี prototype / ระบบเดิม / brand ที่ต้อง match ไหม? | ไม่มี / มี (ระบุ path หรือ URL) | **ไม่มี** — ใช้ค่ากลางองค์กร |
| 2 | สี primary? | ค่ากลางองค์กร (indigo) / พิมพ์ค่า brand | **indigo กลาง** `oklch(0.488 0.243 264.4)` |
| 3 | Dark mode? | มี + toggle / ไม่มี (token เตรียมไว้) | **มี + toggle** |
| 4 | ภาษา UI? | ไทยล้วน / ไทย+อังกฤษ (i18n เต็ม th/en) | **ไทยล้วน** (i18n เต็มแพงกว่า — เลือกเมื่อมี requirement จริง) |

ข้อ 1 ตอบ "มี" → the reference **overrides the org palette**: extract tokens
from the prototype/brand FIRST (before any UI work — the retheme lesson),
map them onto the same token names, run check-contrast, and record the
source in DESIGN.md §1. ข้อ 2 with a brand color → substitute `__PRIMARY__`
(+ a lighter dark-mode variant as `__PRIMARY_DARK__` — it also feeds the
dark `--ring`/`--sidebar-ring`) and run check-contrast.

**Brand-color AA trap (predictable — handle, don't discover):** for a
mid-lightness brand color (many greens/oranges), "dark primary must be
lighter than light" + the template's near-white `--primary-foreground`
cannot BOTH pass AA — a lighter fill pushes white text below 4.5:1. The
sanctioned fix: flip the **dark** `--primary-foreground` to a dark tone of
the brand hue (e.g. `oklch(0.16 0.035 <hue>)`), keep light mode as-is,
record it as a มติ. check-contrast.mjs is the arbiter — never ship a
failing pair, never silently darken the dark primary below the light one.

## ชุด 2 — Layout

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 5 | App shell? | Sidebar (collapse ได้) / Topbar / Sidebar + Topbar | **Sidebar** |
| 6 | Landing page? | ไม่มี — login เข้าแอปเลย / มี (เลือก block ตอน implement) | **ไม่มี** (แอปภายใน) |

## ชุด 3 — เฉพาะโปรเจคเดิมที่ scan เจอ conflict

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 8 | จุดที่ขัดข้อตกลง (แสดงรายการจาก scan) จะทำอย่างไร? | grandfather ไว้ก่อน + บันทึก / migrate ทันที / เลือกรายจุด | **grandfather + บันทึก** ลง Deviations |
| 9 | [เฉพาะเมื่อ §Scale scan พบสเกลต่างจาก kit] ฟอร์มเดิม (control **`<ค่าที่วัดได้>`**) กับ component ใหม่จาก shadcn (control 28px `h-7`) จะอยู่ปนกันในแอปเดียว — ยึดสเกลไหน? | ยึดของเดิม — rebase kit ให้เท่า / ยึด kit — migrate ของเดิมลงมา / แยกโซน ห้ามปนใน 1 หน้า | **ยึดของเดิม + rebase kit** |

ข้อ 9 — ใส่**ตัวเลขจริงจาก Scale scan ลงในตัวคำถามเสมอ** (เช่น "input เดิม 48px
vs kit 28px") และบอกราคาของแต่ละทางใน description ของตัวเลือก:

- **ยึดของเดิม (แนะนำ)** — rebase kit ตาม §Scale bridge: แก้ไฟล์ต้นทางไม่กี่ไฟล์
  หน้าเดิมไม่ต้องแตะ component ใหม่ทุกตัวกลมกลืนทันที — ทางที่ถูกเมื่อโจทย์คือ
  "คงรูปแบบเดิม"
- **ยึด kit** — migrate ฟอร์ม/ตารางเดิมลงมาที่สเกล kit: งานมากกว่าและแตะหน้าเดิม
  เลือกเมื่อสเกลเดิมไม่ได้ตั้งใจ (เช่นติดมาจากเทมเพลตเก่า)
- **แยกโซน** — ห้ามปนใน 1 หน้า: หน้าเดิมใช้ของเดิมล้วน หน้าใหม่ใช้ kit ล้วน —
  เหมาะเมื่อวางแผน rewrite ทีละหน้าอยู่แล้ว แลกกับสองสเกลอยู่คนละหน้าชั่วคราว

คำตอบ → มติใน DESIGN.md ส่วน 10 + เติมค่าในบรรทัดสเกลของ §4 · ถ้า scan พบว่า
สเกลตรงกับ kit อยู่แล้ว ไม่ต้องถาม ใช้ค่า kit ตามเดิม · **ผลลัพธ์ที่ห้ามเกิด
คือทางสายกลางแบบไม่ได้เลือก** — kit ขนาด default โผล่ปนในจอเดียวกับ control
เดิมขนาดใหญ่ ซึ่งคือ bug ภาคสนามที่ทำให้ข้อนี้ถือกำเนิด

## Scan — existing project checklist

Read these before drafting; the draft agreement states what the code
**actually does**, not what the org default is:

| อ่าน | หาอะไร | ไปตอบคำถาม |
| --- | --- | --- |
| `components.json` | style (`base-mira` = ตรงมาตรฐาน · `radix-*` = conflict), baseColor, icon lib | preset conflict → Deviations |
| `package.json` (เมื่อไม่มี `components.json` — โปรเจคเดิมที่ไม่เคยใช้ shadcn) | UI lib เดิม (MUI, Ant Design, Bootstrap, Chakra, styled-components, ...) และเวอร์ชัน | ข้อ 8 — grandfather (อยู่ร่วมกับ shadcn ช่วงเปลี่ยนผ่าน) หรือ migrate หน้าเดิมมาที่ shadcn |
| `app/globals.css` | palette จริง (`--primary`, status tokens มีไหม), radius, font vars | ข้อ 1–2 · token gaps |
| `app/layout.tsx` | ฟ้อนต์จริง (`next/font`), `lang` | font conflict |
| `app/**/layout.tsx` + `components/` | shell จริง (sidebar? topbar?), nav pattern | ข้อ 5 |
| `components/ui/` | ตัวไหนตรง kit กลาง ตัวไหน custom / ตัวไหนแก้ variant เพิ่ม | kit overlap → diff-and-ask |
| `lib/` | formatter วันที่/ตัวเลขมีไหม อยู่ไฟล์ไหน ใช้ ค.ศ./พ.ศ. | พ.ศ. ที่เจอ = migrate เป็น ค.ศ. เสมอ (iron rule ไม่ใช่มติ) · format.ts merge plan |
| `messages/` หรือ `i18n/` | มี i18n อยู่แล้วไหม | ข้อ 4 (มีแล้ว = th+en โดยพฤตินัย) |
| grep `#[0-9a-fA-F]{6}` ใน `app/ components/` (`*.tsx`) | สี hardcode นอก token | Deviations |
| grep `<table` ใน `app/ components/` | ตาราง hand-rolled | Deviations |
| grep `toLocaleDateString\|toLocaleString` | format inline นอก formatter | Deviations |

No `components.json` yet (the package.json exception): skip that row, run
every other row as normal, and treat the existing UI lib itself as the
first Deviation — the shadcn init in Step 3 still runs and installs
alongside it; the existing lib's pages are what ข้อ 8 decides on.

Conflicts found → present as a numbered list with the org rule each violates,
then ask ข้อ 8. Grandfathered items go into DESIGN.md §9 verbatim — the
harness rule keeps them from spreading to new code.

## Scale scan — วัดสเกล UI ของเดิม (ก่อนถามข้อ 9)

วัดจาก**โค้ดจริง** (grep className + อ่านไฟล์ CSS/SCSS เดิมทั้งไฟล์ถ้ามี —
อย่าเดาจากตา) แล้วสรุปเป็นตารางเทียบ "ของเดิม vs kit" ให้ผู้ติดตั้งเห็นก่อนตอบ
แถวไหนต่างจาก kit → ติดธงเข้าข้อ 9 · grep เริ่มต้น:
`h-\d+|py-\d|px-\d|gap-\d|text-(xs|sm|base|lg|xl)|rounded|shadow|ring|height:|padding:|font-size:|border`
ใน `app/ components/` (`*.tsx`) + stylesheet เดิม

| กลุ่ม | วัดอะไร | ค่า kit (base-mira) เอาไว้เทียบ |
| --- | --- | --- |
| ขนาด control | ความสูง input / button / select / textarea · padding x/y · ขนาด icon ในปุ่มและช่อง | control `h-7` (28px) · icon `size-4` |
| รูปทรง | radius แยกชั้น chip/control/card/overlay · ความหนา+สี border · เงาของ card/popover · focus ring (สี ความหนา offset) | `--radius` 0.45rem (สเกล sm–4xl คำนวณต่อ) · ring `--ring` |
| ตัวอักษร | font-size + weight ของข้อความใน control · label · placeholder · สเกล heading (title หน้า, หัว section) · line-height ในฟอร์ม | control `text-sm` · ตาราง `text-xs` · title `text-2xl font-semibold` |
| Density | gap ระหว่างช่องในฟอร์ม · padding ของ card/section · ความสูงแถวตาราง + padding cell | ตาราง compact `text-xs` · ฟอร์ม gap มาตรฐาน kit |
| แบบแผนฟอร์ม | ตำแหน่ง label (บนช่อง/ลอย/ซ้าย) · เครื่องหมาย required · ตำแหน่ง-สี-ขนาดข้อความ error · สไตล์ disabled/hover ที่ทำเอง | label บนช่อง · `*` แดงท้าย label · error ใต้ช่องผ่าน `ui/field` |
| สี | — อยู่ใน checklist หลักด้านบนแล้ว (palette · status token · hardcode hex) | — |

รายงานผลเป็นตารางเดียว: มิติ · ค่าที่วัดได้ · ค่า kit · ต่าง/ตรง — เฉพาะแถวที่
"ต่าง" ไปโผล่ในตัวคำถามข้อ 9

## Scale bridge — rebase kit ให้เท่าสเกลเดิม (เมื่อข้อ 9 = ยึดของเดิม)

หลักข้อเดียว: **แก้ที่ต้นทางเท่านั้น — ห้าม override รายหน้า/รายจุด** การไปแปะ
`className="h-12"` ทีละที่คือที่มาของความมั่วรอบสอง (สองสัปดาห์ต่อมาไม่มีใคร
รู้ว่าค่าจริงของโปรเจคคือเท่าไร) ไฟล์ `components/ui/*` เป็นของโปรเจค — การแก้
base class ในนั้นคือวิธีที่ shadcn ตั้งใจให้ทำ

| มิติ | แก้ที่ (จุดเดียว) |
| --- | --- |
| ความสูง + padding + font-size ของ control | base class ใน `ui/input.tsx` · `ui/button.tsx` (default size variant) · `ui/select.tsx` (trigger) · `ui/textarea.tsx` |
| ขนาด icon ในปุ่ม/ช่อง | `ui/button.tsx` / `ui/input-group.tsx` — ให้สัมพันธ์ความสูงใหม่ (≤32px → `size-4` · ≥40px → `size-5`) |
| radius | `--radius` ใน `app/globals.css` — สเกล sm–4xl คำนวณต่ออัตโนมัติ ห้ามแก้รายชั้น |
| focus ring · border · เงา | token `--ring`/`--border` + class ใน ui component ต้นทาง |
| ความสูงแถว/ตัวอักษรตาราง | `ui/table.tsx` + DataTable จุดเดียว (กฎเดิม §2: ห้าม override ราย cell) |
| แบบแผน label / required / error | `ui/field` จุดเดียว |
| gap ฟอร์ม · padding card | ค่ากลางใน DESIGN.md §4 — โค้ดใหม่อ้างค่านี้ ไม่กำหนดเอง |

หลัง rebase: บันทึกทุกค่าที่เลือกลง DESIGN.md §4 (บรรทัดสเกล) + มติส่วน 10 ·
รัน `check-contrast` ตามปกติ — สเกลไม่กระทบสี แต่ focus ring ที่แก้ต้องยังผ่าน ·
ปิดท้ายด้วยกฎที่เข้ากับทุกทางเลือก: **control ทุกตัวในฟอร์มเดียวกันต้องสูง
เท่ากันเสมอ**
