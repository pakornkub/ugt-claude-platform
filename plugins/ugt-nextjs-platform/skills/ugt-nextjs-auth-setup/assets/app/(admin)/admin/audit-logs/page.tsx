// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-auth-setup/app/(admin)/admin/audit-logs/page.tsx
// kit-hash: d75f7f9bdb29
// app/(admin)/admin/audit-logs/page.tsx — read-only ActivityLogs viewer.
// DataTable โหมด server (DESIGN.md §4): log โตไม่จำกัด — sort + filter + paginate
// ผ่าน URL state ทั้งหมด "never half" · หน้านี้ parse searchParams แล้ว query จริง
// ฝั่ง server ไม่มี API route แยก — DataTable push page/sort กลับลง URL ให้เอง
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { firstParam, getTotalPages, parsePageParams, parsePageSize, withPage } from '@/lib/pagination';
import { parseTableQuery, toOrderBy, type TableFields } from '@/lib/table-query';
import { PageDescription, PageHeader, PageHeaderText, PageTitle } from '@/components/ui/page-shell';
import { AuditLogsTable } from '@/components/audit-logs-table';

// allowlist ของตารางนี้ — sort ได้เฉพาะเวลา · ไม่มีกรองรายคอลัมน์ (การกรองอยู่ที่
// toolbar: ชื่อผู้ใช้ / ช่วงวันที่ / action ซึ่งหน้านี้อ่านจาก q/from/to/action เอง)
const AUDIT_FIELDS: TableFields = { sortable: ['createdAt'], filterable: [] };

export default async function AdminAuditLogsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.AUDIT_LOGS_READ)) redirect('/');

  const sp = await searchParams;
  // ตารางเฝ้าดู/ตรวจสอบ = 20 แถวต่อหน้า (มติ pageSize — ดู lib/pagination.ts)
  const pageSize = parsePageSize(sp.pageSize, 20);
  const { page, skip, take } = parsePageParams(sp.page, pageSize);
  const query = parseTableQuery(sp, AUDIT_FIELDS);
  const q = firstParam(sp.q).trim();
  const action = firstParam(sp.action).trim();
  const from = firstParam(sp.from).trim();
  const to = firstParam(sp.to).trim();

  const where: {
    action?: string;
    userId?: { in: string[] };
    createdAt?: { gte?: Date; lt?: Date };
  } = {};
  if (action) where.action = action;
  // ขอบเขตวันคิดที่เวลาไทยเสมอ (+07:00) — createdAt เป็น instant และ server อาจรัน
  // UTC · to เป็นขอบ exclusive ของวันถัดไป เพื่อรวมทั้งวันสุดท้าย
  if (from) where.createdAt = { gte: new Date(`${from}T00:00:00+07:00`) };
  if (to) {
    const end = new Date(`${to}T00:00:00+07:00`);
    where.createdAt = { ...where.createdAt, lt: new Date(end.getTime() + 86_400_000) };
  }
  if (q) {
    const matched = await prisma.user.findMany({
      where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
      select: { id: true },
    });
    // ไม่มีใคร match → in: [] → 0 แถว (ถูกต้อง — ไม่ใช่ "เลิกกรอง")
    where.userId = { in: matched.map((u) => u.id) };
  }

  const [totalItems, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      skip,
      take,
      orderBy: toOrderBy(query) ?? { createdAt: 'desc' },
    }),
  ]);

  // สถานะตารางทั้งชุดกลับเข้า URL — DataTable ใช้เป็นฐานตอน push page/sort ของมันเอง
  const baseParams = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    const first = firstParam(value);
    if (first) baseParams.set(key, first);
  }
  baseParams.set('page', String(page));
  baseParams.set('pageSize', String(pageSize));

  // ?page เกินท้าย (filter เปลี่ยนแล้วจำนวนหน้าลดลง / ผู้ใช้แก้ URL) → เด้งไปหน้าสุดท้าย
  const totalPages = getTotalPages(totalItems, pageSize);
  if (page > totalPages) redirect(`/admin/audit-logs?${withPage(baseParams.toString(), totalPages)}`);

  const userIds = [...new Set(logs.map((l) => l.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  // ตัวเลือกของ Select action มาจากข้อมูลจริง — โปรเจคไม่ต้อง hardcode รายการ
  const actionOptions = (
    await prisma.activityLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    })
  ).map((row) => row.action);

  return (
    <div className="space-y-4">
      {/* หัวหน้าเพจตามโครง DESIGN.md §3 — ใช้ page-shell ของ kit ไม่เขียน h1 เอง */}
      <PageHeader>
        <PageHeaderText>
          <PageTitle>บันทึกกิจกรรม</PageTitle>
          <PageDescription>อ่านอย่างเดียว — ตารางนี้ไม่มีปุ่มแก้หรือลบ</PageDescription>
        </PageHeaderText>
      </PageHeader>
      <AuditLogsTable
        rows={logs.map((log) => {
          const user = userById.get(log.userId);
          return {
            id: log.id,
            createdAt: log.createdAt.toISOString(),
            userName: user ? `${user.name} (${user.email})` : log.userId,
            action: log.action,
            detail: log.detail,
          };
        })}
        pageIndex={page - 1}
        pageSize={pageSize}
        totalItems={totalItems}
        query={query}
        fields={AUDIT_FIELDS}
        baseParams={baseParams.toString()}
        actionOptions={actionOptions}
        filters={{ q, from, to, action }}
      />
    </div>
  );
}
