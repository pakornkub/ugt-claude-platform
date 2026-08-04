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
toast semantics · motion rules · icon library · accessibility floor.

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
source in DESIGN.md §1. ข้อ 2 with a brand color → substitute `{{PRIMARY}}`
(+ a lighter dark-mode variant as `{{PRIMARY_DARK}}` — it also feeds the
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
| 7 | ปีบนจอ ค.ศ. ใช่ไหม? (ยืนยันครั้งเดียว) | ค.ศ. / พ.ศ. (ต้องมีเหตุผลธุรกิจ → มติ) | **ค.ศ.** — มติร่วม 2 โปรเจค |

## ชุด 3 — เฉพาะโปรเจคเดิมที่ scan เจอ conflict

| # | คำถาม | ตัวเลือก | Default |
| --- | --- | --- | --- |
| 8 | จุดที่ขัดข้อตกลง (แสดงรายการจาก scan) จะทำอย่างไร? | grandfather ไว้ก่อน + บันทึก / migrate ทันที / เลือกรายจุด | **grandfather + บันทึก** ลง Deviations |

## Scan — existing project checklist

Read these before drafting; the draft agreement states what the code
**actually does**, not what the org default is:

| อ่าน | หาอะไร | ไปตอบคำถาม |
| --- | --- | --- |
| `components.json` | style (`radix-mira`? Base UI `base-*`?), baseColor, icon lib | preset conflict → Deviations |
| `app/globals.css` | palette จริง (`--primary`, status tokens มีไหม), radius, font vars | ข้อ 1–2 · token gaps |
| `app/layout.tsx` | ฟ้อนต์จริง (`next/font`), `lang` | font conflict |
| `app/**/layout.tsx` + `components/` | shell จริง (sidebar? topbar?), nav pattern | ข้อ 5 |
| `components/ui/` | ตัวไหนตรง kit กลาง ตัวไหน custom / ตัวไหนแก้ variant เพิ่ม | kit overlap → diff-and-ask |
| `lib/` | formatter วันที่/ตัวเลขมีไหม อยู่ไฟล์ไหน ใช้ ค.ศ./พ.ศ. | ข้อ 7 · format.ts merge plan |
| `messages/` หรือ `i18n/` | มี i18n อยู่แล้วไหม | ข้อ 4 (มีแล้ว = th+en โดยพฤตินัย) |
| grep `#[0-9a-fA-F]{6}` ใน `app/ components/` (`*.tsx`) | สี hardcode นอก token | Deviations |
| grep `<table` ใน `app/ components/` | ตาราง hand-rolled | Deviations |
| grep `toLocaleDateString\|toLocaleString` | format inline นอก formatter | Deviations |

Conflicts found → present as a numbered list with the org rule each violates,
then ask ข้อ 8. Grandfathered items go into DESIGN.md §9 verbatim — the
harness rule keeps them from spreading to new code.
