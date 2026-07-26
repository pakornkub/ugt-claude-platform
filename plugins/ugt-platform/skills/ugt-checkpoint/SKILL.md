---
name: ugt-checkpoint
description: >
  Save or read the project's handoff state — `.claude/state/checkpoint.md`
  (what's done / in progress / next, plus decisions taken) and
  `.claude/state/project-notes.md` (Error Patterns, Deviations, Open Questions).
  Use at the END of any work chunk before the session ends, when the user says
  "บันทึกไว้", "จบงานแล้ว", "save state", "handoff", "checkpoint", or when a bug
  was just diagnosed and the fix is worth recording so the next session doesn't
  rediscover it. Also use when starting work and the checkpoint looks stale or
  contradicts what's actually in the code.
  These two files are committed, so they are the TEAM's memory — separate from
  Claude's own auto memory, which is machine-local and not shared.
  Don't use it to install anything (→ ugt-setup) or to record a gotcha that is
  true for every project on this stack — that belongs in a PR to the platform
  repo, not in one project's notes.
---

# UGT Checkpoint — บันทึก state ให้ session หน้าและให้คนอื่นในทีม

## ทำไมต้องมีไฟล์นี้ ในเมื่อ Claude มี auto memory อยู่แล้ว

auto memory (`~/.claude/projects/<repo>/memory/`) เป็นของ **เครื่องคนนั้นคนเดียว** —
doc ระบุชัดว่า *"Auto memory is machine-local... Files are not shared across machines"*
ดังนั้นสิ่งที่ทีมต้องรู้ร่วมกันต้องอยู่ในไฟล์ที่ commit ไปกับ repo

| ที่เก็บ | เนื้อหา | ใครเห็น |
| --- | --- | --- |
| `.claude/state/checkpoint.md` | สถานะงานปัจจุบัน + decision ที่ตัดสินไปแล้ว | ทุกคนที่ clone repo |
| `.claude/state/project-notes.md` | Error Patterns · Deviations · Open Questions | ทุกคนที่ clone repo |
| auto memory | ความชอบ/นิสัยการทำงานของคนใช้เครื่องนั้น | คนนั้น เครื่องนั้น |

**เมื่อขัดกัน ให้ยึดไฟล์ที่ commit** — auto memory อาจเป็นของเก่าหรือของคนอื่น

## เขียน checkpoint (ตอนจบงาน)

1. อ่าน `.claude/state/checkpoint.md` เดิมก่อน — **อัปเดต ไม่ใช่เขียนทับทิ้ง**
   ประวัติของ decision มีค่า
2. อัปเดตให้ตรงกับความจริง ณ ตอนนี้ ตามโครงนี้ (คงหัวข้อไว้ทั้งหมด อย่าเพิ่ม/ลบหัวข้อ):

```markdown
# Checkpoint

อัปเดตล่าสุด: YYYY-MM-DD

## กำลังทำ
- <งานที่ค้างอยู่จริง ๆ พร้อมไฟล์ที่แตะไว้ครึ่งทาง — ถ้าไม่มี ให้เขียนว่า "ไม่มีงานค้าง">

## เสร็จแล้ว (ล่าสุดอยู่บนสุด)
- YYYY-MM-DD <สิ่งที่เสร็จ + ไฟล์หลักที่เกี่ยว>

## ต้องทำต่อ
- <งานถัดไปที่รู้แล้วว่าต้องทำ เรียงตามลำดับที่ควรทำ>

## Decision ที่ตัดสินแล้ว (ห้ามรื้อโดยไม่คุยกับทีม)
- YYYY-MM-DD <ตัดสินอะไร> — **เพราะ** <เหตุผล> · ทางที่ไม่เลือก: <ทางเลือกที่ทิ้งไป>
```

3. เขียนสิ่งที่ **สืบย้อนได้** — ชื่อไฟล์ ชื่อฟังก์ชัน เลข PR ไม่ใช่ "แก้บั๊กหน้า user"
4. `Decision` ต้องมี **เหตุผล + ทางที่ไม่เลือก** เสมอ ไม่งั้นอีกสามเดือนจะมีคนรื้อมันโดยไม่รู้ว่าเคยชั่งน้ำหนักมาแล้ว
5. ไม่ต้องใส่สิ่งที่ git บอกได้อยู่แล้ว (diff, ชื่อ commit) — ใส่เฉพาะสิ่งที่อ่านจากโค้ดไม่ได้

## เขียน project-notes (ตอนเจอ error หรือเจอของแปลก)

`.claude/state/project-notes.md` มี **3 หัวข้อตายตัว** ห้ามเพิ่ม:

| หัวข้อ | ใส่อะไร | ตัวอย่างที่ถูก |
| --- | --- | --- |
| **Error Patterns** | อาการ → สาเหตุ → วิธีแก้ ที่เคยเสียเวลาไปแล้ว | "`prisma generate` ขึ้น P1012 หลังเพิ่ม field → ลืมรัน migrate ก่อน → รัน `migrate dev` แล้ว `generate`" |
| **Deviations** | จุดที่โปรเจคนี้**ตั้งใจ**ต่างจากมาตรฐาน `ugt-*` พร้อมเหตุผล | "ตาราง `LegacyEmp` ไม่มี audit columns เพราะเป็น view ที่ dump มาจากระบบเก่า" |
| **Open Questions** | คำถามที่ยังไม่มีคำตอบและบล็อกงานอยู่ + รอใครตอบ | "basePath ของ prod จะเป็น `/hr` หรือ `/hrms` — รอ IT ยืนยัน" |

## ความรู้ใหม่ควรไปไว้ที่ไหน — triage 3 ทาง

ก่อนเขียนอะไรลง `project-notes.md` ถามก่อนว่าความรู้นี้จริงกับใคร:

| ความรู้ | ไปไว้ที่ | ห้ามทำ |
| --- | --- | --- |
| จริงเฉพาะโปรเจคนี้ | `project-notes.md` (หรือ `.claude/rules/<project>-*.md` ถ้าเป็นกฎผูกกับ path) | — |
| จริงกับทุกโปรเจคที่ใช้ stack เดียวกัน (gotcha ของ Prisma/Keycloak/Jenkins) | **เปิด PR เข้า `ugt-claude-platform`** แล้ว bump version | แก้ไฟล์ skill ที่ติดตั้งมา — มันอยู่ใน plugin cache ที่ path เปลี่ยนทุก update และจะถูกลบ |
| เป็นความชอบส่วนตัวของคนใช้ | ปล่อยให้ auto memory จัดการเอง | ยัดลงไฟล์ที่ commit ให้คนอื่นต้องรับด้วย |

**ห้ามสร้าง `.claude/skills/ugt-<ชื่อเดิม>/` ทับ skill ของ platform** — ทำได้ทางเทคนิค
แต่จะได้ความรู้สองชุดที่ต่างกันโดยไม่มีใครรู้ว่ากำลังใช้อันไหน ถ้าต้อง extend
ให้สร้าง skill **ชื่อใหม่** เช่น `.claude/skills/<project>-payroll-rules/`

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| อ่านไฟล์เดิมก่อนแล้วอัปเดต | เขียนทับทั้งไฟล์ (ประวัติ decision หาย) |
| Decision มีเหตุผล + ทางที่ไม่เลือก | "ตัดสินใจใช้ X" ลอย ๆ |
| อ้างชื่อไฟล์/ฟังก์ชันจริง | เขียนกว้าง ๆ ว่า "ปรับปรุงหน้า user" |
| gotcha ที่ใช้ได้ทุกโปรเจค → PR เข้า platform | เก็บไว้ในโปรเจคเดียวแล้วให้โปรเจคอื่นเจอซ้ำ |
| ใส่วันที่ทุกรายการ | ปล่อยไม่มีวันที่ (อีกปีจะไม่รู้ว่าอันไหนยังจริง) |

## Verification

- [ ] `.claude/state/checkpoint.md` มีทั้ง 4 หัวข้อ และ "อัปเดตล่าสุด" เป็นวันนี้
- [ ] `.claude/state/project-notes.md` มี 3 หัวข้อตายตัวครบ
- [ ] ทุกรายการที่เพิ่มมีวันที่ · Decision มีเหตุผลกำกับ
- [ ] ไม่มี secret / ค่าจาก `.env` หลุดลงไฟล์เหล่านี้ (มันถูก commit)
- [ ] `CLAUDE.md` ยัง `@.claude/state/checkpoint.md` อยู่ (ไม่งั้น session หน้าไม่เห็น)
