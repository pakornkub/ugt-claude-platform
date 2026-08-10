// source: ugt-hrms lib/services/employee-monitor-scope.ts + hr-lookup.ts
// (getSubordinates / collectSubtreeEmpCodes) — generalized by ugt-nextjs-auth-setup
//
// **Permission ตอบว่า "ทำได้ไหม" — scope ตอบว่า "กับข้อมูลของใคร"**
// สองคำถามนี้ไม่เหมือนกัน และการมีแค่ข้อแรกคือช่องโหว่ที่เจอบ่อยที่สุด:
// ผู้ใช้ที่มีสิทธิ์ `leave:read` ผ่าน guard ทุกด่าน แล้วแก้ `?empCode=` ใน URL
// เป็นของคนอื่น ก็เห็นข้อมูลคนอื่นได้ ทั้งที่ระบบ "ตรวจสิทธิ์แล้ว"
//
// ทุกหน้า / route / Server Action ที่รับ empCode เข้ามา **ต้อง** resolve scope
// แล้วเรียก isEmpCodeAllowed ก่อนแตะข้อมูล — ไม่มีข้อยกเว้น

import { prisma } from '@/lib/prisma';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { getDirectoryEdges } from '@/lib/directory';

export interface DataScope {
  /** เห็นได้ทุกคน — มาจาก permission `<resource>:read-all` ที่ส่งเข้ามา */
  viewAll: boolean;
  /** รหัสพนักงานของเจ้าของ session; null เมื่อบัญชียังไม่ผูกกับพนักงาน */
  ownEmpCode: string | null;
  /** หน่วยงานของเจ้าของ session — ใช้ทำ scope ระดับหน่วยงาน */
  ownOrgCode: string | null;
  /** รหัสพนักงานของลูกน้องทั้งสาย (ไม่รวมตัวเอง); ว่างเมื่อไม่มีหรือยังไม่ผูก */
  subordinateEmpCodes: string[];
}

/**
 * ไล่ลงจาก rootEmpCode เก็บลูกน้องทั้ง subtree (ไม่รวม root เอง)
 *
 * ฟังก์ชันบริสุทธิ์ — ทดสอบได้โดยไม่ต้องมีฐานข้อมูล และนั่นคือเหตุผลที่แยกออกมา
 * กันวนซ้ำด้วย visited set (ข้อมูล HR จริงมีเคส A เป็นหัวหน้า B และ B เป็นหัวหน้า A
 * จากการคีย์ผิด) และจำกัดความลึกไว้กันสายที่ยาวผิดปกติ
 */
export function collectSubtreeEmpCodes(
  edges: readonly { empCode: string; superEmpCode: string | null }[],
  rootEmpCode: string,
  maxDepth = 20
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const { empCode, superEmpCode } of edges) {
    if (!superEmpCode) continue;
    const list = childrenByParent.get(superEmpCode) ?? [];
    list.push(empCode);
    childrenByParent.set(superEmpCode, list);
  }

  const result = new Set<string>();
  let frontier = childrenByParent.get(rootEmpCode) ?? [];
  let depth = 0;
  while (frontier.length > 0 && depth < maxDepth) {
    const next: string[] = [];
    for (const code of frontier) {
      if (code === rootEmpCode || result.has(code)) continue; // cycle guard
      result.add(code);
      next.push(...(childrenByParent.get(code) ?? []));
    }
    frontier = next;
    depth++;
  }
  return [...result];
}

/** ลูกน้องทั้งสายของพนักงานคนหนึ่ง — [] เมื่อ directory อ่านไม่ได้ */
export async function getSubordinateEmpCodes(managerEmpCode: string): Promise<string[]> {
  const edges = await getDirectoryEdges();
  return collectSubtreeEmpCodes(edges, managerEmpCode);
}

/**
 * ประกอบ scope ของผู้ใช้หนึ่งคนสำหรับ resource หนึ่งตัว — **server-side เท่านั้น**
 *
 * `readAllPermission` คือ key ของ permission "เห็นได้ทุกคน" ของ resource นั้น
 * (เช่น `PERMISSIONS.LEAVE_READ_ALL`) ส่งเข้ามาเพื่อให้ไฟล์นี้ไม่ต้องรู้จัก
 * resource ใดเป็นพิเศษ
 *
 * `includeSubordinates` ปิดได้เมื่อ resource นั้นไม่มีแนวคิด "ทีมของฉัน" —
 * ปิดแล้วประหยัดการอ่าน edge list ทั้ง view ไปหนึ่งครั้ง
 */
export async function resolveDataScope(
  userId: string,
  readAllPermission: string,
  options: { includeSubordinates?: boolean } = {}
): Promise<DataScope> {
  const [permissions, user] = await Promise.all([
    getUserPermissions(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { empCode: true, orgCode: true },
    }),
  ]);

  const ownEmpCode = user?.empCode ?? null;
  const viewAll = permissions.includes(readAllPermission);

  // คนที่เห็นได้ทุกคนอยู่แล้ว ไม่ต้องไปอ่านสายบังคับบัญชาให้เสียเที่ยว
  const needSubordinates = (options.includeSubordinates ?? true) && !viewAll && !!ownEmpCode;

  return {
    viewAll,
    ownEmpCode,
    ownOrgCode: user?.orgCode ?? null,
    subordinateEmpCodes: needSubordinates ? await getSubordinateEmpCodes(ownEmpCode) : [],
  };
}

/**
 * scope นี้อ่านข้อมูลของ empCode นี้ได้ไหม
 *
 * ลำดับ: เห็นทุกคน → ตัวเอง → ลูกน้อง
 * บัญชีที่ยังไม่ผูกกับพนักงาน (ownEmpCode = null) เห็นอะไรไม่ได้เลย ซึ่งเป็นทิศที่
 * ปลอดภัย — เคยมีบั๊กคลาสสิกคือ `null === undefined` ทำให้บัญชีที่ไม่ผูกกลาย
 * เป็นเห็นแถวที่ empCode ว่างของคนอื่น
 */
export function isEmpCodeAllowed(scope: DataScope, empCode: string): boolean {
  if (scope.viewAll) return true;
  if (!empCode) return false;
  if (scope.ownEmpCode !== null && scope.ownEmpCode === empCode) return true;
  return scope.subordinateEmpCodes.includes(empCode);
}

/**
 * ชิ้นส่วน `where` ของ Prisma ที่จำกัดแถวให้อยู่ใน scope — ใช้กับ "รายการ"
 * ส่วน isEmpCodeAllowed ใช้กับ "รายตัว" ทั้งสองต้องมาจาก scope ก้อนเดียวกัน
 *
 * ```ts
 * const scope = await resolveDataScope(session.user.id, PERMISSIONS.LEAVE_READ_ALL);
 * const rows = await prisma.leaveRequest.findMany({ where: { ...scopeWhere(scope), status } });
 * ```
 *
 * `column` คือชื่อฟิลด์ที่เก็บรหัสพนักงานเจ้าของแถวในโมเดลนั้น
 */
export function scopeWhere(scope: DataScope, column = 'empCode'): Record<string, unknown> {
  if (scope.viewAll) return {};
  const allowed = [scope.ownEmpCode, ...scope.subordinateEmpCodes].filter(
    (c): c is string => !!c
  );
  // ลิสต์ว่าง = ไม่ผูกกับพนักงานและไม่มีลูกน้อง → ต้องไม่เห็นแถวไหนเลย
  // `in: []` ของ Prisma คืนศูนย์แถว ซึ่งคือสิ่งที่ต้องการพอดี
  return { [column]: { in: allowed } };
}
