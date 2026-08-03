---
name: ugt-nextjs-auth-setup
description: >
  Use when a project needs login — "ใส่ระบบ login", "ต่อ SSO", "login ด้วย AD",
  "ใช้ Keycloak ของบริษัท", "ยังไม่มีระบบสมาชิก" — covering SSO (Keycloak OIDC),
  AD/LDAP bind, or local email/password via Better Auth, plus session cookies,
  protected-route guards in `proxy.ts`, RBAC roles/permissions, audit logging,
  the first-admin bootstrap page, and the ongoing `/admin/users` /
  `/admin/roles` / `/admin/audit-logs` management pages. Use it too for
  anything touching permissions ("ใครเห็นเมนูนี้ได้", "เพิ่ม role",
  "guard หน้านี้", "หน้าจัดการ user/role") since every privileged Server
  Action must follow session → permission → action → audit log.
  Reach for it immediately on these symptoms, which all have documented causes
  here: `ERR_TOO_MANY_REDIRECTS` after deploying behind a shared domain, login
  working locally but looping in production, logout that doesn't stick on https,
  static assets returning `Unexpected token '<'`, or Keycloak rejecting the
  redirect URI.
  Requires the database set up first (→ ugt-nextjs-database-setup). Not for CI
  (→ ugt-nextjs-cicd-setup).
---

# UGT Auth Setup — SSO / LDAP / Local + RBAC

## 1. Overview

This skill installs the org-standard login system into a project that has no
auth yet (including AI-generated projects). The installer **chooses the login
methods**:

| Method | Mechanism | Default |
| --- | --- | --- |
| **SSO** | Keycloak (OIDC + PKCE) via Better Auth `genericOAuth` | ✅ on |
| **LDAP** | direct AD bind via `ldapts` + self-created session (HMAC-signed) | optional |
| **Local** | Better Auth email/password (`signInEmail`) | optional |

Every method lands in **the same Better Auth + Prisma session**, with RBAC
(role → permission), a first-admin bootstrap page (`/admin/setup`), and the
ongoing admin pages to manage it afterward: `/admin/users` (list + assign
role), `/admin/roles` (CRUD + permission checkboxes), `/admin/audit-logs`
(read-only viewer).

Real code lives in `assets/` — adjust placeholders and copy straight into the
project. Deep detail lives in `references/`:

- `references/auth-flows.md` — every flow + every gotcha already debugged
  (**always read before touching auth code**)
- `references/rbac.md` — data model, guard pattern, bootstrap, adding permissions later
- `references/audit-logging.md` — action naming, write pattern, payload rules (PDPA), retention, viewer API
- `references/keycloak-client.md` — requesting/creating a Keycloak client for a new project

## 2. Org Standards

The org-wide contract:

1. **One Keycloak server for the whole org** — a central realm synced with AD;
   **each project gets its own client** (Client ID = project name); never share
   clients between projects
2. **OIDC Authorization Code + PKCE (S256)** only — no implicit / direct access grants
3. **Session: 8-hour lifetime, refresh when 30 minutes remain**
   (`expiresIn: 8h`, `updateAge: 30m`)
4. **Audit log every time**: `login.success` / `login.failed` / `logout` /
   `logout.sso` into the ActivityLogs table (non-blocking — must never throw and
   break login), and every privileged mutation writes an audit log after success
   — full rules (action naming, forbidden payloads, retention) in
   `references/audit-logging.md`
5. **RBAC shape**: `user (1)──(0..1) role (1)──(M:N) permission` — permission
   keys are `resource:action`, roles with `isSystem: true` cannot be deleted,
   every mutation guarded in the order **session → permission → action → audit log**
6. **Cookie-prefix rule**: when multiple apps deploy under one domain (shared
   domain + basePath), the session cookie name must be unique per app — derive
   the prefix from the basePath, or cookies collide → `ERR_TOO_MANY_REDIRECTS`
7. **SSO logout = delete the local session + backchannel logout to Keycloak**
   (POST with the refresh_token) — the browser is never redirected through Keycloak

## 3. Interview — ask the installer first (one batch)

Ask all of these **in a single message** before doing anything:

1. **Which login methods?** SSO / LDAP / Local (default: SSO only)
2. **Deployed under a basePath / shared domain?** If yes → what basePath (e.g. `/<base-path>`)
3. **[If SSO] Does a Keycloak client exist yet?**
   - exists → request `KEYCLOAK_ISSUER` / `CLIENT_ID` / `CLIENT_SECRET`
   - not yet → follow `references/keycloak-client.md` (the redirect URI must be known before requesting)
4. **[If LDAP] AD server details?** `LDAP_URL` (ldaps:// or not), `LDAP_BASE_DN`, `LDAP_DOMAIN`
5. **Who is the first admin?** (first person to log in visits `/admin/setup` and becomes Administrator with one click)

## 4. Prerequisite

**The database must be ready first** — via `ugt-nextjs-database-setup` (Prisma client +
`lib/prisma.ts` singleton + working migrate), because Better Auth stores
user/session/account in Prisma. If it isn't, stop and do the database first.

## 5. Setup steps

### 5.1 Dependencies

```bash
npm i better-auth zod
npm i ldapts          # [METHOD: LDAP] only — never ldapjs (deprecated, no types)
npx shadcn@latest init    # only if the project has no shadcn yet — creates components.json + lib/utils.ts (the cn() the login form uses)
npx shadcn@latest add button input label tabs card sonner   # login/setup forms
npx shadcn@latest add table select checkbox badge dialog    # the admin pages (users/roles/audit-logs)
```

Then mount `<Toaster richColors />` (from sonner) in the root layout
(`app/layout.tsx`) — otherwise `toast.*()` in the login form renders nothing.

### 5.2 Copy assets → project locations

| Asset | Destination | When |
| --- | --- | --- |
| `assets/lib-auth.ts` | `lib/auth.ts` | always |
| `assets/lib-auth-client.ts` | `lib/auth-client.ts` | always |
| `assets/lib-actions-auth.ts` | `lib/actions/auth.ts` | always (delete actions for unselected methods) |
| `assets/lib-ldap.ts` | `lib/ldap.ts` | LDAP only |
| `assets/route.ts` | `app/api/auth/[...all]/route.ts` | always |
| `assets/proxy.ts` | `proxy.ts` (root) | always — Next.js 16 uses `proxy.ts`, not `middleware.ts` |
| `assets/login-form.tsx` | `components/login-form.tsx` | always (delete sections for unselected methods) |
| `assets/lib-permissions.ts` | `lib/permissions.ts` | always |
| `assets/lib-permissions-sync.ts` | `lib/permissions-sync.ts` | always |
| `assets/lib-get-user-permissions.ts` | `lib/get-user-permissions.ts` | always |
| `assets/admin-setup/layout.tsx` | `app/(admin-setup)/layout.tsx` | always |
| `assets/admin-setup/page.tsx` | `app/(admin-setup)/admin/setup/page.tsx` | always |
| `assets/admin-setup/admin-setup-form.tsx` | `components/admin-setup-form.tsx` | always |
| `assets/admin-setup/admin-setup-action.ts` | `lib/actions/admin-setup.ts` | always |
| `assets/admin/layout.tsx` | `app/(admin)/layout.tsx` | always |
| `assets/admin/admin-nav.tsx` | `components/admin-nav.tsx` | always |
| `assets/admin/users-page.tsx` | `app/(admin)/admin/users/page.tsx` | always |
| `assets/admin/users-actions.ts` | `lib/actions/admin-users.ts` | always |
| `assets/admin/user-role-select.tsx` | `components/user-role-select.tsx` | always |
| `assets/admin/roles-page.tsx` | `app/(admin)/admin/roles/page.tsx` | always |
| `assets/admin/roles-actions.ts` | `lib/actions/admin-roles.ts` | always |
| `assets/admin/role-form.tsx` | `components/role-form.tsx` | always |
| `assets/admin/roles-manager.tsx` | `components/roles-manager.tsx` | always |
| `assets/admin/audit-logs-page.tsx` | `app/(admin)/admin/audit-logs/page.tsx` | always |
| `assets/env.example` | merge into `.env.example` + `.env.local` | always (drop vars for unselected methods) |

The login-method assets (`lib-auth.ts`, `lib-auth-client.ts`,
`lib-actions-auth.ts`, `login-form.tsx`, `env.example`) carry
`[METHOD: SSO|LDAP|LOCAL]` markers — delete every section (imports included)
belonging to methods that were not selected. The RBAC/admin assets
(`admin-setup/*`, `admin/*`) are method-agnostic — copy them as-is regardless
of which login methods were chosen.

### 5.3 Schema + migrate

1. Paste `assets/schema-auth.prisma` into `prisma/schema.prisma`
   (adjust `@db.NVarChar(Max)` if not MSSQL)
   > **Naming-rule exception**: Better Auth core tables (`User`, `Session`,
   > `Account`, `Verification`, `RateLimit`) map to **singular** names per the
   > library's own convention — an explicit exception to the org's
   > PascalCase-**plural** rule. Do not pluralize them.
2. Add project-specific custom fields on the `user` model at `// EXTENSION POINT:`
3. `npx prisma migrate dev --name auth-rbac`, then **must** run `npx prisma generate` immediately

### 5.4 Env schema (`lib/env.ts` or equivalent)

- `BETTER_AUTH_SECRET` → `z.string().min(32)` (required)
- `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS` → optional string
- `KEYCLOAK_ISSUER/CLIENT_ID/CLIENT_SECRET` → required only when SSO is on
  (the code in `lib/auth.ts` already guards `undefined` to survive `SKIP_ENV_VALIDATION=1`)
- `LDAP_URL/LDAP_BASE_DN/LDAP_DOMAIN` → required only when LDAP is on
- `NEXT_PUBLIC_BASE_PATH` → `z.string().default('')` — **must** live in the
  t3-env `client` block **and** be listed in `runtimeEnv` (otherwise undefined at runtime)
- `NEXT_PUBLIC_APP_NAME` → optional string (login-form.tsx displays it) — also
  in the `client` block + `runtimeEnv`

### 5.5 Wire the login page + guards

1. Create `app/(auth)/login/page.tsx` rendering
   `<LoginForm sessionExpired={reason === 'session_expired'} />`
2. Protected group layout (`app/(app)/layout.tsx`):
   `auth.api.getSession({ headers: await headers() })` → no session →
   `redirect('/login')` (distinguish `?reason=session_expired` when the cookie
   is still present — see `references/auth-flows.md`)
3. Logout buttons use `<form action={logoutAction}>` (SSO uses
   `ssoLogoutAction`) — never `signOut()` from the auth-client
4. First deployment: log in → visit `/admin/setup` → one click → Administrator
   role → redirects to `/admin/users`, which now really exists
5. `app/(admin)/layout.tsx` calls `syncPermissionsIfNeeded()` on every request
   into the admin section — if you add a permission to `ALL_PERMISSIONS` later,
   it reaches the database the next time anyone opens an admin page, no
   migration step needed (see `references/rbac.md`)

## 6. Placeholders used across the assets

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `<project-name>` | app slug / Keycloak Client ID — **also hidden in a fallback string in `login-form.tsx` (~line 181, flagged with a ⚠️ PLACEHOLDER comment); don't miss it** | `expense-portal` |
| `<base-path>` | Next.js basePath (no leading `/` when used as a cookie prefix) | `expense-portal` |
| `<keycloak-host>` | the org's central Keycloak host | — |
| `<realm>` | the org's central realm | — |
| `<ldap-host>` | AD server hostname | — |
| `<ad-base-dn>` | full AD base DN (one `DC=` per label) | `DC=example,DC=com` |
| `<company-domain>` | org email/UPN domain | `company.co.th` |
| `<app-host>` | the host the app actually deploys to | — |

## 7. Quick Rules — DO / DON'T

| DO ✅ | DON'T ❌ |
| --- | --- |
| Derive the cookie prefix from the basePath and keep it **identical in 3 places**: `lib/auth.ts` / `proxy.ts` / `lib/actions/auth.ts` | Leave the default `better-auth.` on a shared domain (→ `ERR_TOO_MANY_REDIRECTS`) |
| Compute `SESSION_COOKIE_NAME` from `BETTER_AUTH_URL` (https → `__Secure-` prefix) | Hardcode the cookie name |
| Log out with `cookieStore.set(name, '', { maxAge: 0, secure })` | `cookieStore.delete()` — omits the `Secure` flag; browsers refuse to delete `__Secure-` cookies |
| Guard Keycloak plugin registration with `env.KEYCLOAK_* &&` | Call `keycloak()` bare (build crashes under `SKIP_ENV_VALIDATION=1`) |
| `redirectURI` = `${BETTER_AUTH_URL}${BASE_PATH}/api/auth/oauth2/callback/keycloak` | Let Better Auth guess the redirect URI (no basePath) |
| `auth.api.signInEmail(...)` | `auth.api.signIn.email(...)` (that path doesn't exist) |
| `decodeURIComponent` the cookie value from `Set-Cookie` before `cookieStore.set` | Forward it raw (double-encode → 404) |
| LDAP: HMAC-sign the token via Web Crypto before setting the cookie | Set the raw token (Better Auth rejects → redirect loop) |
| LDAP: bind as UPN + escape filters per RFC 4515 | Concatenate filters from raw input (LDAP injection) |
| Use `ldapts` | `ldapjs` (deprecated, no types) |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` only in `.env.local`/`.env.dev` for internal-CA Keycloak/LDAP, local dev only | Uncomment it in `.env.example` by default, or in `.env`/the prod Jenkins credential (disables TLS verification for the whole process) |
| `rateLimit` model: `id String @id` + nullable `key String?` | `key` as `@id` (Better Auth v1 sends `id` → `Unknown argument 'id'`) |
| auth-client: no `baseURL`; pass the path via the `basePath` option and read `process.env.NEXT_PUBLIC_BASE_PATH` directly | Pass a URL with a path as `baseURL` / read via `createEnv()` in the client bundle |
| proxy: `url.pathname = '/login'` (app-relative) | `url.pathname = basePath + '/login'` (duplicates the basePath) |
| Delete DB sessions by the raw token (strip the signature first) | Delete by the signed token (never matches) |
| Block edit/delete of `role.isSystem` roles in `admin-roles.ts` | Let the Administrator role's permissions be edited away (locks out everyone) |
| Block a user changing their own role in `assignUserRoleAction` | Let an admin accidentally demote themselves with no one else to undo it |
| Call `syncPermissionsIfNeeded()` from `app/(admin)/layout.tsx` | Add to `ALL_PERMISSIONS` and forget the seed reaches the database |

## 8. Verification Checklist

**Run the script first** (cwd = target project root):

```bash
node <skill-dir>/scripts/verify.mjs
```

It checks leftover placeholders (including the one hidden in `login-form.tsx`),
unremoved `[METHOD: …]` markers, the cookie prefix across all 3 files, the
schema, and the commonly mis-called APIs — the rest must be exercised by hand:

- [ ] `npm run build` passes (and passes with `SKIP_ENV_VALIDATION=1` if SSO is on)
- [ ] Login works with every selected method, then protected pages are reachable
- [ ] Unselected methods are fully removed (login-form sections, actions, imports, env vars)
- [ ] Logout clears the cookie + the DB session + returns to `/login` (test on https too if possible)
- [ ] [SSO] after logout, clicking login again → must see the Keycloak page again (backchannel logout works)
- [ ] Visiting `/login` while logged in → bounces to the dashboard; a protected page without login → bounces to `/login`; API routes without a session → 401 JSON
- [ ] Static assets load (no `Unexpected token '<'` in the console)
- [ ] `/admin/setup` works: one click grants Administrator and redirects to
      `/admin/users`; revisiting `/admin/setup` redirects away
- [ ] `/admin/users`: the Administrator (or any user with `USERS_READ`) sees
      every user, and can reassign another user's role — but not their own
      (the dropdown is disabled on their own row)
- [ ] `/admin/roles`: create a role, check some permission boxes, save →
      appears in the list with the right permission count; edit and delete
      work on it; the `Administrator` (system) row has no edit/delete button
- [ ] A user assigned the new role can reach only what its permissions allow
      (both UI — the nav item is hidden — and the Server Action, which must
      still reject a direct call with the wrong permission)
- [ ] `/admin/audit-logs` shows the `roles.create` / `users.role-assign` rows
      from the steps above
- [ ] ActivityLogs has `login.success` / `logout` rows after testing
- [ ] Cookie prefix matches across `lib/auth.ts` / `proxy.ts` / `lib/actions/auth.ts` (grep `cookiePrefix\|APP_COOKIE_PREFIX`)
- [ ] With a basePath: the cookie name in DevTools starts with `<base-path>.` (or `__Secure-<base-path>.` on https)
- [ ] No real secrets / hostnames leaked into git (`.env.local` is gitignored)
