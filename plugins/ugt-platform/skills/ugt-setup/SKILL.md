---
name: ugt-setup
description: >
  Use when a user wants to prepare an existing web project (often AI-generated)
  for real deployment with org standards — "ทำให้ deploy ได้", "ยังใช้งานจริงไม่ได้",
  "ติดตั้งระบบ login/SSO", "ต่อ database", "ทำ CI/CD", or any combination — and it
  is not yet clear which pieces they need. Routes to ugt-database-setup,
  ugt-quality-setup, ugt-auth-setup, and ugt-cicd-setup in the correct order and
  installs the harness files (CLAUDE.md, .claude/rules, .claude/state).
  Don't use when the user already names exactly one area (→ invoke that skill
  directly).
---

# UGT Setup — ตัวแม่ติดตั้งระบบมาตรฐานองค์กร

## Overview

โปรเจคที่ user สร้างเองด้วย AI มักไม่มี login, database, CI — skill นี้เป็นจุดเริ่ม:
ตรวจ stack → ถามว่าจะติดตั้งอะไรบ้าง → เรียก skill ลูกตามลำดับที่ถูกต้อง → สรุป + smoke test

| Skill ลูก | ติดตั้ง |
| --- | --- |
| `ugt-database-setup` | SQL Server ผ่าน Prisma + naming convention |
| `ugt-quality-setup` | Vitest (JUnit + lcov) + ESLint + Prettier + pre-commit |
| `ugt-auth-setup` | Login: SSO (Keycloak) / AD-LDAP / Local + RBAC + admin bootstrap |
| `ugt-cicd-setup` | Jenkins + SonarQube Quality Gate + OWASP DC + Docker deploy + `/api/health` |

`ugt-clean-code` ไม่อยู่ในลำดับติดตั้ง — มันโหลดเองเมื่อมีการแก้ไฟล์ `.ts`/`.tsx`
(`paths` frontmatter) ไม่ต้องเรียกจากที่นี่

## Workflow

### 1. ตรวจโปรเจคก่อนถาม

อ่าน `package.json` และโครงไฟล์ เพื่อรู้:

- เป็น Next.js App Router จริงไหม — skill ชุดนี้ทำมาสำหรับ stack นี้เท่านั้น
  (TS/React/Next.js + Prisma/SQL Server + Keycloak + Jenkins + SonarQube)
  ถ้าไม่ใช่ ให้บอกผู้ใช้ตรง ๆ ว่าใช้ไม่ได้ **ห้ามพยายาม adapt เอง**
- มีของเดิมอยู่แล้วไหม: Prisma/ORM อื่น, ระบบ auth ใด ๆ, vitest/jest/eslint,
  Jenkinsfile/Dockerfile — **ถ้ามีของเดิม ห้ามทับเงียบ ๆ** ให้รายงานสิ่งที่เจอและถามก่อน

### 2. Interview — ถามรวบเป็นชุดเดียว

ถามทั้งหมดนี้ในข้อความเดียว (ใช้ AskUserQuestion ถ้ามี):

**เลือก module:**

1. ติดตั้งอะไรบ้าง? Database / Quality (test+lint) / Auth / CI (เลือกได้หลายอัน — default: ทั้งสี่)
2. [ถ้าเลือก Auth] เปิดวิธี login ไหนบ้าง? SSO / LDAP / Local (default: SSO อย่างเดียว)

**Identity กลาง (ใช้ร่วมทุก module — ถามครั้งเดียว อย่าให้ skill ลูกถามซ้ำ):**

3. ชื่อโปรเจค kebab-case (เช่น `expense-portal`) + ชื่อแสดงผล
4. Deploy ใต้ basePath / shared domain ไหม? ถ้าใช่ → basePath prod/dev (เช่น `/expense-portal`, `/expense-portal-dev`)
5. Host ports prod / dev (เช่น 3000 / 3001)
6. URL เต็มของแอป prod / dev รวม basePath (เช่น `https://apps.example.com/expense-portal`)

**คำถามเฉพาะ module ที่เลือก** — **เปิดหัวข้อ Interview ใน SKILL.md ของ skill ลูกทุกตัวที่เลือก
แล้วรวบคำถามของมันมาถามในชุดเดียวกันนี้** (ตัวอย่างหัวข้อ ไม่ใช่รายการครบ: DB: server,
ชื่อ DB, มีอยู่แล้วหรือสร้างใหม่, ต้องใช้ SP ไหม · Auth: Keycloak client มีหรือยัง,
รายละเอียด AD, first admin · CI: มี Sentry?, deploy target)

### 3. ติดตั้งตามลำดับ (ห้ามสลับ)

```
Database → Quality → Auth → CI
```

- **Auth ต้องมาหลัง Database** — Better Auth เก็บ user/session/account ใน Prisma
- **Quality มาก่อน CI** — pipeline เรียก `lint`/`format:check`/`test:coverage` ตามชื่อตรง ๆ
  ถ้ายังไม่มี script พวกนี้ pipeline จะแดงที่ stage ที่ 3 ทันทีตั้งแต่ push แรก
- **CI มาท้ายสุด** — pipeline ต้องรู้ว่ามี DB ไหม (migrate stage) และต้อง build ผ่านก่อน
- Module ที่ไม่ได้เลือกก็ข้ามไป แต่ลำดับของที่เหลือคงเดิม
- แต่ละ module: invoke skill ลูก (`ugt-database-setup` / `ugt-quality-setup` /
  `ugt-auth-setup` / `ugt-cicd-setup`) แล้วทำตาม SKILL.md ของตัวนั้น —
  ส่งคำตอบ interview ที่ถามไว้แล้วลงไป อย่าถามผู้ใช้ซ้ำ

### 4. ติดตั้งชั้น harness (ทำเสมอ ไม่ว่าจะเลือก module ไหน)

module ข้างบนติดตั้ง**โค้ด** แต่ความรู้จะหายไปพร้อม session ที่ติดตั้ง — ขั้นนี้ทำให้มันอยู่ต่อ
ทุกไฟล์ในนี้ **skill เป็นเจ้าของและเขียนทับได้ตอน `/plugin update`** ยกเว้นที่ระบุว่าไม่ทับ

| Asset | ปลายทาง | ทับได้ไหม |
| --- | --- | --- |
| `assets/CLAUDE-block.md` | แทรกใน `CLAUDE.md` ที่ root | **ทับได้เฉพาะในบล็อก `<!-- ugt:start -->` … `<!-- ugt:end -->`** |
| `assets/rules-ugt-database.md` | `.claude/rules/ugt-database.md` | ทับได้ทั้งไฟล์ |
| `assets/rules-ugt-auth.md` | `.claude/rules/ugt-auth.md` | ทับได้ทั้งไฟล์ |
| `assets/rules-ugt-ci.md` | `.claude/rules/ugt-ci.md` | ทับได้ทั้งไฟล์ |
| `assets/settings.json` | merge เข้า `.claude/settings.json` | merge เฉพาะ key ของเรา |
| `assets/state-checkpoint.md` | `.claude/state/checkpoint.md` | **สร้างครั้งเดียว ห้ามทับ** |
| `assets/state-project-notes.md` | `.claude/state/project-notes.md` | **สร้างครั้งเดียว ห้ามทับ** |

วิธีทำ:

1. **`CLAUDE.md`** — ไม่มีไฟล์ → สร้างใหม่จาก block · มีอยู่แล้ว → หา marker
   `<!-- ugt:start -->`: เจอ → แทนที่เฉพาะช่วงระหว่าง marker · ไม่เจอ → **แทรกต่อท้าย**
   ห้ามแตะเนื้อหาเดิมของโปรเจคแม้แต่บรรทัดเดียว · แทนค่า `<project-name>` / `<base-path-prod>` /
   `<base-path-dev>` จากคำตอบ interview
   > **ตรวจขนาด**: ถ้ารวมแล้วเกิน ~200 บรรทัด ให้ย้ายเนื้อหาของโปรเจคที่เป็นกฎผูกกับ path
   > ไปเป็น `.claude/rules/<project>-*.md` แทนที่จะปล่อยให้ CLAUDE.md บวม (ยิ่งยาวยิ่งไม่ถูกทำตาม)
2. **`.claude/rules/`** — copy เฉพาะไฟล์ของ module ที่ติดตั้งจริง (ไม่ติดตั้ง auth ก็ไม่ต้องมี
   `ugt-auth.md`) ไฟล์เหล่านี้มี `paths` frontmatter จึงโหลดเองเมื่อ Claude แตะไฟล์ที่ match —
   ไม่ต้องเขียนใน CLAUDE.md ว่า "ถ้าแก้ไฟล์ X ให้อ่าน Y"
3. **`.claude/settings.json`** — merge key `extraKnownMarketplaces`, `enabledPlugins`,
   `permissions` · แทน `<org>` ด้วย GitHub org จริง · ถ้าไฟล์มีอยู่แล้วให้ merge ไม่เขียนทับ
4. **`.claude/state/`** — สร้างจาก skeleton **ถ้ายังไม่มี** · ถ้ามีอยู่แล้วห้ามแตะ
   (มันคือความจำของทีม) · เติมวันที่และ module ที่ติดตั้งลงใน `checkpoint.md`
5. **`.gitignore`** — เพิ่ม `.claude/logs/` (audit log ไม่ต้อง commit) แต่ **`.claude/state/`
   ต้อง commit** อย่าเผลอ ignore ทั้ง `.claude/`
6. ถ้าองค์กรยังไม่มี hard boundary ระดับเครื่อง → ชี้ให้ผู้ใช้ส่ง
   `references/org-managed-settings.md` ให้ทีม IT (skill ติดตั้งส่วนนั้นแทนไม่ได้)

### 5. ปิดงาน

1. **รัน `node <skill-dir>/scripts/verify.mjs` ของทุก module ที่ติดตั้ง** (cwd = root
   ของโปรเจค) **รวมทั้ง `scripts/verify.mjs` ของ `ugt-setup` เองที่ตรวจชั้น harness**
   แล้วแก้ทุกข้อที่ ✘ ก่อนปิดงาน — ห้ามรายงานว่าเสร็จโดยยังมี exit code 1 ค้าง
   จากนั้นไล่ข้อที่เหลือใน Verification Checklist ของแต่ละ skill ที่เครื่องตรวจแทนไม่ได้
2. สรุปให้ผู้ใช้: ไฟล์ที่เพิ่ม/แก้ทั้งหมด (จัดกลุ่มตาม module), env vars ที่ต้องเติมค่าจริง,
   สิ่งที่ต้องขอจาก admin (Keycloak client, Jenkins credentials, SonarQube project)
3. แนบ **smoke-test checklist** ที่ตรงกับสิ่งที่ติดตั้งจริง เช่น:
   - [ ] `npm run build` ผ่าน
   - [ ] login ด้วยทุก method ที่เปิด → เข้าหน้า protected ได้ → logout แล้ว cookie หาย
   - [ ] `/admin/setup` กดครั้งเดียวได้ Administrator
   - [ ] push `develop` → pipeline เขียวครบ stage

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| ตรวจของเดิมในโปรเจคก่อนถาม | ทับ Prisma/auth/Jenkinsfile เดิมโดยไม่บอก |
| ถาม interview รวบชุดเดียว (รวมคำถามของ skill ลูก) | ถามทีละข้อ / ให้ skill ลูกถามซ้ำ |
| ลำดับ Database → Quality → Auth → CI เสมอ | ติดตั้ง auth ก่อนมี DB / ทำ CI ก่อนมี test script |
| ไม่ใช่ Next.js → บอกตรง ๆ ว่าใช้ไม่ได้ | ดัดแปลง asset ไปใช้กับ stack อื่นเอง |
| สรุปไฟล์ที่แก้ + ของที่ต้องขอ admin ตอนจบ | จบงานเงียบ ๆ โดยไม่มี checklist |
| แก้ `CLAUDE.md` เฉพาะในบล็อก `ugt:start/end` | เขียนทับ `CLAUDE.md` ทั้งไฟล์ (เนื้อหาของทีมหาย) |
| `.claude/state/` มีแล้วห้ามแตะ | reset state ของทีมเพราะเห็นว่าเป็น skeleton |
| ติดตั้ง harness ทุกครั้ง (ขั้นที่ 4) | ติดตั้งแค่โค้ดแล้วจบ — ความรู้หายไปกับ session |
