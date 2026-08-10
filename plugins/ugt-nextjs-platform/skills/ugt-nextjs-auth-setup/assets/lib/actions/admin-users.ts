'use server';

// lib/actions/admin-users.ts — role assignment + local-account creation for the
// (admin)/admin/users page.
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // [METHOD: LOCAL]
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { passwordSchema } from '@/lib/password-policy'; // [METHOD: LOCAL]

type ActionResult = { success: true } | { success: false; error: string };

/** Server Action guard pattern (org contract): session -> permission -> action -> audit log. */
export async function assignUserRoleAction(userId: string, roleId: string | null): Promise<ActionResult> {
  // 1. Session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  // 2. Permission
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) {
    return { success: false, error: 'Forbidden' };
  }

  // 3. Domain checks + action
  // Changing your own role (including away from Administrator) is done by
  // another admin, never by yourself — the same "cannot act on your own
  // privileged record" rule as delete-self elsewhere in this pattern.
  if (userId === session.user.id) {
    return { success: false, error: 'Cannot change your own role' };
  }
  await prisma.user.update({ where: { id: userId }, data: { roleId } });

  // 4. Audit log (non-blocking)
  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: 'users.role-assign',
        detail: JSON.stringify({ targetId: userId, roleId }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}

// ─── [METHOD: LOCAL] สร้างบัญชี local ────────────────────────────────────────
// ลบสองแอ็กชันด้านล่างเมื่อไม่ได้เปิด local login — บัญชี SSO/LDAP เกิดเองตอน
// login ครั้งแรก ไม่มีใครต้องสร้าง
//
// **ไม่มีหน้าสมัครสมาชิก และจะไม่มี** — แอปในองค์กรไม่เปิดให้ใครก็ได้สร้างบัญชี
// ทางเข้าเดียวของบัญชี local คือแอดมินสร้างให้จากหน้านี้

const createUserSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ').max(200),
  email: z.email('อีเมลไม่ถูกต้อง'),
  password: passwordSchema,
  roleId: z.string().nullable(),
});

export async function createLocalUserAction(values: {
  name: string;
  email: string;
  password: string;
  roleId: string | null;
}): Promise<ActionResult> {
  // 1. Session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  // 2. Permission
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_CREATE)) {
    return { success: false, error: 'Forbidden' };
  }

  // 3. Domain checks + action
  const parsed = createUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }
  const { name, email, password, roleId } = parsed.data;

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { success: false, error: 'มีผู้ใช้อีเมลนี้อยู่แล้ว' };
  }

  // signUpEmail สร้าง user + credential account ให้ครบในครั้งเดียว
  // **ห้ามส่ง asResponse / ห้ามส่งต่อ Set-Cookie** — จะกลายเป็นแอดมินถูกสลับ
  // ไปเป็น session ของผู้ใช้ที่เพิ่งสร้าง
  let created: { user: { id: string } };
  try {
    created = await auth.api.signUpEmail({ body: { name, email, password } });
  } catch {
    return { success: false, error: 'สร้างผู้ใช้ไม่สำเร็จ' };
  }

  await prisma.user.update({
    where: { id: created.user.id },
    data: { authType: 'local', roleId },
  });

  // 4. Audit log (non-blocking) — ไม่มีรหัสผ่านใน detail เด็ดขาด
  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: 'users.create',
        detail: JSON.stringify({ targetId: created.user.id, email, roleId, authType: 'local' }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}

/**
 * [METHOD: LOCAL] แอดมินสั่งส่งลิงก์ตั้งรหัสผ่านใหม่ให้ผู้ใช้
 *
 * ตั้งรหัสให้ตรง ๆ ไม่ได้โดยเจตนา — แอดมินที่รู้รหัสผ่านของผู้ใช้ทำให้ audit log
 * ตอบไม่ได้อีกต่อไปว่าใครเป็นคนกระทำ ระบบจึงออกลิงก์ให้เจ้าของบัญชีตั้งเอง
 *
 * **ต้องมี ugt-nextjs-mail-setup** — ไม่มีเมล = ไม่มีทางกู้บัญชี local ที่ลืมรหัส
 * เลยแม้แต่ทางเดียว (Better Auth ตอบ RESET_PASSWORD_DISABLED) นั่นคือเหตุผลที่
 * SKILL.md §3 ให้ถามเรื่องเมลตั้งแต่ตอนสัมภาษณ์ ไม่ใช่ค่อยไปเจอตอนมีคนลืมรหัส
 */
export async function sendUserPasswordResetAction(userId: string): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_RESET_PASSWORD)) {
    return { success: false, error: 'Forbidden' };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, authType: true },
  });
  if (!target?.email) return { success: false, error: 'ไม่พบผู้ใช้' };
  if (target.authType !== 'local') {
    return { success: false, error: 'บัญชีนี้ใช้รหัสผ่านจาก SSO/LDAP เปลี่ยนที่ระบบนั้นแทน' };
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: target.email, redirectTo: '/reset-password' },
    });
  } catch {
    return { success: false, error: 'ส่งลิงก์ไม่สำเร็จ (ระบบอีเมลยังไม่พร้อม)' };
  }

  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: 'users.password-reset-sent',
        detail: JSON.stringify({ targetId: userId }),
      },
    })
    .catch(() => {});

  return { success: true };
}
