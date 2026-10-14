// kit: ugt-nextjs-platform 4.78.0 · ugt-nextjs-auth-setup/lib/actions/admin-preassign.ts
// kit-hash: 72dee537e169
'use server';

// lib/actions/admin-preassign.ts — tab "ตั้งล่วงหน้า (รอ login)" ของ /admin/users
// installed by ugt-nextjs-auth-setup — [DIRECTORY]: ลบไฟล์นี้เมื่อไม่มี view พนักงาน
//
// **ตั้ง role ล่วงหน้า ไม่ใช่สร้างบัญชีล่วงหน้า** (มติ 2026-08-11 แก้ 2026-10-14):
// ไม่มีแถว user/account เกิดที่นี่ — แค่แถวรอใน PendingRoleAssignments ที่คีย์ด้วย
// ตัวตนฝั่ง HR (EmpCode + ADLoginName) ซึ่ง server หาเองจาก view ทุกครั้ง ไม่รับ
// ชื่อ/username ที่ client ส่งมา จึงไม่มีทางพิมพ์ผิดจนเกิดผู้ใช้ซ้ำ และไม่มีแถวที่
// Better Auth จะ link บัญชีเข้าไปได้ บัญชีจริงยังเกิดตอน SSO/LDAP login ครั้งแรก
// แล้ว lib/after-login.ts ค่อยใส่ role ให้
//
// สิทธิ์ = users:update (ตัวเดียวกับเปลี่ยน role ในตาราง — งานเดียวกัน คนละเวลา)
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { AUDIT_ACTIONS, type AuditAction } from '@/lib/audit-actions';
import { getDirectoryPersonByEmpCode, searchDirectory } from '@/lib/directory';

type ActionResult = { success: true } | { success: false; code: string };

/** คนหนึ่งคนจากผลค้น view HR พร้อมบอกว่าตั้งล่วงหน้าได้ไหม */
export type HrCandidate = {
  empCode: string;
  loginName: string | null;
  name: string;
  email: string | null;
  position: string | null;
  department: string | null;
  /** available = ตั้งได้ · has-account = login แล้ว (ใช้ dropdown ในแท็บทั้งหมด)
   *  · pending = ตั้งไว้แล้ว · no-ad = ไม่มีบัญชี AD จึง login ไม่ได้อยู่ดี */
  status: 'available' | 'has-account' | 'pending' | 'no-ad';
};

// session → permission (users:update) — ลำดับ guard ตามสัญญากลาง
async function requireUsersUpdate(): Promise<{ ok: true; actorId: string } | { ok: false; code: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) return { ok: false, code: 'FORBIDDEN' };
  return { ok: true, actorId: session.user.id };
}

async function audit(actorId: string, action: AuditAction, detail: Record<string, unknown>): Promise<void> {
  await prisma.activityLog
    .create({ data: { userId: actorId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

const lower = (s: string | null | undefined) => (s ?? '').toLowerCase();

export async function searchHrForPreassignAction(
  query: string
): Promise<{ success: true; people: HrCandidate[] } | { success: false; code: string }> {
  const gate = await requireUsersUpdate();
  if (!gate.ok) return { success: false, code: gate.code };

  const parsed = z.string().trim().min(2).max(100).safeParse(query);
  if (!parsed.success) return { success: true, people: [] };

  // searchDirectory คืน [] เมื่อ linked server ล่ม — หน้าจอจะเห็นแค่ "ไม่พบ" (read-only, ไม่โยน)
  const people = await searchDirectory(parsed.data);
  if (people.length === 0) return { success: true, people: [] };

  const empCodes = people.map((p) => p.empCode).filter(Boolean);
  const logins = people.map((p) => p.loginName).filter(Boolean);
  const [users, pendings] = await Promise.all([
    prisma.user.findMany({
      where: { OR: [{ empCode: { in: empCodes } }, { ldapUsername: { in: logins } }] },
      select: { empCode: true, ldapUsername: true },
    }),
    prisma.pendingRoleAssignment.findMany({
      where: { OR: [{ empCode: { in: empCodes } }, { loginName: { in: logins } }] },
      select: { empCode: true, loginName: true },
    }),
  ]);
  // AD ไม่สนตัวพิมพ์ — เทียบแบบตัวเล็กทั้งหมด
  const taken = (rows: Array<{ empCode: string | null; key: string | null }>) =>
    new Set(rows.flatMap((r) => [lower(r.empCode), lower(r.key)]).filter(Boolean));
  const hasAccount = taken(users.map((u) => ({ empCode: u.empCode, key: u.ldapUsername })));
  const isPending = taken(pendings.map((p) => ({ empCode: p.empCode, key: p.loginName })));
  const statusOf = (empCode: string, loginName: string | null): HrCandidate['status'] => {
    if (!loginName) return 'no-ad';
    if (hasAccount.has(lower(empCode)) || hasAccount.has(lower(loginName))) return 'has-account';
    if (isPending.has(lower(empCode)) || isPending.has(lower(loginName))) return 'pending';
    return 'available';
  };

  return {
    success: true,
    people: people.map((p) => ({
      empCode: p.empCode,
      loginName: p.loginName || null,
      name: p.nameTh || p.nameEn || p.loginName,
      email: p.email,
      position: p.position,
      department: p.department,
      status: statusOf(p.empCode, p.loginName || null),
    })),
  };
}

const createSchema = z.object({
  empCode: z.string().trim().min(1, 'INVALID_INPUT').max(50, 'INVALID_INPUT'),
  roleId: z.string().min(1, 'ROLE_NOT_FOUND').max(36, 'INVALID_INPUT'),
});

export async function createPreassignAction(values: { empCode: string; roleId: string }): Promise<ActionResult> {
  // 1–2. session → permission
  const gate = await requireUsersUpdate();
  if (!gate.ok) return { success: false, code: gate.code };

  // 3. domain checks + action
  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { success: false, code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  const { empCode, roleId } = parsed.data;

  if (!(await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }))) {
    return { success: false, code: 'ROLE_NOT_FOUND' };
  }
  // ตัวตนมาจาก view เสมอ ไม่ใช่จาก client — client ส่งได้แค่ empCode ที่เลือกจากผลค้น
  const person = await getDirectoryPersonByEmpCode(empCode);
  if (!person) return { success: false, code: 'HR_PERSON_NOT_FOUND' };
  if (!person.loginName) return { success: false, code: 'HR_NO_AD_LOGIN' };

  const account = await prisma.user.findFirst({
    where: { OR: [{ empCode: person.empCode }, { ldapUsername: person.loginName }] },
    select: { id: true },
  });
  if (account) return { success: false, code: 'USER_ALREADY_EXISTS' };

  let pending: { id: string };
  try {
    pending = await prisma.pendingRoleAssignment.create({
      data: {
        empCode: person.empCode,
        loginName: person.loginName,
        fullName: person.nameTh || person.nameEn || person.loginName,
        email: person.email,
        roleId,
        createdBy: gate.actorId,
      },
      select: { id: true },
    });
  } catch (error) {
    // unique บน EmpCode/LoginName — แอดมินสองคนกดคนเดียวกันพร้อมกัน
    if ((error as { code?: string }).code === 'P2002') return { success: false, code: 'PREASSIGN_EXISTS' };
    throw error;
  }

  // 4. audit log (non-blocking)
  await audit(gate.actorId, AUDIT_ACTIONS.USERS_PREASSIGN_CREATE, {
    pendingId: pending.id,
    empCode: person.empCode,
    loginName: person.loginName,
    roleId,
  });
  revalidatePath('/admin/users');
  return { success: true };
}

const idSchema = z.string().min(1).max(36);

export async function updatePreassignAction(id: string, roleId: string): Promise<ActionResult> {
  const gate = await requireUsersUpdate();
  if (!gate.ok) return { success: false, code: gate.code };
  if (!idSchema.safeParse(id).success || !idSchema.safeParse(roleId).success) {
    return { success: false, code: 'INVALID_INPUT' };
  }
  if (!(await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } }))) {
    return { success: false, code: 'ROLE_NOT_FOUND' };
  }

  // updateMany: แถวที่เพิ่งถูกใช้ไปตอนเจ้าตัว login ไม่ throw แค่นับได้ 0
  const updated = await prisma.pendingRoleAssignment.updateMany({
    where: { id },
    data: { roleId, updatedBy: gate.actorId },
  });
  if (updated.count === 0) return { success: false, code: 'PREASSIGN_NOT_FOUND' };

  await audit(gate.actorId, AUDIT_ACTIONS.USERS_PREASSIGN_UPDATE, { pendingId: id, roleId });
  revalidatePath('/admin/users');
  return { success: true };
}

export async function deletePreassignAction(id: string): Promise<ActionResult> {
  const gate = await requireUsersUpdate();
  if (!gate.ok) return { success: false, code: gate.code };
  if (!idSchema.safeParse(id).success) return { success: false, code: 'INVALID_INPUT' };

  const row = await prisma.pendingRoleAssignment.findUnique({
    where: { id },
    select: { empCode: true, roleId: true },
  });
  if (!row) return { success: false, code: 'PREASSIGN_NOT_FOUND' };
  await prisma.pendingRoleAssignment.deleteMany({ where: { id } });

  await audit(gate.actorId, AUDIT_ACTIONS.USERS_PREASSIGN_DELETE, { pendingId: id, ...row });
  revalidatePath('/admin/users');
  return { success: true };
}
