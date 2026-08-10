'use server';

// lib/actions/admin-users.ts — role assignment + account creation for the
// (admin)/admin/users page.
//
// **ไม่มีหน้าสมัครสมาชิก และจะไม่มี** — แอปในองค์กรไม่เปิดให้ใครก็ได้สร้างบัญชีเอง
// (`lib/auth.ts` จึงตั้ง `disableSignUp: true` ปิด POST /api/auth/sign-up/email
// ที่ Better Auth เปิดให้อัตโนมัติเมื่อ emailAndPassword.enabled)
//
// บัญชีเกิดได้สามทางเท่านั้น และทางที่แอดมินทำเองผ่านสิทธิ์ USERS_CREATE ทุกทาง:
//   local → createLocalUserAction — ตั้งรหัสผ่านตั้งต้นให้เลย
//   ldap  → เกิดเองตอน bind สำเร็จครั้งแรก **หรือ** addDirectoryUserAction
//           เมื่ออยากกำหนด role ไว้ล่วงหน้าก่อนเขา login ครั้งแรก
//   sso   → เกิดเองตอน login ผ่าน Keycloak ครั้งแรก
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod'; // [METHOD: LDAP|LOCAL]
import { generateId } from 'better-auth'; // [METHOD: LDAP|LOCAL]
import { hashPassword } from 'better-auth/crypto'; // [METHOD: LOCAL]
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
//
// เขียนแถว user + account เองแทนการเรียก `auth.api.signUpEmail` โดยตั้งใจ:
// signUpEmail ออก session ของผู้ใช้ใหม่ (เสี่ยงสลับร่างแอดมิน) และ
// `disableSignUp: true` ปิดมันไปพร้อมกับ route สาธารณะอยู่แล้ว
// `hashPassword` จาก `better-auth/crypto` เป็น API สาธารณะ ใช้อัลกอริทึมเดียว
// กับที่ signInEmail ใช้ตรวจตอน login

const createLocalUserSchema = z.object({
  name: z.string().min(1, 'กรุณากรอกชื่อ').max(255),
  email: z.email('อีเมลไม่ถูกต้อง').max(255),
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
  if (!perms.includes(PERMISSIONS.USERS_CREATE)) return { success: false, error: 'Forbidden' };

  // 3. Domain checks + action
  const parsed = createLocalUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }
  const { name, email, password, roleId } = parsed.data;

  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return { success: false, error: 'มีผู้ใช้อีเมลนี้อยู่แล้ว' };
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
        action: 'users.create',
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
  userId: z.string().min(1).max(36),
  newPassword: passwordSchema,
});

export async function setUserPasswordAction(values: {
  userId: string;
  newPassword: string;
}): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_RESET_PASSWORD)) {
    return { success: false, error: 'Forbidden' };
  }

  const parsed = setPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }
  const { userId, newPassword } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { authType: true },
  });
  if (!target) return { success: false, error: 'ไม่พบผู้ใช้' };
  if (target.authType !== 'local') {
    return { success: false, error: 'บัญชีนี้ใช้รหัสผ่านจาก SSO/LDAP เปลี่ยนที่ระบบนั้นแทน' };
  }

  const updated = await prisma.account.updateMany({
    where: { userId, providerId: 'credential' },
    data: { password: await hashPassword(newPassword) },
  });
  if (updated.count === 0) {
    return { success: false, error: 'บัญชีนี้ไม่มีรหัสผ่านในระบบ' };
  }

  // เหตุผลเดียวกับตอนผู้ใช้ reset เอง — คนที่ยังค้าง session อยู่ต้องหลุด
  await prisma.session.deleteMany({ where: { userId } }).catch(() => {});

  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: 'users.password-set',
        detail: JSON.stringify({ targetId: userId }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}

// ─── [METHOD: LDAP] ตั้งบัญชี AD ไว้ล่วงหน้า ────────────────────────────────
//
// ผู้ใช้ AD เกิดเองอยู่แล้วตอน bind สำเร็จครั้งแรก (ldapLoginAction) — แอ็กชันนี้
// มีไว้เมื่อต้องกำหนด role ให้เขา **ก่อน** วันแรกที่เขาเข้าระบบ
// `ldapUsername` ต้องตรงกับที่เขาพิมพ์ตอน login เป๊ะ ๆ เพราะ upsert ตอน login
// จับคู่ด้วยคีย์นี้ — พิมพ์ผิดตัวเดียวได้ผู้ใช้ซ้ำสองแถว แถวที่ตั้ง role ไว้ไม่มีใครใช้

const addDirectoryUserSchema = z.object({
  ldapUsername: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.@-]+$/, 'ชื่อผู้ใช้ AD ไม่ถูกต้อง'),
  name: z.string().min(1, 'กรุณากรอกชื่อ').max(255),
  email: z.email('อีเมลไม่ถูกต้อง').max(255),
  roleId: z.string().nullable(),
});

export async function addDirectoryUserAction(values: {
  ldapUsername: string;
  name: string;
  email: string;
  roleId: string | null;
}): Promise<ActionResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_CREATE)) return { success: false, error: 'Forbidden' };

  const parsed = addDirectoryUserSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  }
  const { ldapUsername, name, email, roleId } = parsed.data;

  // ชนได้สองทาง: LDAP upsert จับที่ ldapUsername ส่วน Keycloak accountLinking จับที่ email
  const [byEmail, byLogin] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findFirst({ where: { ldapUsername }, select: { id: true } }),
  ]);
  if (byEmail || byLogin) return { success: false, error: 'มีผู้ใช้รายนี้อยู่แล้ว' };

  // EXTENSION POINT: โปรเจคที่มีฐานข้อมูลพนักงาน ให้ดึงชื่อ/อีเมล/รหัสพนักงาน
  // จากที่นั่นด้วย ldapUsername แทนการให้แอดมินพิมพ์เอง แล้วเติมฟิลด์ลงใน create นี้
  const user = await prisma.user.create({
    data: {
      id: generateId(24),
      ldapUsername,
      name,
      email,
      emailVerified: false, // ยังไม่เคย bind — ยืนยันอีเมลตอนนี้ไม่ได้
      authType: 'ldap',
      roleId,
    },
  });

  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: 'users.create',
        detail: JSON.stringify({ targetId: user.id, ldapUsername, email, roleId, authType: 'ldap' }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}
