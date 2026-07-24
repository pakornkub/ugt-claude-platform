# Migrations — Prisma + MSSQL

## 1. Flow ปกติ

```bash
# Dev — สร้าง migration ใหม่จาก diff ของ schema
npx prisma migrate dev --name <snake_case_description>
npx prisma generate        # บังคับหลัง migrate ทุกครั้ง — generated client จะ stale

# Prod / CI — apply migration ที่มีอยู่ ไม่สร้างใหม่
npx prisma migrate deploy
```

- `DATABASE_URL` ถูกอ่านผ่าน `prisma.config.ts` (dotenv โหลด `.env.local` ก่อน `.env`)
- Seed: กำหนดใน `prisma.config.ts` → `migrations.seed: 'npx tsx prisma/seed.ts'` แล้วรัน `npx prisma db seed`
- อาการ "build รายงาน implicit `any` เป็นสิบจุดจาก Prisma callback" = generated
  client stale → รัน `npx prisma generate` ก่อนไปไล่แก้ type รายจุด

## 2. เขียน migration SQL มือ — ครอบ transaction เสมอ

Migration ที่เขียนเอง (ไม่ได้ generate) ให้ใช้กรอบเดียวกับที่ Prisma generate:

```sql
BEGIN TRY
BEGIN TRAN;

-- ... DDL/DML ...

COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
  THROW;
END CATCH;
```

## 3. Rename คอลัมน์/ตารางด้วย `sp_rename` (ไม่เสียข้อมูล)

**ปัญหา:** เปลี่ยน `@map()` ใน schema แล้วให้ Prisma diff เอง — Prisma มองเป็น
**DROP คอลัมน์เก่า + ADD คอลัมน์ใหม่ = ข้อมูลหาย**

**วิธีที่ถูก:** migration มือด้วย `EXEC sp_rename` (rename in-place):

```sql
-- migration.sql (โฟลเดอร์ migration ใหม่ ตั้ง timestamp เอง เช่น 20260501000000_rename_columns)
BEGIN TRY
BEGIN TRAN;

EXEC sp_rename 'dbo.Items.id',        'Id',        'COLUMN';
EXEC sp_rename 'dbo.Items.createdAt', 'CreatedAt', 'COLUMN';
-- reserved word → เติมคำขยาย พร้อมคอมเมนต์
EXEC sp_rename 'dbo.Items.key',       'ItemKey',   'COLUMN'; -- key → ItemKey (KEY is T-SQL reserved)

COMMIT TRAN;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRAN;
  THROW;
END CATCH;
```

**ขั้นตอน apply:**

1. อัปเดต `@map()`/`@@map()` ใน `schema.prisma` ให้ตรงชื่อใหม่
2. รัน SQL ข้างบนใน SSMS (หรือ `sqlcmd`) กับ database เป้าหมายโดยตรง
3. บอก Prisma ว่า migration นี้ apply แล้ว — **ห้าม** ให้ `migrate dev` รันเอง:

   ```bash
   npx prisma migrate resolve --applied 20260501000000_rename_columns
   ```

4. `npx prisma generate`

หมายเหตุ: ข้อความ "Caution: Changing any part of an object name could break
scripts and stored procedures" จาก `sp_rename` เป็น informational — ไม่ใช่ error
แต่เตือนจริง: ถ้ามี SP/view อ้างชื่อเก่า ต้องไล่แก้ SP ให้ตรงด้วย

## 4. Filtered (partial) unique index — ข้อจำกัด

Prisma schema **express filtered unique index ของ MSSQL ไม่ได้**
(เช่น "unique `Year` เฉพาะแถว `IsDeleted = 0`" หรือ "active ได้ปีละ 1 แถว")
มี 2 ทางเลือก:

**ทาง A — เขียน index ใน migration SQL มือ** (บังคับที่ DB จริง):

```sql
CREATE UNIQUE NONCLUSTERED INDEX [UX_HolidayLists_Year_NotDeleted]
  ON [dbo].[HolidayLists]([Year])
  WHERE [IsDeleted] = 0;
```

- ใส่ในโฟลเดอร์ migration (มือ) — Prisma จะไม่รู้จัก index นี้ แต่ไม่ลบทิ้ง
- ข้อควรระวัง: `migrate dev` รอบถัดไปอาจ warn drift — ตรวจ diff ก่อน apply เสมอ

**ทาง B — บังคับที่ application layer** (ที่โปรเจคต้นแบบเลือกใช้):

- ครอบ logic ใน `prisma.$transaction` เช่น activate ปีใหม่ = de-activate แถวเดิม
  ทั้งหมดก่อนแล้วค่อย activate แถวเป้าหมาย ใน transaction เดียว
- คอมเมนต์กำกับใน schema ว่า constraint ถูกบังคับที่ layer ไหน:

  ```prisma
  // Partial unique constraints (year uniqueness, max-1 active per year) are
  // enforced at the application layer; MSSQL filtered indexes cannot be
  // expressed in Prisma schema migrations.
  ```

เลือกทาง A เมื่อมีหลาย writer (SP/job เขียนตารางเดียวกัน) — เลือกทาง B เมื่อ
app เป็น writer เดียวและอยากได้ error message ที่ควบคุมได้

## 5. DB ที่มีอยู่แล้ว (brownfield)

1. `npx prisma db pull` เพื่อ introspect → ได้ model ชื่อดิบ
2. Refactor model/field เป็น camelCase + `@map()`/`@@map()` ตาม convention
   (ชื่อ DB ไม่เปลี่ยน — เปลี่ยนเฉพาะฝั่ง Prisma)
3. สร้าง baseline migration แล้ว mark ว่า applied:

   ```bash
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/0_init/migration.sql
   npx prisma migrate resolve --applied 0_init
   ```

4. ถ้าจะ rename ของเดิมใน DB ให้เข้า convention → ใช้เทคนิค `sp_rename` ข้อ 3
