// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/lib/actions/auth.ts
// kit-hash: 815ef84429fd
'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod'; // [METHOD: LDAP|LOCAL] — used only by ldapSchema/localSchema
import { generateId } from 'better-auth'; // [METHOD: LDAP] — used only by ldapLoginAction
import { auth } from '@/lib/auth'; // [METHOD: LOCAL] — used only by localLoginAction
import { prisma } from '@/lib/prisma';
import { ldapBind } from '@/lib/ldap'; // [METHOD: LDAP] — remove if LDAP not enabled
// [METHOD: LDAP] — remove with the enrichment below when the project has no
// central employee directory to read from
import { directoryUserFields, getDirectoryPerson } from '@/lib/directory';
import { env } from '@/lib/env';

// ─── Schemas ── [METHOD: LDAP|LOCAL] ─────────────────────────────────────────

// [METHOD: LDAP]
const ldapSchema = z.object({
  username: z.string().min(1, 'AD_USERNAME_REQUIRED'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});

// [METHOD: LOCAL]
const localSchema = z.object({
  email: z.email('EMAIL_INVALID'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});

// ─── Cookie naming ───────────────────────────────────────────────────────────
// Derive cookie prefix from NEXT_PUBLIC_BASE_PATH — MUST stay in sync with
// lib/auth.ts (advanced.cookiePrefix) and proxy.ts (getSessionCookie call).
// This makes the session cookie name unique per app on the same domain, preventing
// cross-app cookie collisions that cause ERR_TOO_MANY_REDIRECTS redirect loops.
const APP_COOKIE_PREFIX = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';
// Better Auth uses the __Secure- prefix when BETTER_AUTH_URL starts with https://.
// This MUST match what Better Auth computes internally — otherwise auth.api.getSession()
// cannot find the cookie (even though proxy's getSessionCookie() tries both names).
// Source: node_modules/better-auth/dist/cookies → createCookieGetter()
const SESSION_COOKIE_NAME = (env.BETTER_AUTH_URL ?? '').startsWith('https://')
  ? `__Secure-${APP_COOKIE_PREFIX}.session_token`
  : `${APP_COOKIE_PREFIX}.session_token`;

// Single source of truth for the cookie Secure attribute — MUST match the cookie
// NAME above: a __Secure- prefixed cookie set without the Secure attribute is
// silently rejected by the browser. Never derive `secure` from NODE_ENV.
const SECURE_COOKIE = SESSION_COOKIE_NAME.startsWith('__Secure-');

// ─── Cookie signing ──────────────────────────────────────────────────────────
// [METHOD: LDAP] — only the LDAP flow creates sessions outside Better Auth.
// Better Auth stores session tokens as HMAC-signed cookies:
// cookie_value = `${rawToken}.${base64(HMAC-SHA256(secret, rawToken))}`
// This must be replicated when creating sessions outside Better Auth (LDAP login).

async function signSessionToken(token: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(token));
  const sig = btoa(String.fromCodePoint(...new Uint8Array(sigBytes)));
  return `${token}.${sig}`;
}

// ─── Rate limiting ───────────────────────────────────────────────────────────
// [METHOD: LDAP|LOCAL] — used only by ldapLoginAction / localLoginAction.
// Simple in-memory limiter for the custom login Server Actions (the Better Auth
// endpoints already use rateLimit.storage='database'). For multi-instance
// deployments move this to a shared store (Redis / database).

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const g = globalThis as typeof globalThis & { _authRateLimit?: Map<string, RateLimitEntry> };
const rateLimitStore: Map<string, RateLimitEntry> =
  g._authRateLimit ?? (g._authRateLimit = new Map());

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

// ─── Request metadata + audit logging ────────────────────────────────────────

async function getRequestMeta(): Promise<{ ip: string; userAgent: string }> {
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown';
  const userAgent = headersList.get('user-agent') ?? 'unknown';
  return { ip, userAgent };
}

// Non-blocking — never throw; audit failure must not interrupt auth flow.
async function logAuthEvent(
  action: string,
  userId: string,
  detail: Record<string, unknown>
): Promise<void> {
  await prisma.activityLog
    .create({ data: { userId, action, detail: JSON.stringify(detail) } })
    .catch(() => {});
}

// ─── LDAP Login ──────────────────────────────────────────────────────────────
// [METHOD: LDAP] — delete this action if LDAP login is not enabled.

export async function ldapLoginAction(values: {
  username: string;
  password: string;
}): Promise<{ code: string } | void> {
  const parsed = ldapSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }

  const { username, password } = parsed.data;

  // Security: rate-limit by IP — max 10 attempts per 15 minutes (brute-force prevention)
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`ldap:${ip}`, 10, 15 * 60 * 1000)) {
    return { code: 'TOO_MANY_ATTEMPTS' };
  }

  // 1. Validate credentials via LDAP bind
  let ldapUser;
  try {
    ldapUser = await ldapBind(username, password);
  } catch {
    await logAuthEvent('login.failed', 'anonymous', { authType: 'ldap', username, ip, userAgent });
    return { code: 'INVALID_AD_CREDENTIALS' };
  }

  // 2. Upsert user in DB, enriched from the central employee directory.
  // AD ให้แค่ displayName กับอีเมล — รหัสพนักงาน หน่วยงาน ตำแหน่ง หัวหน้า
  // อยู่ในฐานพนักงานกลาง เติมทุกครั้งที่ login สำเนาในตารางจะได้ไม่ค้างเก่า
  // (คืน null เมื่อ linked server ล่ม — login ต้องไม่พังตามไปด้วย)
  const person = await getDirectoryPerson(username);
  const directoryFields = directoryUserFields(person);

  const user = await prisma.user.upsert({
    where: { ldapUsername: username },
    update: {
      authType: 'ldap', // always update — reflects last login method
      name: ldapUser.displayName,
      email: ldapUser.email,
      ...directoryFields,
    },
    create: {
      ldapUsername: username,
      authType: 'ldap',
      name: ldapUser.displayName,
      email: ldapUser.email,
      emailVerified: true,
      ...directoryFields,
    },
  });

  // 3. Create session directly in DB (Better Auth compatible)
  // MUST match auth.ts session.expiresIn (8 hours)
  const sessionToken = generateId(32);
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  await prisma.session.create({
    data: {
      token: sessionToken,
      userId: user.id,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 4. Set signed session cookie (Better Auth expects HMAC-signed tokens)
  // Use SESSION_COOKIE_NAME which includes __Secure- prefix for https:// URLs
  const cookieStore = await cookies();
  const signedToken = await signSessionToken(sessionToken, env.BETTER_AUTH_SECRET);
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE_COOKIE, // MUST match cookie name — never NODE_ENV (see SECURE_COOKIE above)
    expires: expiresAt,
    path: '/',
  });

  // 5. Audit log — login success (OWASP A09)
  await logAuthEvent('login.success', user.id, { authType: 'ldap', ip, userAgent });
}

// ─── Local Login ─────────────────────────────────────────────────────────────
// [METHOD: LOCAL] — delete this action if local email/password login is not enabled.

export async function localLoginAction(values: {
  email: string;
  password: string;
}): Promise<{ code: string } | void> {
  const parsed = localSchema.safeParse(values);
  if (!parsed.success) {
    return { code: parsed.error.issues[0]?.message ?? 'INVALID_INPUT' };
  }

  // Security: rate-limit by IP — max 10 attempts per 15 minutes (brute-force prevention)
  const { ip, userAgent } = await getRequestMeta();
  if (!checkRateLimit(`local:${ip}`, 10, 15 * 60 * 1000)) {
    return { code: 'TOO_MANY_ATTEMPTS' };
  }

  // NOTE: the method is auth.api.signInEmail(...) — auth.api.signIn.email(...) does NOT exist.
  const result = await auth.api.signInEmail({
    body: { email: parsed.data.email, password: parsed.data.password },
    asResponse: true,
  });

  if (!result.ok) {
    await logAuthEvent('login.failed', 'anonymous', {
      authType: 'local',
      email: parsed.data.email,
      ip,
      userAgent,
    });
    return { code: 'INVALID_LOCAL_CREDENTIALS' };
  }

  // Forward Set-Cookie from the Better Auth response to the browser.
  // The value in the Set-Cookie header is already URL-encoded by Better Auth
  // (format: rawToken.base64sig%3D). Decode it before passing to
  // cookieStore.set so Next.js doesn't double-encode it.
  const cookieStore = await cookies();
  const setCookieHeader = result.headers.get('set-cookie');
  if (setCookieHeader) {
    const [nameValue] = setCookieHeader.split(';');
    const eqIdx = nameValue.indexOf('=');
    const name = nameValue.slice(0, eqIdx).trim();
    const encodedValue = nameValue.slice(eqIdx + 1).trim();
    const value = decodeURIComponent(encodedValue); // decode before Next.js re-encodes
    cookieStore.set(name, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE_COOKIE, // MUST match cookie name — never NODE_ENV (see SECURE_COOKIE above)
      maxAge: 8 * 60 * 60, // 8 hours — MUST match auth.ts session.expiresIn
      path: '/',
    });
  }

  // Audit log — login success (OWASP A09)
  const userRecord = await prisma.user
    .findUnique({ where: { email: parsed.data.email }, select: { id: true } })
    .catch(() => null);
  if (userRecord) {
    // Update authType to reflect last login method
    await prisma.user
      .update({ where: { id: userRecord.id }, data: { authType: 'local' } })
      .catch(() => {});
    await logAuthEvent('login.success', userRecord.id, { authType: 'local', ip, userAgent });
  }
}

// ─── Cookie clearing (shared by both logout actions) ─────────────────────────
// IMPORTANT: must use cookieStore.set() with maxAge:0 instead of cookieStore.delete().
// cookies().delete() does NOT include the Secure flag on the Set-Cookie response header.
// For __Secure- prefixed cookies the browser REQUIRES Secure to be present —
// without it the browser silently ignores the deletion and the cookie persists.

async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  const isSecure = SECURE_COOKIE;
  const clearAttrs = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    maxAge: 0,
    path: '/',
  };

  cookieStore.set(SESSION_COOKIE_NAME, '', clearAttrs);

  // Also clear the session_data cache cookie that Better Auth may have set alongside
  // the session_token (used for the client-side session cache).
  const sessionDataCookie = isSecure
    ? `__Secure-${APP_COOKIE_PREFIX}.session_data`
    : `${APP_COOKIE_PREFIX}.session_data`;
  cookieStore.set(sessionDataCookie, '', clearAttrs);
}

// Delete the DB session for the current cookie and return its userId (or null).
async function deleteDbSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const signedToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!signedToken) return null;

  // Cookie value is URL-decoded signed format: `rawToken.base64sig`
  // Strip the HMAC signature to get the raw token stored in DB.
  const rawToken = signedToken.substring(0, signedToken.lastIndexOf('.'));
  if (!rawToken) return null;

  // Fetch userId before deleting (needed for audit log)
  const sessionRecord = await prisma.session
    .findFirst({ where: { token: rawToken }, select: { userId: true } })
    .catch(() => null);
  await prisma.session.deleteMany({ where: { token: rawToken } }).catch(() => {});
  return sessionRecord?.userId ?? null;
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const userId = await deleteDbSession();
  if (userId) {
    const { ip, userAgent } = await getRequestMeta();
    await logAuthEvent('logout', userId, { ip, userAgent });
  }

  await clearSessionCookies();
  redirect('/login');
}

// ─── SSO Logout (Keycloak) ───────────────────────────────────────────────────
// [METHOD: SSO] — delete this action if SSO is not enabled.
// Clears the local session then invalidates the Keycloak SSO session via
// backchannel logout (server-side POST) — the browser never gets redirected
// through Keycloak, it goes directly to /login.

export async function ssoLogoutAction(): Promise<void> {
  const userId = await deleteDbSession();
  if (userId) {
    const { ip, userAgent } = await getRequestMeta();
    await logAuthEvent('logout.sso', userId, { ip, userAgent });
  }

  // Backchannel logout: POST directly to Keycloak — no browser redirect.
  // Uses the stored refresh_token to identify the session to revoke.
  // Non-fatal: if Keycloak is unreachable or token is already expired,
  // we still clear the local session and redirect to /login.
  if (userId && env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET) {
    const keycloakAccount = await prisma.account
      .findFirst({
        where: { userId, providerId: 'keycloak' },
        select: { refreshToken: true },
      })
      .catch(() => null);

    if (keycloakAccount?.refreshToken) {
      const logoutUrl = `${env.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;
      const body = new URLSearchParams({
        client_id: env.KEYCLOAK_CLIENT_ID,
        client_secret: env.KEYCLOAK_CLIENT_SECRET,
        refresh_token: keycloakAccount.refreshToken,
      });
      await fetch(logoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      }).catch(() => {});
    }
  }

  await clearSessionCookies();
  redirect('/login');
}
