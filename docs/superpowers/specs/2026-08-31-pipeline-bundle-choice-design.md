# Design — เลือก pipeline ระหว่าง superpowers กับ mattpocock-skills (แยก bundle)

> **Status:** Approved-in-chat, รอ review ลายลักษณ์อักษร · **Date:** 2026-08-31
> **Applies-to:** ugt-nextjs-platform 4.54.0 (จะขึ้น 4.55.0), marketplace root
> **ที่มา:** ผู้ใช้บ่นว่า superpowers กิน token เยอะ อยากสลับไปใช้
> mattpocock-skills (grill-with-docs → to-spec → to-tickets → implement →
> code-review) แทน — คุยกันในเซสชันนี้ตั้งแต่เปรียบเทียบพฤติกรรมสอง plugin
> จนถึงดีไซน์สุดท้าย

## 1. ปัญหาที่แก้

โปรเจคที่ติดตั้ง `ugt-nextjs-standard` ได้ superpowers มาโดยอัตโนมัติเป็น
development pipeline เดียว — auto-chain เต็มรูปแบบ (brainstorming → plan →
per-task subagent + reviewer + fix-loop 5 รอบ → final review) ซึ่งกิน token
สูงกว่า mattpocock-skills ที่ทำงานใน session เดียวเป็นหลักและ auto-chain
เฉพาะบางจุด (รายละเอียดเปรียบเทียบเต็มอยู่ในบทสนทนาที่มาถึง spec นี้)
ผู้ใช้ต้องการให้เลือกได้ว่าจะใช้ pipeline ไหน

**ในขอบเขต:** กลไกเลือก pipeline สำหรับ `ugt-nextjs-platform` +
เอกสารที่อธิบายวิธีใช้ mattpocock-skills flow
**นอกขอบเขต:** php/python platform (ยังไม่มี CLAUDE-block.md/routing table
ให้แก้อยู่แล้ว — ทำเมื่อมีจริง)

## 2. มติที่เคาะแล้ว

| # | มติ | เหตุผล |
| --- | --- | --- |
| 2.1 | **ไม่ทำ runtime toggle + suppression table** (ดีไซน์แรกที่เสนอ) | ตารางกันชนเป็น text instruction ล้วน ไม่มี hook บังคับจริง — ถ้า Claude เลือกผิดฝั่ง (มีโอกาสหลุดเสมอ) จะดันให้ pipeline หนักทำงานทั้งที่ user เลือกเบาไว้เพื่อประหยัด token พอดี ขัดเป้าหมายเดิม |
| 2.2 | **แยกเป็น 2 bundle plugin แทน** — เลือกตอน `/plugin install` | ติดตั้งแค่ตัวเดียว → อีกฝั่งไม่มีอยู่ใน context เลย โอกาสเรียกผิดฝั่ง = 0 ไม่ต้องพึ่งการเดาของโมเดล |
| 2.3 | **ชื่อ `ugt-nextjs-standard-superpowers`** (ของเดิม ย้ายชื่อ) **และ `ugt-nextjs-standard-mattpocock`** (ใหม่) | ชื่อบอกตรงว่ามากับ pipeline ไหน — ผู้ใช้เลือกเอง |
| 2.4 | **mattpocock-skills เป็น hard dependency** ของ bundle ใหม่ (ไม่ใช่ soft-check) | ผู้ใช้ยืนยันอยากให้ `/plugin install` แล้วใช้ `/grill-with-docs` ฯลฯ ได้ทันที ไม่ต้องมี fallback เตือนให้ไปติดตั้งเอง |
| 2.5 | **preset/skill ตัวเลือก pipeline ไม่ต้องมี** (ตัด `ugt-pipeline-mode` ออกจากดีไซน์แรกทั้งหมด) | ผลจาก 2.1/2.2 — ไม่มี state ให้ toggle เพราะเลือกตอน install พอ |
| 2.6 | **CLAUDE-block.md (inject ทุก session) ใส่แค่บรรทัดชี้ทางสั้น ๆ** ไม่ใส่คำอธิบาย flow เต็ม | คำอธิบายยาวจะเปลือง token ทุก session ขัดกับเป้าหมายประหยัด token ที่เป็นต้นเหตุของงานนี้ |
| 2.7 | **คำอธิบาย flow เต็ม (5 คำสั่ง + ตาราง) อยู่ที่ README.md + docs/web/index.html เท่านั้น** | เป็นเอกสารที่คนอ่านเอง อ่านครั้งเดียวตอนตัดสินใจ/เรียนรู้ ไม่ถูก inject เข้า context ของ Claude |
| 2.8 | **ไม่แตะ docs/training/{landing,cheatsheet}.html** | grep แล้วสองไฟล์นี้ไม่เคยพูดถึง superpowers/ugt-nextjs-standard เลย — ไม่ใช่ของที่ "sync" อยู่ก่อน การเพิ่มเนื้อหาสอนใหม่ทั้งหมดเป็นงานคนละก้อน ไม่อยู่ในสโคปนี้ |
| 2.9 | **rename เป็น breaking change มีเอกสารย้าย ไม่ทำ compat shim plugin ปลอม** | ตาม YAGNI — ผู้ใช้เดิมของ `ugt-nextjs-standard` (v2.1.0) ต้อง `/plugin install ugt-nextjs-standard-superpowers@ugt` เอง มี note ชัดใน CHANGELOG + README |
| 2.10 | **มติเก่าใน `ugt-nextjs-standard` CHANGELOG 1.3.0 ("mattpocock-skills ถูกประเมินแล้วปฏิเสธ") ถือว่าล้าสมัยแล้ว ไม่ใช่ผิด** | เหตุผลตอนนั้น (superpowers+matt ติดตั้งพร้อมกัน ทำให้ description ซ้ำกันทุก session) ไม่จริงอีกต่อไปเพราะดีไซน์นี้แยก bundle ติดตั้งได้ทีละตัว — ข้อกังวลเรื่อง `grilling` เป็น subset ของ `brainstorming` ยังจริงอยู่ (คนละเป้าหมาย: ตอนนั้นหา best-single-pipeline ตอนนี้หา cheaper-alternative-pipeline) ไม่ใช่เหตุผลให้ปฏิเสธ ต้อง note ไว้ใน CHANGELOG ใหม่ไม่ให้งงว่าทำไมกลับคำ |
| 2.11 | **Cross-reference ที่เก็บความรู้ ไม่รวมเป็นที่เดียว** — `grill-with-docs`/`domain-modeling` เขียน `CONTEXT.md` (root) + `docs/adr/` เอง คนละที่กับ `docs/project-context/` โดยตั้งใจ | มติเก่าข้อ 2 (duplicate knowledge home) ยังจริง แต่แก้ไม่ได้ด้วยการรวมไฟล์ (แก้ skill ของ matt ที่ติดตั้งมาไม่ได้) — แก้ด้วยกฎ **อ่านทั้งคู่ เขียนแค่เจ้าของ** ใน CLAUDE-block.md แทน กันไม่ให้ Claude เผลอ copy เนื้อหาข้ามที่ |

## 3. โครงสร้าง bundle ใหม่

```
plugins/ugt-nextjs-standard-superpowers/
  .claude-plugin/plugin.json   # deps: ugt-nextjs-platform, superpowers, skill-creator, frontend-design
  CHANGELOG.md                 # สืบต่อจาก ugt-nextjs-standard 2.1.0 → 3.0.0 (breaking: rename)

plugins/ugt-nextjs-standard-mattpocock/
  .claude-plugin/plugin.json   # deps: ugt-nextjs-platform, mattpocock-skills, skill-creator, frontend-design
  CHANGELOG.md                 # ใหม่ 1.0.0

plugins/ugt-nextjs-standard/   # ลบทั้งโฟลเดอร์
```

ทั้งสอง plugin.json โครงเดียวกับของเดิมทุกอย่าง เปลี่ยนแค่ `name` และรายการ
`dependencies` ตัวที่เป็น orchestration plugin (superpowers ↔ mattpocock-skills
marketplace `claude-plugins-official`)

## 4. ไฟล์ที่ต้องแก้

| ไฟล์ | การเปลี่ยนแปลง |
| --- | --- |
| **ใหม่** `plugins/ugt-nextjs-standard-superpowers/.claude-plugin/plugin.json` | ย้ายเนื้อหาจาก `ugt-nextjs-standard` เดิม เปลี่ยน `name`, bump `version` → 3.0.0 (breaking rename) |
| **ใหม่** `plugins/ugt-nextjs-standard-superpowers/CHANGELOG.md` | entry 3.0.0: "renamed from ugt-nextjs-standard — no functional change" |
| **ใหม่** `plugins/ugt-nextjs-standard-mattpocock/.claude-plugin/plugin.json` | เหมือนบนแต่ deps เป็น mattpocock-skills, version 1.0.0 |
| **ใหม่** `plugins/ugt-nextjs-standard-mattpocock/CHANGELOG.md` | entry 1.0.0 แรกเริ่ม + note สั้นตามมติ 2.10 อ้างว่า `ugt-nextjs-standard` 1.3.0 เคยปฏิเสธ mattpocock-skills มาก่อน และทำไมรอบนี้ต่างออกไป (bundle แยก ไม่ใช่ติดตั้งคู่กัน) |
| **ลบ** `plugins/ugt-nextjs-standard/` ทั้งโฟลเดอร์ | ย้ายเป็นสองตัวข้างบนแทน |
| `.claude-plugin/marketplace.json` | ลบ entry `ugt-nextjs-standard` เดิม เพิ่ม 2 entry ใหม่ |
| `plugins/ugt-nextjs-platform/skills/ugt-nextjs-full-setup/assets/CLAUDE-block.md` | (a) แถว "Build a feature / fix a bug" ในตาราง Which-skill-when แยก 2 บรรทัดสั้น ๆ — ตรวจว่า `superpowers` หรือ `mattpocock-skills` ติดตั้งอยู่จริง แล้วชี้ไปที่ pipeline ของฝั่งนั้น (matt: ชี้ `/ask-matt` เฉย ๆ ไม่อธิบายซ้ำ) (b) เพิ่ม bullet ใหม่ใน "Where new knowledge goes (4 ทาง)" ตามมติ 2.11 (เนื้อหาอยู่ §5) |
| `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json` | bump 4.54.0 → 4.55.0 |
| `plugins/ugt-nextjs-platform/CHANGELOG.md` | entry 4.55.0 อธิบายการแตก branch ของแถว Which-skill-when |
| `README.md` | (a) ตาราง "มีอะไรในชุดนี้" แยกแถว `ugt-nextjs-standard-superpowers` / `-mattpocock` แทนแถวเดียวเดิม (b) คำสั่ง install/update (บรรทัด 58, 162) เปลี่ยนชื่อ + เพิ่มคำอธิบายเลือกยังไง (c) ตาราง day-to-day แถว "สร้าง feature/แก้บั๊ก" แยกพฤติกรรมตาม bundle (d) subsection ใหม่ "ถ้าเลือก bundle mattpocock — สั่งเองทีละขั้น" พร้อมตาราง 5 คำสั่ง (เนื้อหาอยู่ §5 ด้านล่าง) |
| `docs/web/index.html` | sync กับ README ตามกติกาที่มีอยู่แล้ว (README.md §"สำหรับทีมดูแล platform" ข้อ 3): featured card "แนะนำ — ติดตั้งตัวนี้" แยกเป็น 2 การ์ด, การ์ด "ของแถม" เพิ่ม `mattpocock-skills` คู่ `superpowers` พร้อม note ว่าได้แค่ตัวเดียวตามที่เลือก, คำสั่ง install/update 2 จุด (บรรทัด ~416, ~878) |

**ไม่แตะ**: `docs/training/landing.html`, `docs/training/cheatsheet.html` (2.8),
`ugt-core` (ไม่มี state/skill ใหม่แล้วตาม 2.5), php/python platform

## 5. เนื้อหาเอกสาร — flow mattpocock (README + index.html ใช้เนื้อหาเดียวกัน)

Subsection ใหม่ต่อจากตาราง "หลังติดตั้งแล้ว ชีวิตประจำวันเป็นยังไง" ใน README:

```markdown
### ถ้าเลือก bundle mattpocock — สั่งเองทีละขั้น (ไม่ auto เหมือน superpowers)

| คำสั่ง | ใช้ตอนไหน | ได้อะไร |
| --- | --- | --- |
| `/grill-with-docs` | มี requirement/เอกสารอยู่แล้วแต่ยังมีจุดกำกวม | AI ไล่ถามจนไม่มีจุดที่ต้องเดาเอง เก็บเป็น `CONTEXT.md`/ADR ในโปรเจค |
| `/to-spec` | requirement ชัดแล้ว | เปลี่ยนบทสนทนาให้กลายเป็น spec พร้อมทำต่อ |
| `/to-tickets` | มี spec แล้ว | แตกเป็นงานย่อย พร้อมลำดับก่อน-หลัง |
| `/implement` | มี ticket แล้ว | ลงมือเขียนโค้ดจริง (ขับ TDD ข้างในให้เอง) |
| `/code-review` | โค้ดเสร็จ | ตรวจ 2 แกน: ตรง spec ไหม + ผ่านมาตรฐานโค้ด repo ไหม |

Flow: เคลียร์ requirement → spec → tickets → implement → review — เรียกเอง
ทีละคำสั่ง ไม่มีขั้นไหนต่อขั้นถัดไปให้อัตโนมัติ (ต่างจาก bundle superpowers
ที่ auto-chain ให้) แลกมาด้วยการคุมได้ละเอียดกว่าและ token ต่ำกว่า ลำดับเต็ม
พร้อมทางแยก (prototype/triage/wayfinder) ดูที่ `/ask-matt`
```

`docs/web/index.html` ใช้เนื้อหาตารางเดียวกัน ห่อด้วย markup ของหน้านั้นเอง
(ใช้ class `card`/`grid cols-3` เดิมที่มีอยู่แล้วสำหรับรายการคำสั่ง หรือ
`<table>` ธรรมดาถ้าเข้ากับ layout รอบข้างมากกว่า — ตัดสินหน้างานตอน implement)

CLAUDE-block.md (ตาม 2.6) ใส่แค่:

```markdown
| Build a feature / fix a bug | **superpowers ติดตั้งอยู่**: (พฤติกรรมเดิมทั้งหมด — sizing gate ครบ) · **mattpocock-skills ติดตั้งอยู่แทน**: user-driven ล้วน — Claude ไม่ auto-invoke ให้ รอผู้ใช้เรียก `/grill-with-docs` เอง อ้างอิงลำดับเต็มที่ `/ask-matt` |
```

และ (ตาม 2.11) เพิ่ม bullet ใหม่ต่อท้ายลิสต์ในหัวข้อ "Where new knowledge goes (4 ทาง)":

```markdown
- **โปรเจคที่ใช้ mattpocock bundle**: `grill-with-docs`/`domain-modeling`
  สร้าง/ดูแล `CONTEXT.md` (root, glossary) และ `docs/adr/`
  (การตัดสินใจทางเทคนิค) เอง — คนละที่เก็บกับ `docs/project-context/`
  โดยตั้งใจ **ห้าม copy เนื้อหาข้ามกัน**: เริ่มงานอ่านทั้งคู่
  (`docs/project-context/00-index.md` + `CONTEXT.md`/`docs/adr/` ถ้ามี)
  แต่เขียนแค่ที่เจ้าของมันเขียน — `/ugt-handoff` ดูแลเฉพาะ
  `docs/project-context/` + `handoff.md` เหมือนเดิม ไม่แตะ `CONTEXT.md`/`docs/adr/`
```

## 6. Verification / release checklist

ตามกติกา "สำหรับทีมดูแล platform" ใน README ที่มีอยู่แล้ว:

- [ ] `claude plugin validate ./plugins/ugt-nextjs-standard-superpowers --strict`
- [ ] `claude plugin validate ./plugins/ugt-nextjs-standard-mattpocock --strict`
- [ ] `claude plugin validate ./plugins/ugt-nextjs-platform --strict`
- [ ] รันสคริปต์ตรวจ 5 ตัว (README §"สำหรับทีมดูแล platform" ข้อ 5) — ไฟล์ที่แตะรอบนี้ไม่ใช่ kit asset ก็จริง แต่รันให้ครบตามกติกาเดิม
- [ ] เช็คว่าเวอร์ชันใน README ตาราง "มีอะไรในชุดนี้" กับการ์ดใน `docs/web/index.html` ตรงกัน (สคริปต์ข้อ 5 ตรวจให้)
- [ ] `git mv`/ย้าย `plugins/ugt-nextjs-standard` → 2 โฟลเดอร์ใหม่ ไม่ใช่ copy แล้วลืมลบของเดิม
- [ ] tag `ugt-nextjs-standard-superpowers--v3.0.0`, `ugt-nextjs-standard-mattpocock--v1.0.0`, `ugt-nextjs-platform--v4.55.0` (dependency ก่อน — nextjs-platform ก่อนสอง bundle)
- [ ] ประกาศ breaking change ให้ทีมที่ใช้ `ugt-nextjs-standard` เดิมรัน `/plugin install ugt-nextjs-standard-superpowers@ugt` เอง (2.9)

## 7. คำถามที่ยังเปิดอยู่

ไม่มี — ทุกจุดตกลงกันในบทสนทนาแล้ว (2.1–2.9)
