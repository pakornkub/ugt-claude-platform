// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/lib/after-login.ts
// kit-hash: 9cde10ff4fc7
// installed by ugt-nextjs-auth-setup — projects with SSO and/or LDAP
//
// สิ่งที่ทำหลัง SSO/LDAP login สำเร็จทุกครั้ง (เรียกจาก session hook ใน lib/auth.ts
// และจาก ldapLoginAction — หลังเติมข้อมูลจาก directory แล้ว):
//   1. role ที่แอดมินตั้งล่วงหน้าไว้จาก view HR → ใส่ให้ แล้วลบแถวรอ
//   2. (ยังไม่ติดตั้ง) เมลแจ้งแอดมินเมื่อคน login แล้วยังไม่มีบทบาท — ต้องมี
//      ugt-nextjs-mail-setup ก่อน; mail-setup §4.6 จะเติมส่วนนั้นกลับเข้ามาที่ไฟล์นี้
//      ระหว่างนี้แอดมินเห็นคนที่ยังไม่มีบทบาทจาก tab + badge บน /admin/users
//
// **ห้ามทำให้ login พัง** — ทุกอย่างในไฟล์นี้กลืน error แล้ว log เท่านั้น
// คนที่ login ได้แต่ยังไม่มีบทบาท ดีกว่าคนที่ login ไม่ได้เลยเสมอ
import { prisma } from '@/lib/prisma';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import type { DirectoryPerson } from '@/lib/directory';

export async function afterOrgLogin({
  userId,
  loginName,
  person,
}: {
  userId: string;
  /** AD username — preferred_username (SSO) / the bound username (LDAP) */
  loginName: string | null;
  /** ผลจาก getDirectoryPerson — null เมื่อไม่พบหรือ linked server ล่ม */
  person: DirectoryPerson | null;
}): Promise<void> {
  // await: หน้าแรกหลัง login ต้องเห็น role แล้ว
  try {
    await applyPendingRole(userId, loginName, person);
  } catch (error) {
    console.error('[after-login] pre-assigned role not applied (login continues):', userId, error); // NOSONAR typescript:S106 — server-side error log only
  }
}

// ─── role ที่ตั้งล่วงหน้า ────────────────────────────────────────────────────
// แถวรอถูกตั้งจากผลค้น view HR (ไม่ได้พิมพ์เอง) จึงจับคู่ด้วยตัวตนฝั่ง HR:
// EmpCode เมื่อ directory ตอบได้ (HR เป็นต้นฉบับ) · ADLoginName เมื่อ linked server
// ล่ม (ค่าเดียวกับที่ IdP เพิ่งยืนยัน) — ไม่ใช้อีเมลเด็ดขาด

async function applyPendingRole(
  userId: string,
  loginName: string | null,
  person: DirectoryPerson | null
): Promise<void> {
  let where: { empCode: string } | { loginName: string } | null = null;
  if (person?.empCode) where = { empCode: person.empCode };
  else if (loginName) where = { loginName };
  if (!where) return;

  const pending = await prisma.pendingRoleAssignment.findFirst({
    where,
    select: { id: true, roleId: true, empCode: true, createdBy: true },
  });
  if (!pending) return;

  // "จอง" แถวรอด้วยการลบก่อน — ลบได้ (count === 1) คือ login นี้เป็นคนใช้แถวนี้คนเดียว:
  //   · login ซ้อนกันสองแท็บ → อีกแท็บลบได้ 0 ไม่ใส่ role ซ้ำ ไม่เขียน audit ซ้ำ
  //   · แอดมินเปลี่ยน role ของแถวรอระหว่างทาง (roleId ไม่ตรง) → ไม่ใช้ค่าเก่า
  //     แถวยังอยู่ login ครั้งหน้าได้ค่าใหม่
  // แล้วเติมเฉพาะคนที่ยังไม่มีบทบาท — ถ้าแอดมินตั้งจาก /admin/users ไปก่อนแล้ว อันนั้นชนะ
  const outcome = await prisma.$transaction(async (tx) => {
    const consumed = await tx.pendingRoleAssignment.deleteMany({
      where: { id: pending.id, roleId: pending.roleId },
    });
    if (consumed.count !== 1) return null;
    const assigned = await tx.user.updateMany({
      where: { id: userId, roleId: null },
      data: { roleId: pending.roleId },
    });
    return { applied: assigned.count === 1 };
  });
  if (!outcome) return; // อีก login ใช้ไปแล้ว หรือแถวเปลี่ยนระหว่างทาง

  // audit นอก transaction — ไม่ block และล้มก็ไม่ย้อนการใส่ role
  await prisma.activityLog
    .create({
      data: {
        userId, // actor = คนที่ login — ระบบใช้ role แทนแอดมินที่ตั้งไว้ (setBy)
        action: AUDIT_ACTIONS.USERS_PREASSIGN_APPLY,
        detail: JSON.stringify({
          pendingId: pending.id,
          empCode: pending.empCode,
          roleId: pending.roleId,
          setBy: pending.createdBy,
          applied: outcome.applied,
        }),
      },
    })
    .catch(() => {});
}
