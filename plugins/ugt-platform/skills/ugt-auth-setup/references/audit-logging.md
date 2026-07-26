# Audit Logging — ActivityLogs (org contract ข้อ 4)

ตาราง `ActivityLogs` เป็น **append-only** บันทึกว่าใครทำอะไรเมื่อไหร่ ทุกโปรเจคต้องมี
schema อยู่ใน `assets/schema-auth.prisma` แล้ว — ไฟล์นี้อธิบายกฎการเขียน อ่าน และเก็บ

## Quick Rules

- เขียน log **ทุกครั้ง** ที่มี privileged/sensitive action: export ข้อมูล, เปลี่ยน setting,
  create/update/delete user, จัดการ role/permission, login/logout
- **เขียนหลังงานหลักสำเร็จเท่านั้น** — ไม่ใช่ก่อน (ไม่งั้นได้ log ของงานที่ fail)
- **audit log ล้มต้องไม่ทำให้งานหลักล้ม** — path ที่ critical ใช้ fire-and-forget + `.catch(() => {})`
- **ห้ามเก็บ password / secret / token / PII ที่ไม่ mask ใน `detail`** — audit log
  ที่เก็บ payload มั่วคือช่องรั่วข้อมูลส่วนบุคคล และคนที่มีสิทธิ์อ่าน log มักกว้างกว่าคนที่มีสิทธิ์อ่านข้อมูลต้นทาง
- action เป็น `<resource>.<verb>` ตัวเล็กทั้งหมด คั่นด้วยจุด — และประกาศเป็น **constant** ไม่ใช่ raw string
- **export route เป็นข้อยกเว้น**: log **ก่อน** เริ่ม stream เพราะหยุด stream กลางทางไม่ได้

## Schema (มาใน `assets/schema-auth.prisma` แล้ว)

```prisma
model activityLog {
  id        Int      @id @default(autoincrement()) @map("Id")
  userId    String   @map("UserId")   // ไม่มี FK — user ถูกลบได้ ประวัติต้องอยู่
  action    String   @map("Action")   // dot-namespaced: "users.delete", "export.excel"
  detail    String?  @db.NVarChar(Max) @map("Detail")  // JSON string, nullable
  createdAt DateTime @default(now()) @map("CreatedAt")

  @@map("ActivityLogs")
}
```

- **ทำไมไม่มี FK บน `userId`** — ลบ user ได้โดยไม่เสียประวัติ เก็บเป็น string
  แล้วไป enrich ชื่อตอนอ่านด้วย batch lookup
- **ทำไม `NVarChar(Max)`** — ขนาด payload เดาไม่ได้ (filter, จำนวนแถว, array) ไม่ต้องการให้ถูกตัด
- ตารางนี้เป็นข้อยกเว้นของกฎ audit columns มาตรฐาน (ไม่มี `UpdatedAt`/`IsDeleted`)
  เพราะ append-only — **ห้าม UPDATE หรือ DELETE จาก app code**

## Action naming

```ts
// lib/audit-actions.ts
export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: 'login.success',
  LOGIN_FAILED: 'login.failed',
  LOGOUT: 'logout',
  LOGOUT_SSO: 'logout.sso',
  USERS_CREATE: 'users.create',
  USERS_DELETE: 'users.delete',
  USERS_RESET_PASSWORD: 'users.resetPassword',
  ROLES_UPDATE: 'roles.update',
  EXPORT_EXCEL: 'export.excel',
  SETTINGS_UPDATE: 'settings.update',
} as const;
```

สี่ตัวแรกเป็น**ข้อบังคับขององค์กร** (contract ข้อ 4) — `assets/lib-auth.ts` และ
`assets/lib-actions-auth.ts` เขียนให้แล้ว · ที่เหลือเพิ่มตามโดเมนของโปรเจค

```ts
// ✅ dot-namespaced ชัดเจน
'users.delete'  ·  'export.excel'  ·  'settings.update'

// ❌ กำกวม / ไม่ namespace
'export'  ·  'update'  ·  'เปลี่ยน setting'
```

## Write pattern

### แบบ sequential (default) — log หลังงานหลักสำเร็จ

```ts
export async function deleteUserAction(userId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.USERS_DELETE)) {
    return { success: false, error: 'Forbidden' };
  }

  // 1. งานหลักก่อน
  await prisma.user.delete({ where: { id: userId } });

  // 2. audit log หลังสำเร็จ
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: AUDIT_ACTIONS.USERS_DELETE,
      detail: JSON.stringify({ targetUserId: userId }),
    },
  });

  return { success: true };
}
```

```ts
// ❌ สลับลำดับ — ได้ log ของงานที่ยังไม่เกิด (หรือ fail)
await prisma.activityLog.create({ ... });
await prisma.user.delete({ ... });
```

### แบบ non-blocking — path ที่ audit ต้องไม่บล็อกผู้ใช้

```ts
const [result] = await Promise.all([
  prisma.appSetting.upsert({ ... }),
  prisma.activityLog
    .create({ data: { userId: session.user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATE, detail } })
    .catch(() => {}), // ← กลืน error โดยตั้งใจ
]);
```

```ts
// ❌ ไม่ await และไม่ catch → unhandled promise rejection
prisma.activityLog.create({ ... });
```

login/logout ทุกเส้นทางต้องใช้แบบ non-blocking — audit log ล้มแล้ว login พังคือความล้มเหลวที่แย่กว่า

### Export route — log ก่อน stream

```ts
await prisma.activityLog.create({
  data: {
    userId: session.user.id,
    action: AUDIT_ACTIONS.EXPORT_EXCEL,
    detail: JSON.stringify({ filters, sort, rowCount: data.length }),
  },
});
return new Response(buffer, { headers: { 'Content-Type': '...' } });
```

## `detail` payload — ใส่อะไรได้/ไม่ได้

เก็บเป็น JSON ที่มีบริบทพอให้สืบย้อนได้ว่าเกิดอะไรขึ้น แต่ไม่ใช่สำเนาของข้อมูลเอง

| ประเภท action | field ที่ควรมี | ห้ามมี |
| --- | --- | --- |
| Export | `{ filters, sort, rowCount }` | ตัวข้อมูลที่ export |
| เปลี่ยน setting | `{ previousValue, newValue }` | secret/connection string |
| จัดการ user | `{ targetUserId, targetEmail }` | password, password hash, token |
| Login | `{ method: 'sso' \| 'ldap' \| 'local' }` | password ที่กรอกผิด, session token |

```ts
// ✅ มีโครงสร้าง สืบย้อนได้
detail: JSON.stringify({ filters: { status: 'active' }, rowCount: 42 });

// ❌ เป็นประโยคเปล่า สืบอะไรไม่ได้
detail: 'ผู้ใช้ export ข้อมูลด้วย filter บางอย่าง';

// ❌ มีข้อมูลที่ห้ามเก็บ
detail: JSON.stringify({ password: 'abc123' });
```

**PDPA/ความเป็นส่วนตัว**: ก่อนใส่ field ที่เป็นข้อมูลบุคคล ถามว่า "ถ้าคนที่มีสิทธิ์
`audit-logs:read` เห็น field นี้ ยอมรับได้ไหม" — สิทธิ์อ่าน log มักกว้างกว่าสิทธิ์อ่านข้อมูลต้นทาง

## Viewer API

```ts
// app/api/audit-logs/route.ts
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.AUDIT_LOGS_READ)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') ?? '20', 10)));

  // ค้นด้วยชื่อผู้ใช้: resolve เป็น userId ก่อน (อย่า LIKE บน userId)
  let userIdFilter: string[] | undefined;
  if (username) {
    const matching = await prisma.user.findMany({
      where: { OR: [{ name: { contains: username } }, { ldapUsername: { contains: username } }] },
      select: { id: true },
    });
    // sentinel: ถ้าไม่เจอใครเลย ต้องบังคับให้ผลลัพธ์ว่าง
    userIdFilter = matching.length > 0 ? matching.map((u) => u.id) : ['__no_match__'];
  }

  const [logs, totalItems] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.activityLog.count({ where }),
  ]);

  // enrich ชื่อผู้ใช้แบบ batch — ห้าม N+1
  const uniqueUserIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUserIds } },
    select: { id: true, name: true, ldapUsername: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    success: true,
    data: logs.map((l) => ({
      ...l,
      detail: l.detail ? JSON.parse(l.detail) : null,
      userName: userMap.get(l.userId)?.ldapUsername ?? userMap.get(l.userId)?.name ?? l.userId,
    })),
    pagination: { page, limit, totalPages: Math.ceil(totalItems / limit), totalItems },
  });
}
```

**ทำไมต้องมี sentinel `'__no_match__'`** — ถ้าค้นชื่อแล้วไม่เจอใคร แล้วส่ง
`userId: { in: [] }` ผลที่ได้อาจกลายเป็น "ไม่กรอง" แล้วคืนทุกแถว การใส่ id ที่ไม่มีจริง
บังคับให้ผลลัพธ์ว่างอย่างถูกต้อง

Permission ที่ต้องมีใน `lib/permissions.ts`: `AUDIT_LOGS_READ: 'audit-logs:read'`
(guard ทั้งหน้า viewer และ API route — ดู `rbac.md`)

## Retention

- กำหนดระยะเก็บขั้นต่ำไว้ในเอกสารโปรเจค (เช่น 180 วัน)
- schema ไม่มี `expiresAt`/soft-delete → ใช้ scheduled job ฝั่ง DB ลบของเก่า:

```sql
-- SQL Agent job
DELETE FROM ActivityLogs WHERE CreatedAt < DATEADD(day, -180, GETDATE());
```

- **ห้ามลบแถวจาก application code**

### Viewer API ต้องบังคับ cutoff ใน WHERE ด้วย

job ลบเป็นรอบ ๆ แต่ระหว่างรอบยังมีแถวเก่าค้างอยู่ → API ต้องกรองที่ query time ด้วย
ไม่งั้นข้อมูลที่ประกาศว่า "เก็บ 180 วัน" จะถูกอ่านได้นานกว่านั้น:

```ts
// ✅ API บังคับเพดาน 180 วันเองไม่ว่า job จะรันเมื่อไหร่
const retentionCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
const where = {
  createdAt: {
    gte: fromDate ? new Date(fromDate) : retentionCutoff,
    ...(toDate ? { lte: new Date(`${toDate}T23:59:59Z`) } : {}),
  },
};

// ❌ ไม่มีเพดาน → อ่านแถวเก่าได้จนกว่า job จะรัน
const where = { createdAt: { gte: fromDate ? new Date(fromDate) : undefined } };
```

## Checklist

- [ ] เขียน log **หลัง** งานหลักสำเร็จ (ยกเว้น export route ที่ log ก่อน stream)
- [ ] path ที่ critical (login/logout) ใช้ `.catch(() => {})` ไม่ใช่ `await` เปล่า
- [ ] action ทุกตัวมาจาก constant ใน `lib/audit-actions.ts` ไม่มี raw string
- [ ] `detail` เป็น JSON ที่มีโครงสร้าง · ไม่มี password/secret/token · ไม่มี PII ที่ไม่ควรกว้าง
- [ ] Viewer API: guard ด้วย `audit-logs:read` · sentinel เมื่อค้นไม่เจอ · enrich ชื่อแบบ batch · บังคับ retention cutoff
- [ ] ไม่มีโค้ดที่ UPDATE หรือ DELETE `ActivityLogs`
- [ ] มี scheduled job ลบของเก่า และระยะเก็บถูกบันทึกไว้ในเอกสารโปรเจค
