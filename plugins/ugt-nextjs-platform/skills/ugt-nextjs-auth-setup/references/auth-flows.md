# Auth Flows — Better Auth (org standard)

Deep reference for how every login/logout flow works and the gotchas that were
debugged into the templates. All code here is already present in `assets/` —
this file explains the *why*.

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

Historical failure modes this prevents:

- LDAP set `better-auth.session_token` (no `__Secure-`) but `auth.api.getSession()`
  looked for `__Secure-better-auth.session_token` → session never found → loop.
- Logout read/cleared the unprefixed name while SSO had set the `__Secure-` name
  → wrong cookie deleted → user stayed logged in.

## SSO login flow (Keycloak)

**Migration note (why the version is pinned `^1.7.1`):** better-auth 1.7.0
deleted `genericOAuthClient` from `better-auth/client/plugins` in a MINOR bump
— present through 1.6.14, gone in 1.7.0, so a caret range like `^1.6.0` floats
straight into the broken line. This was a deliberate rewrite, not a
regression: generic OAuth (the Keycloak SSO button) became a first-class
social provider — `authClient.signIn.social({ provider: 'keycloak' })`
replaces the removed `signIn.oauth2()`, no client plugin needed, and the
callback route moved from `/api/auth/oauth2/callback/:id` to
`/api/auth/callback/:id`. Every asset in this skill is already written for
≥1.7 — never pin below 1.7.1.

1. Client: `authClient.signIn.social({ provider: 'keycloak', callbackURL: `${basePath}${from}` })`
   (better-auth ≥1.7 — generic OAuth is a first-class social provider now, no
   client plugin and no `signIn.oauth2()`). `from` is the sanitized
   return-to-page path, `'/'` when absent (§Return-to-page below) — `callbackURL`
   must include the basePath explicitly, Better Auth knows nothing about it
2. Better Auth redirects the browser to Keycloak (OIDC Authorization Code + PKCE)
3. Keycloak redirects back to `${BETTER_AUTH_URL}${BASE_PATH}/api/auth/callback/keycloak`
   — the `redirectURI` in `lib/auth.ts` must include the basePath explicitly
4. `mapProfileToUser` maps `preferred_username` → `ldapUsername`, sets `authType: 'sso'`
5. `accountLinking: { enabled: true, trustedProviders: ['keycloak'] }` links the SSO
   account to an existing LDAP/local user with the same email (safe: the org
   Keycloak has already verified the email against the directory)
6. `databaseHooks.session.create.after` runs — the **reliable** place to persist
   custom user fields and write the `login.success` audit log. Do NOT rely on
   `mapProfileToUser` for custom fields: only standard fields (name, email, image)
   propagate via `overrideUserInfo`.

**Identity is the AD username, not the email.** Better Auth matches the
existing user by the email `mapProfileToUser` returns — but the AD email and
the HR/local email can drift apart (e.g. a company domain change), and then
Better Auth "creates" instead of "links" and dies on a unique constraint
(`unable_to_create_user`). Since 4.21.0 the shipped `lib/auth.ts` already does
this — `mapProfileToUser` looks up the existing row first and lets **its**
email win (keep the pattern intact when editing the file):

```ts
const existing = await prisma.user.findUnique({ where: { ldapUsername } });
return { email: existing?.email ?? profile.email, ldapUsername, ... };
```

It pairs with `accountLinking.requireLocalEmailVerified: false` (also shipped
since 4.21.0) — users created by upsert/sync have `emailVerified: false`, and
Better Auth ≥1.6.11 silently blocks linking into unverified users even for
trusted providers (the failure just moves from `unable_to_create_user` to
`account_not_linked`). Relaxing it is safe in this kit only because
self-registration is closed (มติ 2026-08-11) — no attacker can pre-create an
unverified row.

**Conditional plugin registration**: the `keycloak()` helper calls `.replace()`
on the issuer string internally. During `SKIP_ENV_VALIDATION=1` builds the env
vars are `undefined` and the build crashes — always guard:

```ts
plugins: env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET
  ? [genericOAuth({ config: [{ ...keycloak({ ... }) }] })]
  : [],
```

## LDAP login flow (ldapLoginAction)

1. Rate-limit by IP (10 attempts / 15 min)
2. `ldapBind(username, password)` via `ldapts` — binds as **UPN**
   (`username@LDAP_DOMAIN`), then searches `LDAP_BASE_DN` by `sAMAccountName`
   with **RFC-4515-escaped** filter value (backslash first!)
   — do **not** enforce `ldaps://` in production: org AD servers on private
   networks (`ldap://10.x.x.x`) often support plain LDAP only, and a
   protocol check that throws **before** the bind surfaces as a misleading
   "Invalid username or password"
3. `prisma.user.upsert({ where: { ldapUsername } })`
4. `prisma.session.create({ token: generateId(32), userId, expiresAt })` —
   expiry MUST match `session.expiresIn` in `lib/auth.ts` (8h)
5. `signSessionToken()` → `cookieStore.set(SESSION_COOKIE_NAME, signedToken, …)`
6. Audit log `login.success` (and `login.failed` on bind failure)

## Local login flow (localLoginAction)

Uses `auth.api.signInEmail()` — **NOT** `auth.api.signIn.email()` (that nested
path does not exist) — with `asResponse: true`, then manually forwards the
`Set-Cookie` header. Better Auth URL-encodes the cookie value; decode it before
`cookieStore.set` or Next.js double-encodes it and login lands on a 404:

```ts
const result = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
const setCookieHeader = result.headers.get('set-cookie');
if (setCookieHeader) {
  const [nameValue] = setCookieHeader.split(';');
  const eqIdx = nameValue.indexOf('=');
  const name = nameValue.slice(0, eqIdx).trim();
  const value = decodeURIComponent(nameValue.slice(eqIdx + 1).trim()); // ← critical
  cookieStore.set(name, value, { httpOnly: true, sameSite: 'lax', ... });
}
```

(`localLoginAction` never needs `SESSION_COOKIE_NAME` — it forwards whatever
name Better Auth produced.)

## Password reset flow — [METHOD: LOCAL], needs mail

Verified against **better-auth 1.5.4** (`dist/api/routes/password.mjs`); the
endpoint names moved, so older recipes do not apply:

| What | API | Note |
| --- | --- | --- |
| Ask for a link | `auth.api.requestPasswordReset({ body: { email, redirectTo } })` | the old `forgetPassword` name is **gone** in 1.5.x |
| Set the new password | `auth.api.resetPassword({ body: { token, newPassword } })` | token is deleted on success — single use |
| Change own password | `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions }, headers })` | needs the session headers |

Config in `lib/auth.ts` → `emailAndPassword`: `sendResetPassword` (required —
without it Better Auth answers `RESET_PASSWORD_DISABLED`),
`resetPasswordTokenExpiresIn` (seconds, default 3600), `onPasswordReset`
(post-success hook, the only place that still knows the user) and
`revokeSessionsOnPasswordReset: true`.

**Build the link yourself from `token`, not from the `url` Better Auth hands
you.** Its URL points at `${baseURL}/reset-password/:token?callbackURL=…`,
computed **without the Next.js basePath** — the same trap as the Keycloak
`redirectURI`. Under a basePath the mailed link 404s, and it 404s only in
production, where the basePath exists:

```ts
const resetUrl = `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH}/reset-password?token=${token}`;
```

Three rules the flow depends on:

- **Same answer for every email.** Existing, unknown, malformed — all return
  the same "if this email exists…". Anything else turns the form into a way to
  enumerate who has an account. Better Auth even burns matching time on a
  missing user to keep the timing equal; don't undo that by answering earlier.
- **SSO/LDAP accounts are refused** (logged as `password.reset.refused`).
  Their password lives in the directory; letting the app set one would create a
  second credential that bypasses it.
- **`/reset-password` must be public** in `proxy.ts` — someone who cannot log
  in cannot reach a protected page.

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

Every path into `/login` carries the page the user was trying to reach, so a
successful login lands back there instead of on the dashboard:

- **`proxy.ts`** (no cookie → redirect): `?from=<pathname+search>`
- **Protected layout** (cookie present but session invalid): `?from=` read from
  the **`x-from` request header** that `proxy.ts` forwards — a server component
  cannot see its own URL any other way (snippet below)
- **`SessionExpiredDialog`** (mid-page 401): appends
  `&from=<encodeURIComponent(pathname+search)>` with the basePath stripped

Three rules keep it consistent and safe:

1. **`from` is always basePath-relative** (`/orders/7`, never
   `/expense-portal/orders/7`). The producers above strip the basePath; the
   consumers add it back where needed — `router.push(from)` is basePath-aware
   already, SSO builds `callbackURL: `${basePath}${from}``.
2. **`login-form.tsx` validates before every use** (`sanitizeFrom`): must start
   with `/`, must not start with `//` (protocol-relative URL) or `/\`
   (browsers normalize backslash to `/`). Anything else falls back to `'/'`.
   `?from=` arrives via searchParams — an attacker can mail
   `/login?from=https://evil.example` — so skipping this check is an **open
   redirect** (OWASP A01). Validation lives at the consumer because the
   producers aren't the only source of the param.
3. **All three login methods honor it**: SSO via `callbackURL`, LDAP/local via
   `router.push(from)` after the action succeeds.

## Server Component session check

```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session) {
  // Differentiate: cookie present (server-invalidated) vs. absent (never logged in)
  const cookieStore = await cookies();
  const hasSessionCookie = !!cookieStore.get(SESSION_COOKIE_NAME);
  // x-from = current path+search (basePath-relative), forwarded by proxy.ts —
  // attach it so login returns the user here (§Return-to-page above)
  const from = (await headers()).get('x-from') ?? '';
  const q = new URLSearchParams();
  if (hasSessionCookie) q.set('reason', 'session_expired');
  if (from && from !== '/') q.set('from', from);
  redirect(q.size > 0 ? `/login?${q}` : '/login');
}
```

In `proxy.ts` use `getSessionCookie()` (presence check only, no DB call) —
never `auth.api.getSession()`. Since Next.js 16 this file runs on the **Node.js
runtime** (a `runtime` config is not allowed in it), so "not Edge-safe" is no
longer the reason — the reason is that it runs on every non-static request: a DB
round-trip there is latency on every navigation and makes a DB hiccup a
full-app outage.

## proxy.ts basePath rules

- `request.nextUrl.clone()` preserves basePath — assign **app-relative**
  pathnames only (`url.pathname = '/login'`). `basePath + '/login'` duplicates
  the basePath in the redirect URL.
- Keep the `/_next/` early return — without it the proxy intercepts JS/CSS
  chunks, returns an HTML redirect, and the browser throws
  `Uncaught SyntaxError: Unexpected token '<'`.

## Gotcha quick table

| Symptom | Root cause | Fix |
| --- | --- | --- |
| Every page redirects to `/login` after LDAP login | Wrong cookie name (missing `__Secure-`/app prefix) or unsigned token | `SESSION_COOKIE_NAME` derivation + `signSessionToken()` |
| Redirect loop only in production | `https://` switched cookie to `__Secure-` name | Same derivation, driven by `BETTER_AUTH_URL` |
| `ERR_TOO_MANY_REDIRECTS` with two apps on one domain | Identical cookie names at `path=/` | `advanced.cookiePrefix` from basePath, mirrored in proxy + actions |
| Logout doesn't stick in production | `cookieStore.delete()` omits `Secure` flag | `set(name, '', { maxAge: 0, secure: true })` |
| Login lands on 404 after local login | Double URL-encoding of cookie value | `decodeURIComponent` before `cookieStore.set` |
| Logout doesn't delete DB session | Deleting by signed token; DB stores raw token | Strip signature via `lastIndexOf('.')` |
| Build crashes with `SKIP_ENV_VALIDATION=1` | `keycloak()` helper runs `.replace()` on undefined issuer | Conditional plugin registration guard |
| `Unknown argument 'id'` from Better Auth rate limit | `rateLimit` model used `key` as `@id` | `id String @id` + nullable `key` (see schema template) |
| SSO shows "Invalid OAuth configuration", or server log has `fetch failed` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | Node can't verify internal CA cert on Keycloak host | Trust the CA in the runtime (`NODE_EXTRA_CA_CERTS`); last resort `NODE_TLS_REJECT_UNAUTHORIZED=0` in the container — decision is the admin's, see `docs/admin-handoff.md` §4 |
| authClient hits `…/__BASE_PATH__/get-session` 404 | `baseURL` passed to `createAuthClient` with a path | No `baseURL`; pass `basePath: `${BASE_PATH}/api/auth`` |
| `NEXT_PUBLIC_BASE_PATH` empty in client bundle | Read through a `createEnv()` wrapper under Turbopack | Read `process.env.NEXT_PUBLIC_BASE_PATH` directly in client files |
| SSO fails `unable_to_create_user` for users that already exist | AD email drifted from stored email (e.g. `@company.com` in AD vs `@company.co.th` in the row) → Better Auth "creates" and hits a unique constraint | Resolve the existing row by `ldapUsername` in `mapProfileToUser`; its email wins — **shipped in `lib/auth.ts` since 4.21.0** |
| SSO fails `unable_to_create_user` on a genuinely new user | Keycloak profile has no email (client missing the `email` scope, or the AD account has no mail attribute) — or the DB write itself failed | `mapProfileToUser` throws a findable message for the no-email case (4.21.0); for the rest, the real cause is in `onAPIError.onError`'s log — read `docker logs <container>` first, never guess |
| SSO fails `account_not_linked` despite `trustedProviders` | Local user has `emailVerified: false` (created by sync/upsert) — better-auth ≥1.6.11 blocks implicit linking into unverified rows (nOAuth fix) | `accountLinking.requireLocalEmailVerified: false` — safe here only because self-registration is closed (มติ 2026-08-11); shipped in `lib/auth.ts` since 4.21.0 |
| Auth error shows a bare proxy 404 (`/api/auth/error` Not Found) instead of any message | Better Auth's default error page URL is computed WITHOUT the Next.js basePath — same trap as redirectURI and the reset link | `onAPIError.errorURL: `${NEXT_PUBLIC_BASE_PATH}/login`` — the login page maps `?error=<code>` to a Thai toast; shipped in `lib/auth.ts` since 4.21.0 |
| LDAP always "Invalid username or password" on prod, works in dev | An `ldaps://`-only guard throws before the bind attempt | Allow plain `ldap://` for private-network AD; let the bind itself decide |
