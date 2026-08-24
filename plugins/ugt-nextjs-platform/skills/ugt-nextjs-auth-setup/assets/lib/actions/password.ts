// kit: ugt-nextjs-platform 4.47.0 · ugt-nextjs-auth-setup/lib/actions/password.ts
// kit-hash: a4f786cad072
'use server';

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL] only.
// ลบทั้งไฟล์เมื่อไม่ได้เปิด local login (SSO/LDAP เปลี่ยนรหัสผ่านที่ directory ไม่ใช่ที่นี่)
//
// ลืมรหัสผ่าน (forgotPasswordAction) ต้องมี ugt-nextjs-mail-setup ติดตั้งแล้ว —
// ตัวส่งอีเมลอยู่ใน sendResetPassword ของ lib/auth.ts ไม่ใช่ที่นี่
//
// API ของ Better Auth 1.5.4 (ตรวจจาก dist/api/routes/password.mjs):
//   auth.api.requestPasswordReset({ body: { email, redirectTo } })  ← ชื่อเดิม forgetPassword ไม่มีแล้ว
//   auth.api.resetPassword({ body: { newPassword, token } })
//   auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions }, headers })
// token ของ reset ถูกลบทิ้งหลังใช้สำเร็จ (ใช้ซ้ำไม่ได้) และหมดอายุตาม
// resetPasswordTokenExpiresIn ใน lib/auth.ts

import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { passwordSchema } from '@/lib/password-policy';

// ─── Cookie naming ───────────────────────────────────────────────────────────
// สำเนาเดียวกับใน lib/actions/auth.ts — แก้ที่ไหนต้องแก้ให้ครบทั้งสองที่
// (แยกไฟล์ไม่ได้ตรง ๆ เพราะไฟล์ 'use server' export ได้เฉพาะ async function)
const APP_COOKIE_PREFIX = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';
const SESSION_COOKIE_NAME = (env.BETTER_AUTH_URL ?? '').startsWith('https://')
  ? `__Secure-${APP_COOKIE_PREFIX}.session_token`
  : `${APP_COOKIE_PREFIX}.session_token`;
const SECURE_COOKIE = SESSION_COOKIE_NAME.startsWith('__Secure-');

// ─── Rate limiting ───────────────────────────────────────────────────────────
// ตัวเดียวกับ lib/actions/auth.ts — in-memory ต่อ instance
// หลาย instance เมื่อไหร่ ย้ายไป Redis/ฐานข้อมูลพร้อมกันทั้งสองไฟล์
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const g = globalThis as typeof globalThis & { _authRateLimit?: Map<string, RateLimitEntry> };
const rateLimitStore: Map<string, RateLimitEntry> = g._authRateLimit ?? (g._authRateLimit = new Map());

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

async function getRequestMeta(): Promise<{ ip: string; userAgent: string }> {
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown';
  return { ip, userAgent: headersList.get('user-agent') ?? 'unknown' };
}

async function logAuthEvent(
  action: string,
  userId: string,
  detail: Record<string, unknown>
): Promise<void> {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

// ─── ลืมรหัสผ่าน ─────────────────────────────────────────────────────────────

const forgotSchema = z.object({ email: z.email() });

/**
 * ขอลิงก์ตั้งรหัสผ่านใหม่
 *
 * **ตอบข้อความเดียวกันเสมอ** ไม่ว่าอีเมลนั้นจะมีอยู่จริงหรือไม่ — ถ้าตอบต่างกัน
 * หน้านี้จะกลายเป็นเครื่องมือไล่เช็คว่าใครเป็นผู้ใช้ของระบบ (user enumeration)
 * Better Auth เองก็หน่วงเวลาให้เท่ากันเพื่อกัน timing attack
 */
export async function forgotPasswordAction(values: {
  email: string;
}): Promise<{ ok: true } | { code: string }> {
  const parsed = forgotSchema.safeParse(values);
  // อีเมลผิดรูปแบบก็ตอบเหมือนสำเร็จ — เหตุผลเดียวกับด้านบน
  if (!parsed.success) return { ok: true };

  const { ip, userAgent } = await getRequestMeta();
  // เข้มกว่าหน้า login เพราะทุกครั้งที่สำเร็จคือการยิงอีเมลออกจากระบบ
  if (!checkRateLimit(`forgot:${ip}`, 3, 15 * 60 * 1000)) {
    return { code: 'RESET_LINK_RATE_LIMITED' };
  }

  const user = await prisma.user
    .findUnique({ where: { email: parsed.data.email }, select: { id: true, authType: true } })
    .catch(() => null);

  // บัญชี SSO/LDAP ไม่มีรหัสผ่านในระบบนี้ — ส่งลิงก์ไปก็ตั้งไม่ได้
  // และการตั้งได้จะกลายเป็นทางลัดข้าม directory ขององค์กร
  if (user && user.authType !== 'local') {
    await logAuthEvent('password.reset.refused', user.id, {
      reason: 'not-a-local-account',
      authType: user.authType,
      ip,
      userAgent,
    });
    return { ok: true };
  }

  await auth.api
    .requestPasswordReset({ body: { email: parsed.data.email, redirectTo: '/reset-password' } })
    .catch(() => {});

  if (user) {
    await logAuthEvent('password.reset.requested', user.id, { ip, userAgent });
  }
  return { ok: true };
}

// ─── ตั้งรหัสผ่านใหม่จากลิงก์ ────────────────────────────────────────────────

const resetSchema = z.object({ token: z.string().min(1, 'INVALID_INPUT'), password: passwordSchema });

/**
 * ทุก session เดิมของผู้ใช้จะถูกยกเลิกด้วย — ตั้งไว้ที่
 * `emailAndPassword.revokeSessionsOnPasswordReset` ใน lib/auth.ts
 * (คนที่มาตั้งรหัสใหม่มักเพราะสงสัยว่าบัญชีถูกใช้งานโดยคนอื่น
 * ถ้า session ของคนนั้นยังอยู่ การตั้งรหัสใหม่ก็ไม่ได้ไล่ใครออกเลย)
 */
export async function resetPasswordAction(values: {
  token: string;
  password: string;
}): Promise<{ ok: true } | { code: string }> {
  const parsed = resetSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }

  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`reset:${ip}`, 10, 15 * 60 * 1000)) {
    return { code: 'RATE_LIMITED' };
  }

  try {
    await auth.api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.password },
    });
  } catch {
    // แยกไม่ได้ว่าโทเคนหมดอายุหรือถูกใช้ไปแล้ว และไม่ควรแยกให้ผู้ใช้รู้ด้วย
    return { code: 'RESET_LINK_INVALID' };
  }

  // audit เขียนใน onPasswordReset ของ lib/auth.ts — ที่นั่นได้ user object มาด้วย
  return { ok: true };
}

// ─── เปลี่ยนรหัสผ่านของตัวเอง ────────────────────────────────────────────────

const changeSchema = z.object({
  currentPassword: z.string().min(1, 'CURRENT_PASSWORD_REQUIRED'),
  newPassword: passwordSchema,
});

/**
 * ต้องยืนยันรหัสผ่านปัจจุบันเสมอ — ไม่งั้นใครที่ยืมเครื่องที่เปิดค้างไว้
 * ก็ยึดบัญชีได้ในสองคลิก · session อื่นถูกยกเลิกทั้งหมด เหลือแค่เครื่องนี้
 */
export async function changePasswordAction(values: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { code: string }> {
  const parsed = changeSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return { code: 'SESSION_EXPIRED' };

  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`change:${session.user.id}`, 5, 15 * 60 * 1000)) {
    return { code: 'RATE_LIMITED' };
  }

  let result: Response;
  try {
    result = await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
      asResponse: true,
    });
  } catch {
    return { code: 'CHANGE_PASSWORD_FAILED' };
  }

  if (!result.ok) {
    await logAuthEvent('password.change.failed', session.user.id, { ip, userAgent });
    return { code: 'WRONG_CURRENT_PASSWORD' };
  }

  // revokeOtherSessions ทำให้ Better Auth ออก session token ใหม่ — ถ้าไม่ส่งต่อ
  // cookie ตัวใหม่ ผู้ใช้จะโดนเตะออกจากเครื่องที่เพิ่งเปลี่ยนรหัสเองด้วย
  // (วิธี decode ตรงนี้เหมือน localLoginAction ใน lib/actions/auth.ts)
  const setCookieHeader = result.headers.get('set-cookie');
  if (setCookieHeader) {
    const [nameValue] = setCookieHeader.split(';');
    const eqIdx = nameValue.indexOf('=');
    const cookieStore = await cookies();
    cookieStore.set(nameValue.slice(0, eqIdx).trim(), decodeURIComponent(nameValue.slice(eqIdx + 1).trim()), {
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE_COOKIE,
      maxAge: 8 * 60 * 60, // ต้องตรงกับ session.expiresIn ใน lib/auth.ts
      path: '/',
    });
  }

  await logAuthEvent('password.change', session.user.id, { ip, userAgent });
  return { ok: true };
}
