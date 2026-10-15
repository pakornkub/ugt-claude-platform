# Auth Flows — Better Auth (org standard)

Deep reference for the cookie and session mechanics every login/logout flow
relies on, and the gotchas that were debugged into the templates. All code here
is already present in `assets/` — this file explains the *why*.

Contents: §How Better Auth signs cookies · §Cookie naming · §Logout flow (+ SSO
logout) · §Server Component session check · §proxy.ts basePath rules ·
§Troubleshooting. Split out by topic: `login-flows.md` (SSO, LDAP, Local
sign-in, Return-to-page) · `password-reset.md`.

## How Better Auth signs cookies

Better Auth stores session tokens as HMAC-signed cookies:

```
cookie_value = `${rawToken}.${base64(HMAC-SHA256(BETTER_AUTH_SECRET, rawToken))}`
```

When creating sessions **outside** Better Auth (the LDAP login action), you must
replicate this signing using Web Crypto:

```ts
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
```

If you skip this and set a raw unsigned token, `auth.api.getSession()` rejects
the cookie and every page redirects to `/login` in a loop.

## Cookie naming — the single most important invariant

Two independent prefixes combine into the session cookie name:

1. **App cookie prefix** — derived from `NEXT_PUBLIC_BASE_PATH`
   (`/__BASE_PATH__` → `__BASE_PATH__`; fallback `better-auth`). Set via
   `advanced.cookiePrefix` in `betterAuth({})`. **Why:** when two apps share one
   domain (e.g. `portal.example.com/app-a` and `portal.example.com/app-b`), both
   would otherwise create `better-auth.session_token` at `path=/`. The browser
   sends App A's cookie to App B → proxy sees a cookie (looks authenticated) →
   layout's HMAC check fails (different secret) → redirect `/login` → proxy sees
   the cookie again → **ERR_TOO_MANY_REDIRECTS**.
2. **`__Secure-` prefix** — Better Auth prepends it automatically when
   `BETTER_AUTH_URL` starts with `https://`. Your own code must compute the same
   name or it reads/writes the wrong cookie.

```ts
const APP_COOKIE_PREFIX = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';
const SESSION_COOKIE_NAME = (env.BETTER_AUTH_URL ?? '').startsWith('https://')
  ? `__Secure-${APP_COOKIE_PREFIX}.session_token`
  : `${APP_COOKIE_PREFIX}.session_token`;
```

**Must stay in sync across 3+ locations:**

| Location | What uses the prefix |
| --- | --- |
| `lib/auth.ts` | `advanced.cookiePrefix` (Better Auth writes cookies with it) |
| `proxy.ts` | `getSessionCookie(request, { cookiePrefix })` — omit it and authenticated users redirect-loop |
| `lib/actions/auth.ts` | `SESSION_COOKIE_NAME` for LDAP cookie set + both logout actions |
| any auth-guard layout that inspects the cookie | same `SESSION_COOKIE_NAME` derivation |

**Why `SESSION_COOKIE_NAME` is a local `const` re-derived in each file, never a
shared export**: `lib/actions/auth.ts` is a `'use server'` module — Next.js
enforces that every export from such a file is an async Server Action, so a
plain `const` (or a sync helper) cannot be exported from it. An installer that
tries to share the derivation via one export from `lib/actions/auth.ts` gets a
build failure with no obvious link to this rule (eval run 2026-09-11 rediscovered
it this way and split it into a new module instead of duplicating the four-line
derivation as intended). Duplicating the derivation is the correct fix — put it
in a plain (non-`'use server'`) helper module only if a project wants one shared
copy.

Historical failure modes this prevents:

- LDAP set `better-auth.session_token` (no `__Secure-`) but `auth.api.getSession()`
  looked for `__Secure-better-auth.session_token` → session never found → loop.
- Logout read/cleared the unprefixed name while SSO had set the `__Secure-` name
  → wrong cookie deleted → user stayed logged in.

## SSO login flow (Keycloak)

→ moved to `login-flows.md` §SSO login flow (Keycloak).

## LDAP login flow (ldapLoginAction)

→ moved to `login-flows.md` §LDAP login flow (ldapLoginAction).

## Local login flow (localLoginAction)

→ moved to `login-flows.md` §Local login flow (localLoginAction).

## Password reset flow — [METHOD: LOCAL], needs mail

→ moved to `password-reset.md`.

## Logout flow (logoutAction / ssoLogoutAction)

Cookie value = `rawToken.base64sig`; the DB stores only `rawToken`. Strip the
signature (`signedToken.substring(0, signedToken.lastIndexOf('.'))`) before
`prisma.session.deleteMany`.

**CRITICAL: use `cookieStore.set(name, '', { maxAge: 0, secure })` — never
`cookieStore.delete()`.** `cookies().delete()` sends `Set-Cookie` without the
`Secure` flag. The browser spec requires `Secure` when modifying `__Secure-`
prefixed cookies — without it the deletion is silently ignored and the user
stays logged in (production HTTPS only, so it escapes local testing).

Also clear the companion `session_data` cache cookie
(`${prefix}.session_data`, same `__Secure-` rule).

### SSO logout — Keycloak backchannel

`ssoLogoutAction` = local cleanup **plus** a server-side POST to Keycloak so the
SSO session dies too (otherwise the next visit silently re-logs-in):

```ts
POST {KEYCLOAK_ISSUER}/protocol/openid-connect/logout
Content-Type: application/x-www-form-urlencoded

client_id=...&client_secret=...&refresh_token=<from account row>
```

The `refresh_token` comes from `prisma.account` (`providerId: 'keycloak'`).
Non-fatal: if Keycloak is unreachable or the token expired, still clear the
local session and redirect to `/login`. The browser is never redirected through
Keycloak.

## Return-to-page (`?from=`) convention

→ moved to `login-flows.md` §Return-to-page (`?from=`) convention.

## Server Component session check

```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  // Differentiate: cookie present (server-invalidated) vs. absent (never logged in)
  const cookieStore = await cookies();
  const hasSessionCookie = !!cookieStore.get(SESSION_COOKIE_NAME);
  // x-from = current path+search (basePath-relative), forwarded by proxy.ts —
  // attach it so login returns the user here (`login-flows.md` §Return-to-page)
  const from = (await headers()).get('x-from') ?? '';
  const q = new URLSearchParams();
  if (hasSessionCookie) q.set('reason', 'session_expired');
  if (from && from !== '/') q.set('from', from);
  redirect(q.size > 0 ? `/login?${q}` : '/login');
}
```

In `proxy.ts` use `getSessionCookie()` (presence check only, no DB call) —
never `auth.api.getSession()`. Because it only proves a cookie exists, `proxy.ts`
may use it to send a cookie-less visitor **to** `/login`, but never to send a
visitor **away from** `/login`: that direction needs the real session, so it
lives in the login page (`const session = await auth.api.getSession(...);
if (session) redirect('/')`) — otherwise an expired cookie loops `/` ↔ `/login`. `proxy.ts` runs on the **Node.js runtime** on
every non-static request (a `runtime` config is not allowed in it), so a DB
round-trip there is latency on every navigation and makes a DB hiccup a
full-app outage.

## proxy.ts basePath rules

- `request.nextUrl.clone()` preserves basePath — assign **app-relative**
  pathnames only (`url.pathname = '/login'`). `basePath + '/login'` duplicates
  the basePath in the redirect URL.
- Keep the `/_next/` early return — without it the proxy intercepts JS/CSS
  chunks, returns an HTML redirect, and the browser throws
  `Uncaught SyntaxError: Unexpected token '<'`.

## Troubleshooting

The symptom → root cause → fix tables that used to close this file are split
by topic:

- `troubleshooting-session.md` — cookies, redirect loops, logout, basePath, `proxy.ts`
- `troubleshooting-sso.md` — Keycloak / genericOAuth / discovery / redirect URI / TLS, LDAP bind
- `troubleshooting-upgrades.md` — better-auth bumps (1.7 migration, twoFactor schema, `Account.issuer`), peer deps, kit re-syncs
