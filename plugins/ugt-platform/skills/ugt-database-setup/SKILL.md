---
name: ugt-database-setup
description: >
  Use when adding SQL Server (MSSQL) to a project via Prisma, wiring a
  DATABASE_URL connection, applying the org's DB naming conventions
  (tables/columns/stored procedures/functions), setting up type-safe env
  validation, writing raw SQL / stored-procedure calls against MSSQL, or
  fixing MSSQL migration issues (column renames, filtered unique indexes).
  Don't use for auth tables content (→ ugt-auth-setup) or CI (→ ugt-cicd-setup).
---

# UGT Database Setup — SQL Server ผ่าน Prisma

## Overview

Skill นี้ติดตั้ง SQL Server ให้โปรเจคที่ยังไม่มี DB (มักเป็นโปรเจค AI-generated)
ตามมาตรฐานองค์กร: การต่อ connection ผ่าน `@prisma/adapter-mssql`, naming
convention ของตาราง/คอลัมน์/SP/function, env validation ด้วย t3-env และ pattern
raw SQL ที่ปลอดภัย รายละเอียดเชิงลึกอยู่ใน `references/` — โค้ดตั้งต้นอยู่ใน `assets/`

## Org Standards

มาตรฐานระดับ database ที่ทุกโปรเจคต้องเหมือนกัน:

| สิ่งที่ตั้งชื่อ                  | Convention                          | ตัวอย่าง                                |
| -------------------------------- | ----------------------------------- | --------------------------------------- |
| ตาราง (app-owned)                | **PascalCase พหูพจน์** ไม่มี prefix | `Users`, `RolePermissions`, `Items`     |
| ตาราง read-only (ระบบภายนอก dump) | prefix เฉพาะกลุ่ม `<EXT>_`          | `<EXT>_WeeklySummary`                   |
| คอลัมน์                          | **PascalCase**                      | `Id`, `CreatedAt`, `EmpCode`            |
| Stored procedure                 | `usp_*` (PascalCase ต่อท้าย)        | `usp_RecalculateWeeklySummary`          |
| Function (scalar/TVF)            | `fn*`                               | `fnGetScheduleActual`                   |
| View                             | `vw*`                               | `vwEmployee`                            |
| Reserved word ของ T-SQL          | **ห้ามใช้เป็นชื่อคอลัมน์** — เติมคำขยาย | `key`→`SettingKey`, `group`→`GroupName` |

**Audit columns มาตรฐาน** — ตาราง master/transaction ที่ app เป็นเจ้าของต้องมี:
`Id`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsActive`, `IsDeleted`
(soft delete — ไม่ hard delete ข้อมูลที่ต้องเก็บประวัติ)

**กฎ read-only**: ตารางที่ prefix `<EXT>_` และ view/ตารางบน linked server เป็น
SELECT-only เสมอ — ห้าม INSERT/UPDATE/DELETE จาก app; ถ้าต้องแก้ค่า ให้สร้าง
ตาราง override ฝั่ง app แล้ว overlay ตอนอ่าน

รายละเอียดเต็ม (ตาราง reserved words, เหตุผลแต่ละข้อ) → `references/naming-conventions.md`

## Interview — ถามผู้ใช้ก่อนลงมือ (ถามเป็นชุดเดียว)

1. **ชื่อ database** และมีอยู่แล้วหรือสร้างใหม่? (มีอยู่แล้ว → introspect/`migrate resolve`; ใหม่ → `migrate dev` ตั้งแต่ต้น)
2. **Server/instance + port** ที่จะต่อ (dev กับ prod แยกกันไหม)
3. ต้องเรียก **stored procedure** หรือ **linked server** ไหม? (มีผลกับ `requestTimeout` และ pattern raw SQL)

## Setup Steps

### 1. ติดตั้ง dependencies

```bash
npm install @prisma/client @prisma/adapter-mssql @t3-oss/env-nextjs zod
npm install --save-dev prisma tsx dotenv
```

### 2. Copy assets แล้วแทนที่ placeholders

| Template                            | ปลายทาง                 |
| ----------------------------------- | ----------------------- |
| `assets/prisma.config.ts`        | `prisma.config.ts`      |
| `assets/schema-skeleton.prisma`  | `prisma/schema.prisma`  |
| `assets/lib-prisma.ts`           | `lib/prisma.ts`         |
| `assets/lib-env.ts`              | `lib/env.ts`            |
| `assets/env.example`             | `.env.example` (+ copy เป็น `.env.local` แล้วเติมค่าจริง) |

**แยกไฟล์ env ให้ชัด**: `.env.example` = placeholder ทั่วไปเท่านั้น (commit ได้) ·
`.env.local` = ค่าจริง (ห้าม commit) — ค่าตามตาราง placeholder ด้านล่างเติมลงใน
`.env.local` เท่านั้น

**Placeholders ที่ต้องแทนที่ทั้งหมด:**

| Placeholder       | ความหมาย                                             |
| ----------------- | ---------------------------------------------------- |
| `<db-host>`       | hostname/IP ของ SQL Server                           |
| `<db-port>`       | port (ปกติ `1433`)                                   |
| `<db-name>`       | ชื่อ database                                        |
| `<db-user>`       | SQL login                                            |
| `<db-password>`   | รหัสผ่าน (เฉพาะ `.env.local` — ห้าม commit)          |
| `<project-name>`  | ชื่อโปรเจค (ใช้ในคอมเมนต์/ชื่อ app)                  |
| `<EXT>`           | prefix ตาราง read-only ที่ระบบภายนอก populate (ถ้ามี) |
| `<linked-server>` | ชื่อ linked server (เฉพาะโปรเจคที่อ่านข้าม server)    |

> ถ้าโปรเจค**ไม่มี**ตาราง read-only ภายนอก / linked server → **ลบบรรทัดคอมเมนต์ที่เกี่ยวข้อง**
> ออกจากไฟล์ที่ copy มา (เช่นคอมเมนต์ `<EXT>_` ในหัวไฟล์ `schema.prisma`) — อย่าปล่อย
> placeholder `<EXT>` / `<linked-server>` ค้างไว้

### 3. กฎสำคัญ (ผิดแล้วพังตอน generate/build)

- **`url` อยู่ใน `prisma.config.ts` ที่เดียว** — ห้ามใส่ `url` ใน `datasource` ของ `schema.prisma` (Prisma 7 + driver adapter จะ fail)
- generator ต้องเป็น **`provider = "prisma-client-js"`** — ไม่ใช่ `"prisma-client"` (ตัวหลังไม่มี MSSQL driver adapter)
- **`import type sql from 'mssql'`** เท่านั้น — value import ทำ TypeScript พัง (ต้องการแค่ type ของ `sql.config`)
- ห้ามแตะ `process.env` ตรง ๆ ใน app code — import จาก `@/lib/env` เสมอ (ยกเว้น `prisma.config.ts` ซึ่งรันนอก app)
- **รัน `npx prisma generate` หลัง `prisma migrate dev` ทุกครั้ง** และหลังแก้ schema ทุกครั้ง

### 4. สร้าง schema + migrate

1. เขียน model ตาม convention ในไฟล์ skeleton (model camelCase → `@@map("PascalCasePlural")`, field camelCase → `@map("PascalCase")`, audit columns ครบ)
2. `npx prisma migrate dev --name init`
3. `npx prisma generate`
4. เช็ค reserved words ก่อน migrate ทุกครั้ง → `references/naming-conventions.md`

งาน migration ขั้นสูง (rename คอลัมน์ด้วย `sp_rename` แบบไม่เสียข้อมูล,
filtered unique index ที่ Prisma express ไม่ได้, flow deploy) →
`references/migrations.md`

### 5. Raw SQL / Stored procedures (ถ้าโปรเจคต้องใช้)

Pattern บังคับ: **sanitize ก่อน parameterize เสมอ**, เรียก SP ด้วย
`$executeRaw\`EXEC usp_Name ${p1}, ${p2}\``, linked server = SELECT-only →
`references/raw-sql-and-sp.md`

## Quick Rules

| DO ✅                                                | DON'T ❌                                             |
| ---------------------------------------------------- | ---------------------------------------------------- |
| `url` ใน `prisma.config.ts` เท่านั้น                 | `url` ใน `schema.prisma` datasource                  |
| `provider = "prisma-client-js"`                      | `provider = "prisma-client"`                         |
| `import type sql from 'mssql'`                       | `import sql from 'mssql'` (value import)             |
| `import { env } from '@/lib/env'`                    | `process.env.*` ตรง ๆ ใน app code                    |
| `@@map("PascalCasePlural")` ทุก model                | ปล่อยชื่อตารางเป็น camelCase ตาม model               |
| `@map("PascalCase")` ทุก field                       | คอลัมน์ camelCase / ใช้ reserved word (`key`, `group`) |
| sanitize regex ก่อน interpolate ใน `$queryRaw`       | ต่อ string SQL เอง / ข้าม sanitize                   |
| `$executeRaw\`EXEC usp_X ${a}, ${b}\`` (parameterized) | `$executeRawUnsafe` กับ input ผู้ใช้                |
| soft delete (`IsDeleted = 1`)                        | hard delete ข้อมูลที่ต้องเก็บประวัติ                 |
| `npx prisma generate` หลัง migrate ทุกครั้ง          | ปล่อย generated client ค้าง stale                    |

## Verification Checklist

- [ ] `npx prisma validate` ผ่าน
- [ ] `npx prisma generate` ผ่าน (และรันซ้ำหลัง migrate ทุกครั้ง)
- [ ] `schema.prisma` ไม่มี `url` ใน datasource; `prisma.config.ts` มี
- [ ] ไม่มีการเรียก `process.env` ตรง ๆ นอก `lib/env.ts` / `prisma.config.ts`
- [ ] ทุก model มี `@@map("PascalCasePlural")` และทุก field มี `@map("PascalCase")` — ยกเว้นตาราง Better Auth core จาก ugt-auth-setup (`User`, `Session`, …) ที่ map เอกพจน์ตาม convention ของ library นั้น
- [ ] ไม่มีคอลัมน์ชื่อชน T-SQL reserved word (เช็คกับ `references/naming-conventions.md`)
- [ ] ตาราง master/transaction มี audit columns ครบ (`Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/IsActive/IsDeleted`)
- [ ] raw SQL ทุกจุด: sanitize + parameterize; ไม่มี mutation ลงตาราง/วิว read-only
- [ ] `.env.local` ไม่ถูก commit; `.env.example` มี placeholder ครบ
- [ ] Build ผ่านโดยไม่มี DB จริง (`SKIP_ENV_VALIDATION=1` + build-guard ใน `lib/prisma.ts`)
