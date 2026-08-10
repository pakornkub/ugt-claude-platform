---
paths:
  - "lib/auth.ts"
  - "lib/auth-client.ts"
  - "lib/ldap.ts"
  - "lib/permissions.ts"
  - "lib/get-user-permissions.ts"
  - "lib/actions/**"
  - "proxy.ts"
  - "app/api/auth/**"
  - "components/login-form.tsx"
  - "lib/password-policy.ts"
---

<!-- Owned by ugt-nextjs-auth-setup — may be overwritten wholesale on /plugin update. -->

# Auth / RBAC rules (loads when touching auth, guards, server actions)

## Cookie prefix — the single most common breakage

The session cookie name must be unique per app when several apps share one
domain. Derive it from `NEXT_PUBLIC_BASE_PATH` and keep it **identical across
all 3 files**:

| File | What uses the prefix |
| --- | --- |
| `lib/auth.ts` | `advanced.cookiePrefix` (Better Auth writes cookies with it) |
| `proxy.ts` | `getSessionCookie(request, { cookiePrefix })` |
| `lib/actions/auth.ts` | `SESSION_COOKIE_NAME` for the LDAP cookie set + both logout actions |

Mismatch = `ERR_TOO_MANY_REDIRECTS` in production (local never shows it because
http has no `__Secure-` prefix).

- `BETTER_AUTH_URL` on `https://` → Better Auth prepends `__Secure-` itself;
  your code must compute the same name
- **Never hardcode** the cookie name

## Better Auth APIs that get called wrong

- `auth.api.signInEmail(...)` — there is **no** `auth.api.signIn.email(...)`
- Logout: `cookieStore.set(name, '', { maxAge: 0, secure })` — **never**
  `cookieStore.delete()`: it omits the `Secure` flag so the browser silently
  refuses to delete `__Secure-` cookies (https only, so it escapes local testing)
- Deleting the DB session requires stripping the signature from the token first
  (`lastIndexOf('.')`) — the DB stores the raw token
- `decodeURIComponent` the cookie value from `Set-Cookie` before
  `cookieStore.set` (otherwise double-encoding → 404)
- Guard Keycloak plugin registration with `env.KEYCLOAK_* &&` or builds with
  `SKIP_ENV_VALIDATION=1` crash
- auth-client: pass no `baseURL`; pass the path via the `basePath` option and
  read `process.env.NEXT_PUBLIC_BASE_PATH` directly (reading through
  `createEnv()` yields undefined in the client bundle)

## Passwords (local accounts)

- Rules for length/complexity live **only** in `lib/password-policy.ts` — reset,
  change and admin-create all import it. A second regex somewhere else means the
  loosest form quietly becomes the system's real policy.
- `auth.api.requestPasswordReset(...)` in better-auth 1.5.x — `forgetPassword`
  is gone (it compiles, then fails at runtime).
- Build the mailed link from `token` + `NEXT_PUBLIC_BASE_PATH` yourself. Better
  Auth's own `url` omits the basePath, so it 404s in production only.
- "ลืมรหัสผ่าน" answers **the same message for every email**, real or not —
  anything else lets anyone test who has an account here.
- Reset is refused for `authType !== 'local'`: SSO/LDAP passwords belong to the
  directory, and a second local password beside it defeats the point.
- Reset and change both revoke the user's other sessions
  (`revokeSessionsOnPasswordReset`, `revokeOtherSessions`) — otherwise whoever
  the user was trying to lock out is still logged in.
- Changing a password always requires the current one.
- `/reset-password` stays public in `proxy.ts`.

## proxy.ts

- `url.pathname = '/login'` (app-relative) — `clone()` already carries the
  basePath; appending it yourself duplicates it
- Must bypass `/_next/` (else static assets get an HTML redirect →
  `Unexpected token '<'`) and `/api/health` (else the healthcheck bounces to
  `/login` → container never healthy)
- At the edge use `getSessionCookie()` (presence check only) —
  `auth.api.getSession()` needs the DB and is not edge-safe

## Privileged Server Actions — fixed order

```
1. session    → no session: return Unauthorized
2. permission → hasPermission(perms, PERMISSIONS.X) fails: return Forbidden
3. action     → domain checks, then the real work
4. audit log  → written after success (not before), non-blocking `.catch(() => {})`
```

- Permission keys are `resource:action` and come only from constants in `lib/permissions.ts`
- Load permissions server-side and pass as props — never call
  `getUserPermissions` from a Client Component
- **Hide** buttons the user lacks permission for (don't disable) — but UI is
  UX only; the action-level guard is the security boundary
- Roles with `isSystem: true` cannot be deleted through any code path

## Audit log

- Actions are `<resource>.<verb>` from constants · **never store
  passwords/secrets/tokens or over-broad PII in `detail`** (log readers usually
  outnumber data readers)
- `ActivityLogs` is append-only — no UPDATE/DELETE from app code
- login/logout writes must be non-blocking (an audit failure that breaks login
  is the worse failure)

## LDAP

- Use `ldapts` (never `ldapjs` — deprecated, no types)
- Bind as UPN (`user@DOMAIN`) and escape filters per RFC 4515 (backslash first)
- Self-created sessions must be HMAC-signed via Web Crypto before setting the
  cookie, or Better Auth rejects it → redirect loop
