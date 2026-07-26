# Raw SQL & Stored Procedures — MSSQL ผ่าน Prisma

Pattern สำหรับงานที่ Prisma Client query ปกติทำไม่ได้: อ่านข้าม linked server,
เรียก stored procedure, pagination บน view ภายนอก

## 1. กฎเหล็ก: sanitize → parameterize (สองชั้นเสมอ)

`$queryRaw` tagged template ทำ parameterization ให้อยู่แล้ว แต่มาตรฐานองค์กร
บังคับ **sanitize input ด้วย regex ก่อนทุกครั้ง** เป็น defense-in-depth
(กันทั้ง injection ที่หลุดจาก refactor ภายหลัง และค่าขยะที่ทำ query พัง):

```ts
export async function getRecordByCode(code: string): Promise<Row | null> {
  // ชั้น 1: sanitize — อนุญาตเฉพาะ alphanumeric + _ . -
  if (!/^[a-zA-Z0-9_.-]+$/.test(code)) {
    throw new Error('Invalid code format');
  }

  // ชั้น 2: parameterize — tagged template → sp_executesql parameter จริง
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT TOP 1
      CAST(u.Code     AS VARCHAR(50))    AS Code,
      CAST(u.NameThai AS NVARCHAR(100))  AS NameThai
    FROM <linked-server>.<db>.dbo.<view> AS u
    WHERE u.Code = ${code}
  `;
  return rows[0] ?? null;
}
```

- **ห้าม** `$queryRawUnsafe` / `$executeRawUnsafe` กับค่าที่มาจากผู้ใช้เด็ดขาด
- ฟังก์ชัน lookup ที่ล้มเหลวได้โดยไม่ critical → คืน `null`/`[]` ใน `catch`
  (เช่น linked server ล่มไม่ควรบล็อก flow หลัก) — ฟังก์ชันที่ต้อง fail loud → throw

## 2. Linked-server read-only view pattern

โปรเจคที่ต้องอ่านข้อมูล master จาก DB อื่นผ่าน linked server:

- อ้างชื่อเต็ม 4 ส่วน: `<linked-server>.<db>.dbo.<view>`
- **SELECT-only เด็ดขาด** — ห้าม INSERT/UPDATE/DELETE ผ่าน linked server
- **`CAST(...)` ทุกคอลัมน์ที่ select** — type metadata ข้าม linked server เชื่อไม่ได้
  (คอลัมน์ไทย → `NVARCHAR(n)`, รหัส → `VARCHAR(n)`, วันที่ → `CONVERT(VARCHAR(10), x, 23)` ได้ `yyyy-MM-dd`)
- **เลี่ยง recursive CTE ข้าม linked server** — ดึง edge list มาทั้ง view ครั้งเดียว
  แล้วคำนวณ (BFS/กราฟ) ใน JS แทน
- คอลัมน์ที่ view รุ่นเก่าอาจไม่มี → ลอง query เต็มใน `try`, `catch` แล้ว fallback
  query เฉพาะคอลัมน์ base (คอลัมน์ที่หายให้ `CAST(NULL AS ...)` แทน)

### Search ด้วย LIKE

```ts
const term = `%${query.trim()}%`;   // wildcard อยู่ฝั่ง JS — ตัว term ยังเป็น parameter
const rows = await prisma.$queryRaw<Row[]>`
  SELECT TOP 50 ...
  FROM <linked-server>.<db>.dbo.<view> AS u
  WHERE u.LoginName LIKE ${term} OR u.NameThai LIKE ${term}
  ORDER BY u.NameEng
`;
```

จำกัดผลลัพธ์เสมอ (`TOP 50`) กัน payload บวม

### Pagination (OFFSET/FETCH + COUNT ขนานกัน)

```ts
const offset = (page - 1) * pageSize;
const [rows, countResult] = await Promise.all([
  prisma.$queryRaw<Row[]>`
    SELECT ...
    FROM <linked-server>.<db>.dbo.<view> AS u
    WHERE u.OrgCode = ${orgCode}
    ORDER BY u.NameEng
    OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
  `,
  prisma.$queryRaw<[{ total: number }]>`
    SELECT COUNT(*) AS total
    FROM <linked-server>.<db>.dbo.<view> AS u
    WHERE u.OrgCode = ${orgCode}
  `,
]);
return { data: rows, total: Number(countResult[0]?.total ?? 0), page, pageSize };
```

หมายเหตุ: `COUNT(*)` กลับมาเป็น `number|bigint` แล้วแต่ driver — ครอบ `Number()` เสมอ

## 3. เรียก Stored Procedure (`EXEC usp_*`)

ใช้ `$executeRaw` tagged template — ทุก argument เป็น parameter จริง ไม่มี string ต่อ:

```ts
try {
  await prisma.$executeRaw`EXEC usp_RecalculateWeeklySummary ${weekNo}, ${weekYear}`;
} catch (err) {
  // log รายละเอียดฝั่ง server สำหรับ DBA — อย่าส่ง SQL error ดิบกลับ client
  console.error('[recalculate] SP error:', err instanceof Error ? err.message : err);
  return { success: false, error: 'SP_ERROR' };
}
```

กรอบมาตรฐานเมื่อเรียกจาก Server Action (mutation):
session guard → permission check → validate input (Zod) → `EXEC` → เขียน audit log

## 4. requestTimeout สำหรับ SP นาน

Default timeout ของ `mssql` คือ 15 วินาที — SP คำนวณหนัก/dump ข้อมูลจะโดนตัด
ตั้งใน config ของ adapter (ดู `assets/lib-prisma.ts`):

```ts
return {
  server, port, database, user, password,
  options: { encrypt, trustServerCertificate },
  // เผื่อ stored procedure รันนาน (เช่น recalculation รายสัปดาห์) สูงสุด 5 นาที
  requestTimeout: 5 * 60 * 1000,
};
```

ตั้งเป็นค่าเดียวทั้ง app — อย่าตั้งรายจุด (adapter config มีที่เดียว)

## 5. SQL fragment helpers (Prisma v7)

ถ้าต้องประกอบ fragment แบบ dynamic อย่า import จาก `@prisma/client` —
ใช้ runtime helpers:

```ts
import { sqltag, join, empty, raw, type Sql } from '@prisma/client/runtime/client';
```

(`raw()` เฉพาะกับค่าที่ hardcode/ผ่าน allowlist แล้วเท่านั้น — ห้ามใช้กับ input ผู้ใช้)

## 6. MSSQL `TIME` column gotcha

Driver `mssql` map คอลัมน์ SQL `TIME(0)` เป็น JS `Date` ที่ anchor `1970-01-01`
โดย **ค่า wall-clock อยู่ในส่วน UTC** — อ่านด้วย local getters
(`getHours()`, `toLocaleString()`) จะเพี้ยนตาม timezone เครื่อง
→ ทำ formatter กลางตัวเดียวที่อ่านผ่าน `getUTCHours()`/`getUTCMinutes()`
แล้วบังคับให้ทุกจุด format ผ่านตัวนั้นที่ data layer ก่อนถึง UI
