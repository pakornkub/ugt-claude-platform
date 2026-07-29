# UGT Claude Platform

**Plugin marketplace ขององค์กร** สำหรับ Claude Code — เปลี่ยนโปรเจค Next.js ที่มีอยู่
(รวมถึงโปรเจคที่ user สร้างเองด้วย AI) ให้ deploy ได้จริงตามมาตรฐานองค์กร
พร้อมชั้น harness ที่ทำให้มาตรฐานคงอยู่ข้าม session — สกัด pattern มาจากโปรเจคจริง
ที่ผ่านการใช้งาน production แล้ว

**Stack ที่รองรับ**: TypeScript / React / Next.js (App Router) · Prisma → SQL Server ·
Keycloak (SSO) · Jenkins + SonarQube + Docker — **เท่านั้น** โปรเจค stack อื่นใช้ไม่ได้

## มีอะไรใน marketplace

| Plugin | คืออะไร |
| --- | --- |
| `ugt-core` | ฐานกลางทุก stack — `ugt-checkpoint`, audit hooks, `contracts/` (มาตรฐานต้นทางให้ทุก stack อ้าง) — **ไม่ต้องติดตั้งเอง** ไหลมากับ platform อัตโนมัติ |
| `ugt-nextjs-platform` | skills 6 ตัวของ stack Next.js + harness assets (depend บน `ugt-core`) |
| `ugt-nextjs-standard` | bundle แนะนำ — ติดตั้งตัวเดียวได้ `ugt-nextjs-platform` + `superpowers` (pipeline การพัฒนา: brainstorming → plan → TDD → review) + `skill-creator` (สร้าง skill ของโปรเจคตามมาตรฐานเดียวกัน) |

### Skills ใน `ugt-nextjs-platform`

| Skill | ทำอะไร | เรียกเมื่อไหร่ |
| --- | --- | --- |
| `ugt-nextjs-setup` | ตัวแม่ — interview ครั้งเดียว → ติดตั้ง module ตามลำดับ → ติดตั้ง harness | คำขอกว้าง ๆ ("ทำให้ deploy ได้") |
| `ugt-nextjs-database-setup` | SQL Server ผ่าน Prisma + naming convention + audit columns | งาน DB ทุกชนิด รวมแก้ schema |
| `ugt-nextjs-quality-setup` | Vitest (JUnit+lcov) + ESLint + Prettier + pre-commit | ก่อนทำ CI เสมอ |
| `ugt-nextjs-auth-setup` | Login SSO/LDAP/Local + RBAC + audit log + admin bootstrap | งาน auth/permission ทุกชนิด |
| `ugt-nextjs-cicd-setup` | Jenkins 10 stages + SonarQube Gate + OWASP + Docker deploy + `/api/health` | งาน CI/CD + วินิจฉัย pipeline |
| `ugt-nextjs-clean-code` | เขียนโค้ดให้ผ่าน Quality Gate ตั้งแต่สแกนแรก | **โหลดเองอัตโนมัติ**เมื่อแตะไฟล์ `.ts`/`.tsx` |
| `ugt-nextjs-pitfalls` | กับดักจากบั๊ก production จริง — วันที่เลื่อน, cache ไม่ refresh, basePath 404 | **โหลดเองอัตโนมัติ**เมื่อแตะ `app/` `components/` `lib/` |
| `ugt-checkpoint` *(มาจาก `ugt-core`)* | บันทึก state ของทีมลง `.claude/state/` | จบงานทุกครั้ง / ส่งต่อ session |

## วิธีติดตั้ง — 3 โหมด

| โหมด | ทำอย่างไร | ได้อะไร | update ได้ไหม |
| --- | --- | --- | --- |
| **C. Marketplace (ทีมพัฒนา — แนะนำ)** | `/plugin marketplace add pakornkub/ugt-claude-platform` แล้ว `/plugin install ugt-nextjs-standard@ugt` | ครบทุกอย่าง + superpowers | ✅ `/plugin update` |
| **B. Copy plugin ลงโปรเจคที่ส่งมอบ** | copy **ทั้งสองโฟลเดอร์**: `plugins/ugt-core` และ `plugins/ugt-nextjs-platform` ไปวางใน `<โปรเจค>/.claude/skills/` (โหลดเป็น plugin อัตโนมัติเพราะมี `.claude-plugin/plugin.json` — ต้องกดยอมรับ workspace trust ครั้งแรก) | skills + hooks ครบ ไม่ต้องแตะ marketplace | ❌ copy ใหม่เอง |
| **A. Copy skill เดี่ยว** | copy `plugins/ugt-nextjs-platform/skills/<ชื่อ>` ไปวางใน `.claude/skills/` | เฉพาะ skill นั้น (ไม่มี hook) | ❌ |

โปรเจคที่ผ่าน `/ugt-nextjs-setup` แล้วจะมี `.claude/settings.json` ที่ประกาศ marketplace ไว้ —
คนที่ clone repo นั้นจะถูกชวนติดตั้ง plugin อัตโนมัติ ไม่ต้องทำอะไรเพิ่ม

## วิธีใช้

เปิด Claude Code ในโปรเจคปลายทาง แล้วพิมพ์ตามปกติ — skill trigger เองจาก description
(ผ่านการวัดแล้ว: trigger ถูก 60/60 judgment) หรือเรียกตรง ๆ:

```
/ugt-nextjs-setup
```

Claude จะตรวจโปรเจค → ถาม interview **ชุดเดียว** → ติดตั้งตามลำดับ
**Database → Quality → Auth → CI** → ติดตั้ง harness → รัน verify script ของทุก module
→ สรุปไฟล์ที่แก้ + ของที่ต้องขอ admin + smoke-test checklist

ต้องการทีละส่วนก็เรียก skill ลูกตรง ๆ ได้ (`/ugt-nextjs-database-setup` ฯลฯ)

### สิ่งที่ `/ugt-nextjs-setup` ติดตั้งลงโปรเจค (ชั้น harness)

```
CLAUDE.md                      ← บล็อกกฎองค์กรใน marker <!-- ugt:start/end --> (skill เป็นเจ้าของ)
.claude/rules/ugt-*.md         ← กฎผูก path — runtime โหลดเองเมื่อแตะไฟล์ที่เกี่ยว
.claude/state/checkpoint.md    ← ความจำของทีม (commit) — อัปเดตด้วย /ugt-checkpoint
.claude/state/project-notes.md ← Error Patterns · Deviations · Open Questions
.claude/settings.json          ← marketplace + plugin + permissions
.claude/logs/                  ← audit log จาก hooks (gitignore)
```

## ความรู้ใหม่ไปไว้ที่ไหน (คู่มือ triage — สำคัญที่สุดในไฟล์นี้)

| ความรู้ที่เจอ | ไปไว้ที่ | ห้ามทำ |
| --- | --- | --- |
| จริงเฉพาะโปรเจคนั้น (business rule, ตารางแปลก) | `.claude/state/project-notes.md` ของโปรเจค หรือ `.claude/rules/<project>-*.md` | — |
| จริงกับทุกโปรเจคบน stack นี้ (gotcha ของ Prisma/Keycloak/Jenkins) | **เปิด PR เข้ารีโปนี้** → bump version → ทีมอื่น `/plugin update` | ❌ แก้ไฟล์ skill ที่ติดตั้งมา — มันอยู่ใน plugin cache ที่ถูกลบตอน update และไม่มีใครได้ด้วย |
| ความชอบส่วนตัว | ปล่อยให้ auto memory ของ Claude จัดการ | ❌ ยัดลงไฟล์ที่ commit |

**ห้ามสร้าง `.claude/skills/ugt-<ชื่อเดิม>/` ทับ skill ของ platform** — จะได้ความรู้สองชุด
ที่ขัดกันโดยไม่มีใครรู้ว่าใช้อันไหนอยู่ ถ้าต้อง extend ให้ตั้งชื่อใหม่

## การดูแล (สำหรับทีม platform)

1. รับ PR → merge → bump `version` ใน `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json`
2. `claude plugin validate ./plugins/ugt-nextjs-platform --strict`
3. tag release: `git tag ugt-nextjs-platform--v<version>` แล้ว push
4. แจ้งทีมให้ `/plugin update` (auto-update ปิดโดย default สำหรับ marketplace ที่ไม่ใช่ของ Anthropic)

ทุก skill มี `scripts/verify.mjs` (แปลง checklist เป็นคำสั่งเดียว — ทดสอบกับโปรเจค
production จริงและ negative case แล้ว) และ `evals/evals.json` (18 เคส 118 assertion —
ผล iteration 1: with-skill 34/34 = 100% vs without-skill 18/34 = 53%)

Hard boundary ระดับองค์กร (บังคับที่ client ไม่ใช่ที่ instruction) → ส่ง
`plugins/ugt-core/contracts/org-managed-settings.md` ให้ทีม IT
