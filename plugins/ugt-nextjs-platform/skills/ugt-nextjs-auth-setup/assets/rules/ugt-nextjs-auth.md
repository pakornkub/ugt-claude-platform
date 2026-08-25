---
paths:
  - "lib/auth.ts"
  - "lib/auth-client.ts"
  - "lib/ldap.ts"
  - "lib/permissions.ts"
  - "lib/permissions-sync.ts"
  - "lib/permission-group-select.ts"
  - "lib/get-user-permissions.ts"
  - "lib/actions/**"
  - "proxy.ts"
  - "app/api/auth/**"
  - "app/(admin)/**"
  - "app/(admin-setup)/**"
  - "components/login-form.tsx"
  - "components/nav-user.tsx"
  - "components/admin-nav.tsx"
  - "components/roles-manager.tsx"
  - "components/role-form.tsx"
  - "components/users-table.tsx"
  - "components/audit-logs-table.tsx"
  - "components/admin-user-actions.tsx"
  - "components/user-role-select.tsx"
  - "components/change-password-dialog.tsx"
  - "components/forgot-password-dialog.tsx"
  - "components/reset-password-form.tsx"
  - "components/admin-setup-form.tsx"
  - "lib/password-policy.ts"
  - "lib/directory.ts"
  - "lib/scope.ts"
  - "lib/approval-chain.ts"
---

<!-- Owned by ugt-nextjs-auth-setup — may be overwritten wholesale on /plugin update. -->

# Auth / RBAC rules (loads when touching auth, guards, server actions)

## Admin UI — Base UI (base-mira) + design agreement

The admin pages/components in this list are kit UI. Two rules that already
shipped as bugs once (4.25.0):

- **Base UI API, never Radix**: triggers `render={<X />}` · menu items
  `onClick` (Radix's `asChild`/`onSelect` are ignored silently — the button
  renders and does nothing) · checkbox tri-state = `checked` boolean +
  `indeterminate` prop.
- **DESIGN.md applies here too**: destructive → `ConfirmActionDialog`
  (never `window.confirm`) · row buttons → `IconAction` + `soft-*` ·
  page headers → `ui/page-shell` (title + subtitle) · long checklists →
  `Sheet`, not a fixed-height Dialog.
- **Permission keys ship in pairs**: a key in `PERMISSIONS` must have its
  `ALL_PERMISSIONS` seed entry (and vice versa) — a key without a seed can
  never be granted; a seed without a consumer is a checkbox that does nothing.

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

- **No sign-up page, ever.** `emailAndPassword.enabled` publishes
  `POST /api/auth/sign-up/email`, so `disableSignUp: true` closes it. Accounts
  come from `/admin/users` (USERS_CREATE + audit) or, for the very first one on
  a local-only project, `scripts/create-first-user.ts`.
- Admin-created accounts write the `user` + `credential` account rows in one
  transaction with `hashPassword` from `better-auth/crypto`. Do **not** reach
  for `auth.api.signUpEmail`: `disableSignUp` blocks it too, and it issues a
  session for the account just created.
- An admin who resets someone's password must tell them to change it — for a
  while two people know one credential, and the audit log
  (`users.password-set`) is the only thing that records who.

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

## Data scope — permission says "may they", scope says "whose data"

Any route, page or Server Action that accepts a **record-owner id from the
client** (`?empCode=`, a body field, a hidden input) must resolve scope and
check it. A permission check alone lets an authenticated user read a colleague's
rows by editing a query param.

```ts
const scope = await resolveDataScope(session.user.id, PERMISSIONS.X_READ_ALL);
if (!isEmpCodeAllowed(scope, empCode)) return notFound();      // one record
const rows = await prisma.x.findMany({ where: scopeWhere(scope) }); // a list
```

- Both must come from the **same** scope object; a list filtered one way and a
  detail page checked another leaves a gap nothing on screen reveals.
- Out of scope → **404**, never 403 (403 confirms the id exists).
- `isSelf` means `session.empCode === record.empCode` — never `!viewAll`, which
  strips a read-all user of the buttons on their own record.
- An account with no linked `empCode` sees nothing. `scopeWhere` returns
  `{ in: [] }` — zero rows, not all rows.

## Approval chain

`lib/approval-chain.ts` reads the org **approval-chain view** (one row per step,
`EmpCode` + `Seq`). That is not the same thing as `superEmpCode` on the employee
view, which is only the denormalized direct supervisor — use that one for team
scope, never for routing an approval.

**It rethrows on failure, on purpose.** Returning `[]` when the query fails
means the request saves with nobody to approve it: the user is told "submitted",
and it sits there until someone chases it weeks later. Failing at the click is
far cheaper. Callers must also distinguish `[]` (no chain configured → tell them
to contact HR) from a thrown error (system down → tell them to retry).

## Directory fields (employee code, department, position, supervisor)

SSO and LDAP answer only "who are you". Everything else comes from the org
employee view over a linked server — `lib/directory.ts`.

- The `user` row is a **cache, not the source**. Never let the app edit those
  columns; the next login overwrites them anyway.
- Refresh on **every** login, from the one shared helper, on both paths
  (`ldapLoginAction` and the SSO `session.create.after` hook). Filling them once
  at signup leaves the data frozen at someone's first day.
- SSO must enrich in the session hook — Better Auth drops custom fields returned
  from `mapProfileToUser`.
- Lookups return `null` on failure and never throw: an HR-server outage must not
  become "nobody can log in".
- SELECT only. `Prisma.raw` is for the view name and column list (constants)
  — never for anything a user supplied.

## proxy.ts

- `url.pathname = '/login'` (app-relative) — `clone()` already carries the
  basePath; appending it yourself duplicates it
- Must bypass `/_next/` (else static assets get an HTML redirect →
  `Unexpected token '<'`) and `/api/health` (else the healthcheck bounces to
  `/login` → container never healthy)
- In `proxy.ts` use `getSessionCookie()` (presence check only) — never
  `auth.api.getSession()`. Not because of the runtime (since Next.js 16 this
  file runs on Node.js), but because it runs on **every** request: a DB
  round-trip there is latency on every navigation and turns a DB hiccup into a
  full outage. The real session check belongs in the layout/Server Action
- `export const config` is the only export name Next.js reads for the matcher —
  renaming it silently disables route protection

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
