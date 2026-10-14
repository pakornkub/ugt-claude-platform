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

Written for better-auth ≥1.7 (generic OAuth is a first-class social provider;
why 1.7.0 broke older installs → `troubleshooting-upgrades.md` §better-auth 1.7
migration note).

1. Client: `authClient.signIn.social({ provider: 'keycloak', callbackURL: `${basePath}${from}` })`
   (better-auth ≥1.7 — generic OAuth is a first-class social provider now, no
   client plugin and no `signIn.oauth2()`). `from` is the sanitized
   return-to-page path, `'/'` when absent (§Return-to-page below) — `callbackURL`
   must include the basePath explicitly, Better Auth knows nothing about it
2. Better Auth redirects the browser to Keycloak (OIDC Authorization Code + PKCE)
3. Keycloak redirects back to `${BETTER_AUTH_URL}${BASE_PATH}/api/auth/callback/keycloak`
   — the `redirectURI` in `lib/auth.ts` must include the basePath explicitly
4. `mapProfileToUser` resolves the existing row by `preferred_username` (=
   `ldapUsername`) and returns only the email — Better Auth stores no custom
   field from a provider profile (`input: false` fields are skipped too). No
   `preferred_username`/`sub` (Keycloak 25+: `sub` comes from the `basic`
   scope) → refused with `APIError('FOUND')` to `/login?error=sso_refused` — a
   plain `Error` here is a bare 500 on the callback
5. `accountLinking: { enabled: true, trustedProviders: ['keycloak'] }` links the SSO
   account to the existing row **of the same AD username** (an LDAP-first user).
   `mapProfileToUser` refuses when the email belongs to any other row not linked
   to this Keycloak subject (`accountId: profile.sub`) — a Local account on an org
   email, or another AD identity sharing the mail, is never linked into
   (`org-identity.md` §5)
6. `databaseHooks.session.create.after` runs — the **reliable** place to persist
   the directory fields and write the `login.success` audit log. It takes the AD
   login from `preferred_username` in the keycloak account's stored `idToken`
   (verified by Better Auth, rewritten on every SSO sign-in) and writes it onto
   `User.ldapUsername` when it differs — first login, AD rename and legacy
   email-derived values all converge. Never from the email. Missing, or already
   held by another row (P2002, logged) → `loginName: null`: no directory lookup,
   no pending role; the login itself continues.

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

The returned email goes through `toCanonicalEmail` (`ORG_EMAIL_DOMAINS`) for a new
identity; an existing row keeps its stored email for the lookup and the session
hook rewrites it canonical afterwards.

It pairs with `accountLinking.requireLocalEmailVerified: false` (also shipped
since 4.21.0) — users created by upsert/sync have `emailVerified: false`, and
Better Auth ≥1.6.11 silently blocks linking into unverified users even for
trusted providers (the failure just moves from `unable_to_create_user` to
`account_not_linked`). Relaxing it is safe in this kit only because
self-registration is closed and nothing pre-creates rows (มติ 2026-08-11 — the
2026-10-14 amendment pre-assigns roles in a separate table, not `User`), and
`mapProfileToUser` links only into the row of the same AD username.

**Conditional plugin registration**: the `keycloak()` helper calls `.replace()`
on the issuer string internally. During `SKIP_ENV_VALIDATION=1` builds the env
vars are `undefined` and the build crashes — always guard:

```ts
plugins: env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET
  ? [genericOAuth({ config: [{ ...keycloak({ ... }), ...keycloakEndpoints(env.KEYCLOAK_ISSUER) }] })]
  : [],
```

**Explicit endpoints, not discovery alone**: genericOAuth fetches
`.well-known/openid-configuration` once in `init`; a failed fetch logs
`Discovery fetch failed for "keycloak"` and drops the provider until the
process restarts — SSO answers `404 {"code":"PROVIDER_NOT_FOUND"}` while
`/api/health` stays green (the deploy looks fine). `keycloakEndpoints()` in
`lib/auth.ts` supplies Keycloak's fixed `/protocol/openid-connect/{auth,token,userinfo}`
so the provider always registers. Hit on one prod deploy while the dev deploy
of the same commit minutes earlier was fine — it is timing, not code.

## LDAP login flow (ldapLoginAction)

1. Rate-limit by IP (10 attempts / 15 min)
2. `ldapBind(username, password)` via `ldapts` — binds as **UPN**
   (`username@LDAP_DOMAIN`), then looks up **the account the bind authenticated**:
   `userPrincipalName=<that UPN>` first, `sAMAccountName=<typed>` only when no
   explicit UPN matches (AD's own resolution order) — exactly one entry or the
   login fails. Every later step keys on the directory's `sAMAccountName`, never
   the typed text. Filter values are **RFC-4515-escaped** (backslash first!)
   — do **not** enforce `ldaps://` in production: org AD servers on private
   networks (`ldap://10.x.x.x`) often support plain LDAP only, and a
   protocol check that throws **before** the bind surfaces as a misleading
   "Invalid username or password"
3. `prisma.user.upsert({ where: { ldapUsername: ldapUser.sAMAccountName } })`
4. `prisma.session.create({ token: generateId(32), userId, expiresAt })` —
   expiry MUST match `session.expiresIn` in `lib/auth.ts` (8h)
5. `signSessionToken()` → `cookieStore.set(SESSION_COOKIE_NAME, signedToken, …)`
6. Audit log `login.success` (and `login.failed` on bind failure)

Between 2 and 3: the AD email is moved onto the canonical org domain, and a row
holding that mailbox under another (or no) `ldapUsername` refuses the login with
`ORG_ACCOUNT_CONFLICT` instead of letting the upsert throw. After 3,
`afterOrgLogin()` applies a pre-assigned role / sends the no-role notice
(`org-identity.md`).

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
