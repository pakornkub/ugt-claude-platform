# UGT Claude Platform

**Plugin marketplace ขององค์กร** สำหรับ Claude Code — เปลี่ยนโปรเจค Next.js ที่มีอยู่
(รวมถึงโปรเจคที่ user สร้างเองด้วย AI) ให้ deploy ได้จริงตามมาตรฐานองค์กร
พร้อมชั้น harness ที่ทำให้มาตรฐานคงอยู่ข้าม session — สกัด pattern มาจากโปรเจคจริง
ที่ผ่านการใช้งาน production แล้ว

**Stack ที่รองรับ**: TypeScript / React / Next.js (App Router) · Prisma → SQL Server ·
Keycloak (SSO) · Jenkins + SonarQube + Docker — **เท่านั้น** โปรเจค stack อื่นใช้ไม่ได้

## มีอะไรใน marketplace

| Plugin | เวอร์ชันล่าสุด | คืออะไร |
| --- | --- | --- |
| `ugt-core` | 1.0.0 | ฐานกลางทุก stack — `ugt-checkpoint`, audit hooks, `contracts/` (มาตรฐานต้นทางให้ทุก stack อ้าง) — **ไม่ต้องติดตั้งเอง** ไหลมากับ platform อัตโนมัติ |
| `ugt-nextjs-platform` | 2.1.1 | skills 7 ตัวของ stack Next.js + harness assets (depend บน `ugt-core`) |
| `ugt-nextjs-standard` | 1.2.0 | bundle แนะนำ — ติดตั้งตัวเดียวได้ `ugt-nextjs-platform` + `superpowers` (pipeline การพัฒนา: brainstorming → plan → TDD → review) + `skill-creator` (สร้าง skill ของโปรเจคตามมาตรฐานเดียวกัน) |

เวอร์ชันจริงล่าสุดดูจาก git tags (`<plugin>--v<version>`) · รายละเอียดต่อรุ่นอยู่ใน
`CHANGELOG.md` ของแต่ละ plugin

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
| **C. Marketplace (ทีมพัฒนา — แนะนำ)** | `/plugin marketplace add pakornkub/ugt-claude-platform` แล้ว `/plugin install ugt-nextjs-standard@ugt` แล้ว `/reload-plugins` | ครบทุกอย่าง (core+platform+superpowers+skill-creator ไหลมาอัตโนมัติ) | ✅ ดูหัวข้อ "การอัปเดต" |
| **B. Copy plugin ลงโปรเจคที่ส่งมอบ** | copy **ทั้งสองโฟลเดอร์**: `plugins/ugt-core` และ `plugins/ugt-nextjs-platform` ไปวางใน `<โปรเจค>/.claude/skills/` (โหลดเป็น plugin อัตโนมัติเพราะมี `.claude-plugin/plugin.json` — ต้องกดยอมรับ workspace trust ครั้งแรก) | skills + hooks ครบ ไม่ต้องแตะ marketplace | ❌ copy ใหม่เอง |
| **A. Copy skill เดี่ยว** | copy `plugins/ugt-nextjs-platform/skills/<ชื่อ>` ไปวางใน `.claude/skills/` | เฉพาะ skill นั้น (ไม่มี hook) | ❌ |

> **รีโปนี้เป็น private** — โหมด C ต้องมีสิทธิ์อ่านรีโป + login GitHub ไว้ในเครื่อง
> (`gh auth login`) · ถ้าใช้ HTTPS ตั้ง `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` ·
> แนะนำตั้ง `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE=1` กัน plugin หาย
> ชั่วคราวตอน background pull ไม่ผ่าน

โปรเจคที่ผ่าน `/ugt-nextjs-setup` แล้วจะมี `.claude/settings.json` ที่ประกาศ marketplace ไว้ —
คนที่ clone repo นั้นจะถูกชวนติดตั้ง plugin อัตโนมัติ ไม่ต้องทำอะไรเพิ่ม

## ขั้นตอนติดตั้ง (ทำครั้งเดียวต่อเครื่อง)

1. มีสิทธิ์อ่านรีโปนี้ + login GitHub ในเครื่อง: `gh auth login`
2. เปิด Claude Code ในโปรเจคไหนก็ได้ แล้วรันทีละบรรทัด:

   ```
   /plugin marketplace add pakornkub/ugt-claude-platform
   /plugin install ugt-nextjs-standard@ugt
   /reload-plugins
   ```

   (ตอน install เลือก scope **project** ถ้าอยากให้คนที่ clone โปรเจคนั้นได้ตามด้วย ·
   เลือก **user** ถ้าอยากใช้เองทุกโปรเจคบนเครื่อง)
3. เช็คว่าติดแล้ว: พิมพ์ `/ugt` ต้องเห็น autocomplete รายการ skill · `/plugin`
   ต้องเห็น core + platform + standard ไม่มี error

## ตัวอย่างการใช้งาน — 2 use case หลัก

### Use case 1: มีโปรเจค Next.js อยู่แล้ว มาเติมมาตรฐาน (retrofit)

สถานการณ์: โปรเจคที่ทำกับ AI จนรันในเครื่องได้ แต่ยังไม่มี login / database จริง / CI —
จะส่งให้ทีมใช้จริงแล้ว

1. เปิด Claude Code ที่โปรเจคนั้น แล้วพิมพ์ประโยคเดียว:

   ```
   ทำให้โปรเจคนี้ deploy ได้ตามมาตรฐานบริษัทหน่อย
   ```

   (skill trigger เองจากประโยคกว้าง ๆ แบบนี้ — วัดแล้ว 60/60 · หรือเรียกตรง `/ugt-nextjs-setup`)
2. Claude **ตรวจของเดิมก่อนเสมอ** — ถ้ามี Prisma/jest/Jenkinsfile อยู่แล้วจะรายงานสิ่งที่เจอ
   และถามก่อน ไม่ทับเงียบ ๆ
3. ตอบ **interview ชุดเดียว** เช่น: ติดตั้งครบทั้งสี่ module · login = SSO + LDAP ·
   ชื่อโปรเจค `expense-portal` · basePath `/expense-portal` · ports 3000/3001 ·
   DB server + ชื่อ database · มี Sentry ไหม
4. รอ Claude ไล่ติดตั้ง **Database → Quality → Auth → CI → harness** แล้วรัน verify script
   ของทุก module จนเขียว
5. ทำตามสรุปปิดงาน: เติมค่าจริงใน `.env.local` · เอารายการไปขอ admin
   (Keycloak client + redirect URI, Jenkins credentials, SonarQube projects) ·
   push `develop` แล้วดู pipeline วิ่งครบ 10 stages
6. Smoke test ตาม checklist ที่ได้: `npm run build` ผ่าน · login ทุก method ·
   `/admin/setup` กดครั้งเดียวได้ Administrator

### Use case 2: โปรเจคเพิ่งสร้าง มีแค่โฟลเดอร์ requirement

สถานการณ์: โฟลเดอร์ว่าง ๆ ที่มีแต่ `docs/` (requirement, mockup, business rules) —
ยังไม่มีโค้ดสักบรรทัด

1. **อ่าน requirement ก่อน อย่าเพิ่งสร้างอะไร**:

   ```
   อ่านเอกสารทั้งหมดใน docs/ แล้วสรุป: ระบบทำอะไร มี module/ผู้ใช้กี่แบบ
   ต้องมีตารางอะไรบ้าง และอะไรที่เอกสารยังไม่บอกแต่จำเป็นต่อการสร้าง
   ```

   คำถามข้อท้ายสำคัญสุด — ได้รายการไปถาม stakeholder ก่อนเขียนโค้ดผิดทิศ
2. **Scaffold Next.js เปล่า**:

   ```
   สร้างโปรเจค Next.js ใหม่ในโฟลเดอร์นี้: TypeScript, App Router, Tailwind
   ```
3. **ติดตั้งมาตรฐานก่อนเขียน feature แรก** — `/ugt-nextjs-setup` (ตอบ interview โดยใช้
   ข้อมูลจากข้อ 1 เช่นเปิด login method ตามประเภทผู้ใช้ใน requirement) —
   เหตุที่ต้องมาก่อน feature: Quality Gate วัดโค้ดใหม่ตั้งแต่บรรทัดแรก และตาราง domain
   ที่กำลังจะออกแบบจะถูกกฎ naming/audit columns คุมตั้งแต่ต้น
4. **วนสร้าง feature จาก docs**:

   ```
   สร้างหน้า <feature แรกตามความสำคัญ> ตาม requirement ใน docs/<ไฟล์>
   ```

   superpowers รับช่วง (brainstorming → plan → TDD) โดยมี harness ประกบอัตโนมัติ
   ตามตาราง "งานประจำวัน" ข้างล่าง
5. จบ session: `/ugt-checkpoint` แล้ว commit — คนต่อไป (หรือตัวเองพรุ่งนี้) เปิดมาอ่านต่อได้ทันที

### งานพัฒนาประจำวัน (harness ทำงานเอง ไม่ต้องเรียกอะไร)

| เหตุการณ์ | สิ่งที่เกิดเอง |
| --- | --- |
| สร้าง feature / แก้บั๊ก | pipeline ของ superpowers รับไป (brainstorming → plan → TDD → review) |
| แตะไฟล์ `.ts`/`.tsx` | `ugt-nextjs-clean-code` + `ugt-nextjs-pitfalls` โหลดเอง |
| แตะ `prisma/` / ไฟล์ auth / Jenkinsfile | rules ที่เกี่ยวโหลดเองจาก `.claude/rules/` |
| จบงานทุกครั้ง | เรียก `/ugt-checkpoint` แล้ว commit |
| โปรเจคอยู่บน Next.js 16.3+ | `next dev` เติมบล็อก `nextjs-agent-rules` + `AGENTS.md` เอง — **ปล่อยไว้และ commit ไปด้วย** (อยู่ร่วมกับบล็อก ugt ได้โดยออกแบบ) |

ต้องการติดตั้งทีละส่วนก็เรียก skill ลูกตรง ๆ ได้ (`/ugt-nextjs-database-setup` ฯลฯ)

### สิ่งที่ `/ugt-nextjs-setup` ติดตั้งลงโปรเจค (ชั้น harness)

```
CLAUDE.md                      ← บล็อกกฎองค์กรใน marker <!-- ugt:start/end --> (skill เป็นเจ้าของ)
.claude/rules/ugt-nextjs-*.md  ← กฎผูก path — runtime โหลดเองเมื่อแตะไฟล์ที่เกี่ยว
.claude/state/checkpoint.md    ← ความจำของทีม (commit) — อัปเดตด้วย /ugt-checkpoint
.claude/state/project-notes.md ← Error Patterns · Deviations · Open Questions
.claude/settings.json          ← marketplace + plugin + permissions
.claude/logs/                  ← audit log จาก hooks (gitignore)
```

## การอัปเดต (สำหรับทีม — โหมด C)

auto-update **ปิดโดย default** สำหรับ marketplace ที่ไม่ใช่ของ Anthropic — เมื่อมีประกาศรุ่นใหม่
ให้รันในโปรเจคไหนก็ได้:

```
/plugin marketplace update ugt
/plugin update ugt-nextjs-standard
/reload-plugins
```

- dependency ทั้งสาย (core / platform / superpowers / skill-creator) ตามมาเอง
- อัปเดตแล้ว **ไม่ต้องแก้อะไรในโปรเจค** — ไฟล์ harness ที่ติดตั้งไว้ใช้ต่อได้เสมอ
  (ถ้ารุ่นใหม่เปลี่ยน rules/CLAUDE-block จะมีบอกใน CHANGELOG ว่าให้รัน `/ugt-nextjs-setup`
  ซ้ำเพื่อ refresh บล็อกของ skill — เนื้อหาของทีมไม่ถูกแตะ)
- อยากรู้ว่ารุ่นที่ใช้อยู่คืออะไร: `/plugin` แล้วดูเวอร์ชันในรายการ

## ความรู้ใหม่ไปไว้ที่ไหน (คู่มือ triage — สำคัญที่สุดในไฟล์นี้)

| ความรู้ที่เจอ | ไปไว้ที่ | ห้ามทำ |
| --- | --- | --- |
| จริงเฉพาะโปรเจคนั้น (business rule, ตารางแปลก) | `.claude/state/project-notes.md` ของโปรเจค หรือ `.claude/rules/<project>-*.md` | — |
| จริงกับทุกโปรเจคบน stack นี้ (gotcha ของ Prisma/Keycloak/Jenkins) | **เปิด PR เข้ารีโปนี้** → bump version → ทีมอื่นอัปเดตตามหัวข้อข้างบน | ❌ แก้ไฟล์ skill ที่ติดตั้งมา — มันอยู่ใน plugin cache ที่ถูกลบตอน update และไม่มีใครได้ด้วย |
| ความชอบส่วนตัว | ปล่อยให้ auto memory ของ Claude จัดการ | ❌ ยัดลงไฟล์ที่ commit |

**ห้ามสร้าง `.claude/skills/ugt-<ชื่อเดิม>/` ทับ skill ของ platform** — จะได้ความรู้สองชุด
ที่ขัดกันโดยไม่มีใครรู้ว่าใช้อันไหนอยู่ ถ้าต้อง extend ให้ตั้งชื่อใหม่ (สร้างด้วย
`skill-creator` ที่มากับ bundle ได้เลย)

## การออกรุ่น (สำหรับทีม platform)

1. รับ PR → merge เข้า `main`
2. bump `version` ใน `.claude-plugin/plugin.json` ของ **plugin ที่เปลี่ยน**
   (`ugt-core` / `ugt-nextjs-platform` / `ugt-nextjs-standard` — เส้นเวอร์ชันแยกกัน)
   + เพิ่มหัวข้อใน `CHANGELOG.md` ของตัวนั้น
3. `claude plugin validate ./plugins/<ชื่อ> --strict` (และ validate `.` สำหรับ marketplace)
4. tag ตามแบบ `<plugin>--v<version>` แล้ว push main พร้อม tag —
   **ถ้ารุ่นนั้นเพิ่ม dependency ใหม่ ให้ push tag ของ dependency ก่อนตัวที่ depend**
5. ประกาศให้ทีมรันคำสั่งอัปเดต (หัวข้อ "การอัปเดต")

กติกาเนื้อหา: ทุก skill ต้อง self-contained (ห้ามอ้างไฟล์ข้าม plugin/skill,
verify script ยึด `process.cwd()`), เนื้อหาที่โหลดเข้า context เป็นภาษาอังกฤษ
(เว้น trigger phrase), และมาตรฐานกลางแก้ที่ `plugins/ugt-core/contracts/` ก่อนเสมอ
แล้วค่อยตามไปแก้ใน skill ของ stack

## หลักฐานคุณภาพ

ทุก skill มี `scripts/verify.mjs` (แปลง checklist เป็นคำสั่งเดียว — ทดสอบกับโปรเจค
production จริงและ negative case แล้ว และเคยจับบั๊กจริงในโปรเจคต้นทางได้หลายรอบ)
และ `evals/` — ผลวัดที่ผ่านมา: setup/auth/cicd eval **with-skill 34/34 (100%)
vs without-skill 18/34 (53%)** · pitfalls **9/9 vs 6/9** · trigger boundary
**60/60** (วัดซ้ำหลัง rename และของ pitfalls/clean-code แยกชุด)

Hard boundary ระดับองค์กร (บังคับที่ client ไม่ใช่ที่ instruction) → ส่ง
`plugins/ugt-core/contracts/org-managed-settings.md` ให้ทีม IT ·
ข้อเสนอรองรับ stack อื่น (Python ฯลฯ) → `docs/multi-stack-proposal.md`
