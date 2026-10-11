// kit: ugt-nextjs-platform 4.51.0 · ugt-nextjs-auth-setup/lib/actions/admin-users.ts
// kit-hash: bdb3d75afb89
'use server';

// lib/actions/admin-users.ts — role assignment + account creation for the
// (admin)/admin/users page.
//
// **ไม่มีหน้าสมัครสมาชิก และจะไม่มี** — แอปในองค์กรไม่เปิดให้ใครก็ได้สร้างบัญชีเอง
// (`lib/auth.ts` จึงตั้ง `disableSignUp: true` ปิด POST /api/auth/sign-up/email
// ที่ Better Auth เปิดให้อัตโนมัติเมื่อ emailAndPassword.enabled)
//
// บัญชีเกิดได้สามทางเท่านั้น:
//   local → createLocalUserAction (สิทธิ์ USERS_CREATE) — ตั้งรหัสผ่านตั้งต้นให้เลย
//   ldap  → เกิดเองตอน bind สำเร็จครั้งแรก — ไม่ต้องเพิ่มที่นี่ (มติ 2026-08-11:
//           ไม่มีการตั้งบัญชี AD ล่วงหน้า ข้อมูลอยู่ใน directory อยู่แล้วเหมือน SSO
//           กำหนด role ให้หลังจากเขา login ครั้งแรกจากหน้านี้)
//   sso   → เกิดเองตอน login ผ่าน Keycloak ครั้งแรก
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // [METHOD: LOCAL]
import { generateId } from 'better-auth'; // [METHOD: LOCAL]
import { hashPassword } from 'better-auth/crypto'; // [METHOD: LOCAL]
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { passwordSchema } from '@/lib/password-policy'; // [METHOD: LOCAL]

type ActionResult = { success: true } | { success: false; code: string; field?: string };

/** Server Action guard pattern (org contract): session -> permission -> action -> audit log. */
export async function assignUserRoleAction(userId: string, roleId: string | null): Promise<ActionResult> {
  // 1. Session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  // 2. Permission
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  // 3. Domain checks + action
  // Changing your own role (including away from Administrator) is done by
  // another admin, never by yourself — the same "cannot act on your own
  // privileged record" rule as delete-self elsewhere in this pattern.
  if (userId === session.user.id) {
    return { success: false, code: 'CANNOT_CHANGE_OWN_ROLE' };
  }
  await prisma.user.update({ where: { id: userId }, data: { roleId } });

  // 4. Audit log (non-blocking)
  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: AUDIT_ACTIONS.USERS_ROLE_ASSIGN,
        detail: JSON.stringify({ targetId: userId, roleId }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}

// ─── [METHOD: LOCAL] สร้างบัญชี local ────────────────────────────────────────
//
// เขียนแถว user + account เองแทนการเรียก `auth.api.signUpEmail` โดยตั้งใจ:
// signUpEmail ออก session ของผู้ใช้ใหม่ (เสี่ยงสลับร่างแอดมิน) และ
// `disableSignUp: true` ปิดมันไปพร้อมกับ route สาธารณะอยู่แล้ว
// `hashPassword` จาก `better-auth/crypto` เป็น API สาธารณะ ใช้อัลกอริทึมเดียว
// กับที่ signInEmail ใช้ตรวจตอน login

const createLocalUserSchema = z.object({
  name: z.string().min(1, 'USER_NAME_REQUIRED').max(255, 'INVALID_INPUT'),
  email: z.email('EMAIL_INVALID').max(255, 'INVALID_INPUT'),
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
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  // 2. Permission
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_CREATE)) return { success: false, code: 'FORBIDDEN' };

  // 3. Domain checks + action
  const parsed = createLocalUserSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, code: issue?.message ?? 'INVALID_INPUT', field: issue?.path[0]?.toString() };
  }
  const { name, email, password, roleId } = parsed.data;

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { success: false, code: 'EMAIL_IN_USE', field: 'email' };
  }

  const userId = generateId(24);
  const hashed = await hashPassword(password);
  // สองแถวต้องเกิดพร้อมกัน — user ที่ไม่มีแถว account แบบ credential คือบัญชีที่
  // login ไม่ได้ และไม่มีอะไรบนหน้าจอบอกว่าทำไม
  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, name, email, emailVerified: true, authType: 'local', roleId },
    }),
    prisma.account.create({
      data: {
        id: generateId(24),
        accountId: email,
        providerId: 'credential',
        userId,
        password: hashed,
      },
    }),
  ]);

  // 4. Audit log (non-blocking) — ห้ามมีรหัสผ่านใน detail เด็ดขาด
  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: AUDIT_ACTIONS.USERS_CREATE,
        detail: JSON.stringify({ targetId: userId, email, roleId, authType: 'local' }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}

// ─── [METHOD: LOCAL] แอดมินตั้งรหัสผ่านใหม่ให้ผู้ใช้ ────────────────────────
//
// ทางกู้บัญชีที่ทำงานได้แม้โปรเจคไม่ได้ติดตั้งระบบอีเมล — ส่วน "ลืมรหัสผ่าน"
// ที่ผู้ใช้กดเองต้องมี ugt-nextjs-mail-setup เสมอ
// ข้อแลกที่ต้องรู้: ช่วงหนึ่งจะมีคนสองคนรู้รหัสเดียวกัน จึงต้องบอกให้เจ้าตัว
// เปลี่ยนทันทีหลังเข้าระบบ และ audit log บันทึกว่าแอดมินคนไหนตั้งให้ใคร

const setPasswordSchema = z.object({
  userId: z.string().min(1, 'INVALID_INPUT').max(36, 'INVALID_INPUT'),
  newPassword: passwordSchema,
});

export async function setUserPasswordAction(values: {
  userId: string;
  newPassword: string;
}): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_RESET_PASSWORD)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  const parsed = setPasswordSchema.safeParse(values);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { success: false, code: issue?.message ?? 'INVALID_INPUT', field: issue?.path[0]?.toString() };
  }
  const { userId, newPassword } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { authType: true },
  });
  if (!target) return { success: false, code: 'USER_NOT_FOUND' };
  if (target.authType !== 'local') {
    return { success: false, code: 'SSO_LDAP_NO_RESET' };
  }

  const updated = await prisma.account.updateMany({
    where: { userId, providerId: 'credential' },
    data: { password: await hashPassword(newPassword) },
  });
  if (updated.count === 0) {
    return { success: false, code: 'NO_PASSWORD_SET' };
  }

  // เหตุผลเดียวกับตอนผู้ใช้ reset เอง — คนที่ยังค้าง session อยู่ต้องหลุด
  await prisma.session.deleteMany({ where: { userId } }).catch(() => {});

  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: AUDIT_ACTIONS.USERS_PASSWORD_SET,
        detail: JSON.stringify({ targetId: userId }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}
