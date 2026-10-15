# Login flows — SSO (Keycloak), LDAP, Local, and the return-to-page convention

How each sign-in path works step by step and why — moved out of `auth-flows.md`, which keeps the cookie/session mechanics every flow relies on (signing, naming, logout, guards). All code is already in `assets/`.

Contents: §SSO login flow (Keycloak) · §LDAP login flow (ldapLoginAction) · §Local login flow (localLoginAction) · §Return-to-page (`?from=`) convention. Password reset → `password-reset.md`.

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
