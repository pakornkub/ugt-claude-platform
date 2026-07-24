# Naming Conventions — SQL Server (ฉบับเต็ม)

มาตรฐานการตั้งชื่อ object ทุกชนิดใน database ขององค์กร ใช้ได้กับทุก stack —
ตัวอย่าง Prisma ประกอบเพราะเป็น reference implementation

## 1. ตาราง (Tables)

**DB จริง: PascalCase พหูพจน์ — Prisma model: camelCase เอกพจน์ + `@@map()` เสมอ**

```prisma
model rolePermission {
  // ...
  @@map("RolePermissions")   // ✅ PascalCase plural
}
```

| ✅                       | ❌                        |
| ------------------------ | ------------------------- |
| `@@map("Users")`         | `@@map("user")`           |
| `@@map("RolePermissions")` | `@@map("rolePermission")` |
| `@@map("HolidayItems")`  | `@@map("holiday_items")`  |

### ตาราง read-only ที่ระบบภายนอก populate

ตารางที่ **SQL Server Agent Job / ETL / SP ภายนอก** เป็นคน INSERT (app อ่านอย่างเดียว)
ใช้ prefix เฉพาะกลุ่ม เช่น `<EXT>_` (เลือก prefix สั้น ๆ ประจำโปรเจคหนึ่งตัวแล้วคงที่):

- `<EXT>_WeeklySummary`, `<EXT>_AccessDetail` → SELECT-only จากฝั่ง app
- ตารางที่ app เป็นเจ้าของ (เขียนเองได้) → **ไม่มี prefix** — `HolidayLists`, `AppSettings`
- prefix คือสัญญาณ ownership: เห็น prefix = ห้ามเขียน, ต้องมีตาราง override ฝั่ง app ถ้าจะแก้ค่า

**Append-only override pattern** (เมื่อ source read-only ถูก re-populate ทุกวัน):
สร้างตาราง `*Overrides` ฝั่ง app, ไม่ update/delete แถวเดิม — insert ใหม่เสมอ,
ตอนอ่านให้ resolver กลางเลือกแถว `CreatedAt` ล่าสุด overlay ทับค่า raw

## 2. คอลัมน์ (Columns)

**DB จริง: PascalCase — Prisma field: camelCase + `@map()` ทุก field**

```prisma
model user {
  id        String   @id @default(cuid()) @map("Id")
  empCode   String?                       @map("EmpCode")
  createdAt DateTime @default(now())      @map("CreatedAt")
  updatedAt DateTime @updatedAt           @map("UpdatedAt")
  @@map("Users")
}
```

### Audit columns มาตรฐาน

ตาราง master / transaction ที่ app เป็นเจ้าของ ต้องมีชุดนี้:

| คอลัมน์     | Type (Prisma)                          | หมายเหตุ                                  |
| ----------- | -------------------------------------- | ----------------------------------------- |
| `Id`        | `String @id @default(cuid())` หรือ `Int @id @default(autoincrement())` | PK เสมอชื่อ `Id` |
| `CreatedAt` | `DateTime @default(now())`             |                                           |
| `UpdatedAt` | `DateTime @updatedAt`                  |                                           |
| `CreatedBy` | `String`                               | user id / login ของผู้สร้าง               |
| `UpdatedBy` | `String?`                              | nullable — แถวใหม่ยังไม่เคยแก้            |
| `IsActive`  | `Boolean @default(true)`               | เปิด/ปิดการใช้งาน (master data)           |
| `IsDeleted` | `Boolean @default(false)`              | soft delete — ห้าม hard delete ข้อมูลที่ต้องเก็บประวัติ |

ตาราง key/value หรือ log ที่ semantics ไม่ครบ (เช่น settings ที่มีแต่การแก้)
ตัดเหลือเฉพาะที่มีความหมายได้ (`UpdatedAt`/`UpdatedBy`) — แต่ห้ามเปลี่ยนชื่อ

### T-SQL reserved words — ห้ามใช้เป็นชื่อคอลัมน์

แก้โดย **เติมคำขยาย** ไม่ใช่ใส่ `[bracket]` หนีไปเรื่อย ๆ ตัวอย่างที่เจอบ่อย:

| Reserved       | ใช้แทน (ตามบริบท)              | เหตุผล                          |
| -------------- | ------------------------------ | ------------------------------- |
| `key`          | `SettingKey`, `BucketKey`, `PermKey` | `KEY` เป็น reserved keyword |
| `value`        | `SettingValue`, `VerificationValue` | `VALUE` semi-reserved      |
| `group`        | `GroupName`                    | `GROUP` (GROUP BY)              |
| `count`        | `RequestCount`, `ItemCount`    | `COUNT` เป็น aggregate function |
| `order`        | `SortOrder`                    | `ORDER` (ORDER BY)              |
| `day`, `month`, `year` (ระวัง) | `DayOfMonth`, `MonthName` | `DAY()`/`MONTH()`/`YEAR()` เป็น built-in function — `Year` เดี่ยว ๆ ใช้ได้แต่ถ้าคู่กับชื่อ function อื่นให้เติมคำขยาย |
| `user`, `session` (ชื่อตาราง) | ใช้ได้เมื่อ quote ผ่าน Prisma แต่พหูพจน์ (`Users`, `Sessions`) เลี่ยงชนได้ในตัว | |

ใน schema ให้คอมเมนต์กำกับทุกจุดที่เลี่ยง reserved word:

```prisma
key   String @unique @map("PermKey")   // KEY is T-SQL reserved
group String         @map("GroupName") // GROUP is T-SQL reserved
```

### Type mapping ที่ใช้ประจำ

| ข้อมูล                          | Prisma attribute            |
| ------------------------------- | --------------------------- |
| ข้อความยาว / JSON blob          | `@db.NVarChar(Max)`         |
| ข้อความไทย (จำกัดความยาว)       | `@db.NVarChar(200)` ฯลฯ — ใช้ `NVarChar` เสมอเมื่อมีภาษาไทย |
| รหัส/code                       | `@db.NVarChar(50)`          |
| ทศนิยม (วัน/ชั่วโมง)            | `@db.Decimal(5, 1)` ตาม precision จริง |
| วันที่ล้วน (ไม่มีเวลา)          | `DateTime @db.Date`         |

## 3. Stored Procedures

- Prefix **`usp_`** + PascalCase บอก action: `usp_RecalculateWeeklySummary`, `usp_DumpAccessDetail`
- ห้ามใช้ `sp_` (ชนกับ system procedures ของ SQL Server และโดน scan master DB ก่อน)
- SP ที่อ่าน config จากตาราง app: อ่านผ่านคอลัมน์จริง เช่น `SELECT SettingValue FROM dbo.AppSettings WHERE [SettingKey] = '...'` — ชื่อคอลัมน์ต้อง sync กับ `@map()` ใน schema

## 4. Functions / Views

| ชนิด                  | Prefix | ตัวอย่าง                     |
| --------------------- | ------ | ---------------------------- |
| Scalar / table-valued function | `fn`   | `fnGetScheduleActual(@EmpCode)` |
| View                  | `vw`   | `vwEmployee`                 |

View บน linked server = read-only เสมอ (ดู `raw-sql-and-sp.md`)

## 5. Index / Constraint (ตอนเขียน migration SQL เอง)

ตามรูปแบบที่ Prisma generate ให้ เพื่อความสม่ำเสมอ:

- PK: `<Table>_pkey` — `CONSTRAINT [HolidayLists_pkey] PRIMARY KEY CLUSTERED ([Id])`
- Default: `<Table>_<Column>_df` — `CONSTRAINT [HolidayLists_IsActive_df] DEFAULT 0`
- FK: `<Table>_<Column>_fkey`
- Filtered unique index (เขียนมือ): `UX_<Table>_<Columns>_<เงื่อนไข>`
