---
paths:
  - "prisma/**"
  - "prisma.config.ts"
  - "lib/prisma.ts"
  - "lib/env.ts"
  - "lib/actions/**"
---

<!-- ไฟล์นี้ ugt-database-setup เป็นเจ้าของ — เขียนทับได้ทั้งไฟล์ตอน /plugin update
     กฎเฉพาะของโปรเจคให้แยกไปไฟล์ .claude/rules/<project>-*.md อย่าเติมที่นี่ -->

# กฎ Database (โหลดเมื่อแตะ schema / prisma / env / server action)

## Connection

- `url` อยู่ใน `prisma.config.ts` **ที่เดียว** — ใส่ใน `datasource` ของ `schema.prisma` แล้ว
  Prisma 7 + driver adapter จะ fail ทันที
- generator ต้องเป็น `provider = "prisma-client-js"` — `"prisma-client"` ไม่มี MSSQL driver adapter
- `import type sql from 'mssql'` เท่านั้น (value import ทำ TypeScript พัง — ต้องการแค่ type ของ `sql.config`)
- `requestTimeout` ตั้งที่ adapter config ที่เดียวทั้ง app ไม่ตั้งรายจุด

## Naming (ตรวจได้ด้วย `verify.mjs` ของ ugt-database-setup)

| สิ่งที่ตั้งชื่อ | รูปแบบ |
| --- | --- |
| ตาราง app-owned | PascalCase **พหูพจน์** — `@@map("Items")` |
| คอลัมน์ | PascalCase — `@map("CreatedAt")` |
| Stored procedure | `usp_PascalCase` (ห้าม `sp_` — ชนกับ system procedure ของ SQL Server) |
| Function / View | `fn*` / `vw*` |

**ข้อยกเว้นเดียว**: ตาราง auth/RBAC ที่ `ugt-auth-setup` ติดตั้ง map เป็น **เอกพจน์** ทั้งชุด
(`User`, `Session`, `Account`, `Verification`, `RateLimit`, `Role`, `Permission`, `RolePermission`)
ยกเว้น `ActivityLogs` ที่เป็นพหูพจน์ — อย่า "แก้ให้ถูก"

**ห้ามใช้คำสงวน T-SQL เป็นชื่อคอลัมน์** — `key`→`SettingKey`, `value`→`SettingValue`,
`group`→`GroupName`, `count`→`ItemCount`, `order`→`SortOrder` (เติมคำขยาย ไม่ใช่ใส่ `[bracket]` หนี)

## Audit columns

ตาราง master/transaction ที่ app เป็นเจ้าของต้องมีครบ:
`Id`, `CreatedAt`, `UpdatedAt`, `CreatedBy`, `UpdatedBy`, `IsActive`, `IsDeleted`

- ลบข้อมูลที่ต้องเก็บประวัติด้วย **`IsDeleted = 1`** ไม่ hard delete
- ตาราง lookup/join ยกเว้นได้ แต่ต้องบันทึกไว้ใน `.claude/state/project-notes.md` → Deviations

## Migration

1. แก้ `schema.prisma`
2. `npx prisma migrate dev --name <ชื่อที่บอกว่าทำอะไร>`
3. **`npx prisma generate`** ← ลืมข้อนี้แล้ว type จะเป็นของเก่าและ build พังแบบหาสาเหตุยาก

rename คอลัมน์ต้องใช้ `sp_rename` ใน migration ที่เขียนเอง — ปล่อยให้ Prisma สร้าง
drop+add จะเสียข้อมูลทั้งคอลัมน์

## Raw SQL

- **sanitize ด้วย regex ก่อน แล้วค่อย parameterize** (สองชั้นเสมอ)
- เรียก SP ด้วย tagged template: `` prisma.$executeRaw`EXEC usp_Name ${a}, ${b}` ``
- **ห้าม** `$queryRawUnsafe` / `$executeRawUnsafe` กับ input ที่มาจากผู้ใช้
- ตาราง/วิวที่มาจากระบบอื่นและ linked server = **SELECT-only** ห้าม INSERT/UPDATE/DELETE
- `CAST()` ทุกคอลัมน์ที่ select ข้าม linked server (type metadata เชื่อไม่ได้)
- `COUNT(*)` กลับมาเป็น `number|bigint` แล้วแต่ driver → ครอบ `Number()` เสมอ

## Env

- ห้ามอ่าน `process.env` ตรง ๆ ใน app code — `import { env } from '@/lib/env'`
  (ยกเว้น `lib/env.ts`, `*.config.ts` ที่ root, `instrumentation*.ts`, `sentry.*.config.ts`, ไฟล์ test)
- `.env.example` = placeholder ที่ commit ได้ · `.env.local` = ค่าจริง ห้าม commit
