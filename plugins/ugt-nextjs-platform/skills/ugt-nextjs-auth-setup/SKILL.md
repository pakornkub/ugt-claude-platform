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
  Covers the whole local-account lifecycle too — "ลืมรหัสผ่าน", "รีเซ็ตรหัสผ่าน",
  "เปลี่ยนรหัสผ่านเอง", "ตั้งกฎความยาวรหัสผ่าน" — password-reset links by email,
  the reset page, self-service change-password, and the one shared password
  policy (the reset link needs ugt-nextjs-mail-setup installed).
  Reach for it immediately on these symptoms, which all have documented causes
  here: `ERR_TOO_MANY_REDIRECTS` after deploying behind a shared domain, login
  working locally but looping in production, logout that doesn't stick on https,
  static assets returning `Unexpected token '<'`, Keycloak rejecting the
  redirect URI, or a mailed reset link that 404s under a basePath.
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
| **Local** | Better Auth email/password (`signInEmail`) + reset/change password | optional |

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
   `logout.sso` — plus, for local accounts, `password.reset.requested` /
   `password.reset` / `password.reset.refused` / `password.change` /
   `password.change.failed` — into the ActivityLogs table (non-blocking — must never throw and
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
8. **[Local] One password policy, one file** (`lib/password-policy.ts`) shared by
   reset · change · admin-create; a reset link is **single-use, 1 hour**, sent
   only to `authType === 'local'` accounts, and answers identically whether or
   not the email exists; every password change revokes the user's other sessions

## 3. Interview — ask the installer first (one batch)

Ask all of these **in a single message** before doing anything:

1. **Which login methods?** SSO / LDAP / Local (default: SSO only)
2. **Deployed under a basePath / shared domain?** If yes → what basePath (e.g. `/__BASE_PATH__`)
3. **[If SSO] Does a Keycloak client exist yet?**
   - exists → request `KEYCLOAK_ISSUER` / `CLIENT_ID` / `CLIENT_SECRET`
   - not yet → follow `references/keycloak-client.md` (the redirect URI must
     be known before requesting) — and **render the request as a project
     file `docs/admin-handoff.md`** (Thai, real substituted values, the
     settings table + exact redirect URIs + a fill-in "ค่าที่ต้องส่งกลับ"
     section for `KEYCLOAK_ISSUER`/`CLIENT_SECRET`) so the user forwards a
     file to the Keycloak admin, not a chat snippet. If
     `docs/admin-handoff.md` already exists (e.g. cicd-setup wrote it),
     update its Keycloak section instead of overwriting the file.
4. **[If LDAP] AD server details?** `LDAP_URL` (ldaps:// or not), `LDAP_BASE_DN`, `LDAP_DOMAIN`
5. **Who is the first admin?** (first person to log in visits `/admin/setup` and becomes Administrator with one click)
6. **[If Local] Is `ugt-nextjs-mail-setup` installed?**
   - yes → password reset by email is installed (forgot dialog + `/reset-password`)
   - no → say plainly that **"ลืมรหัสผ่าน" cannot exist without it**, and that
     the only recovery path is an admin resetting the password by hand. Offer to
     run mail-setup first. Never install the button without the mail behind it —
     Better Auth answers `RESET_PASSWORD_DISABLED` and the user gets a dead form.
   - Self-service **change password** works either way (no email involved).

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

Assets mirror their destinations — **copy the `assets/` tree straight onto the
project root** (`assets/lib/auth.ts` → `lib/auth.ts`, `assets/app/(admin)/…` →
`app/(admin)/…`, `assets/components/…` → `components/…`, `assets/proxy.ts` →
`proxy.ts`; Next.js 16 uses `proxy.ts`, not `middleware.ts`), then handle the
exceptions:

| Asset | Destination | Note |
| --- | --- | --- |
| `assets/prisma/schema-auth.prisma` | paste INTO `prisma/schema.prisma` | not a whole-file copy — see §5.3 |
| `assets/env.example` | merge into `.env.example` + `.env.local` | drop vars for unselected methods |
| `assets/rules/ugt-nextjs-auth.md` | `.claude/rules/ugt-nextjs-auth.md` | whole-file overwritable on plugin update |
| `assets/components/nav-user.tsx` | `components/nav-user.tsx` | needs `avatar`, `badge`, `dialog`, `dropdown-menu`, `sidebar` from shadcn + `ui/truncated-text` from the design kit |
| `assets/lib/ldap.ts` | `lib/ldap.ts` | copy only when LDAP selected |
| `assets/lib/password-policy.ts` · `assets/lib/actions/password.ts` | `lib/…` | Local only — the policy file is the single source for length/complexity, shared by reset · change · admin-create |
| `assets/components/change-password-dialog.tsx` | `components/…` | Local only; opened from NavUser, hidden for SSO/LDAP accounts |
| `assets/components/admin-user-actions.tsx` | `components/…` | Local only — **the only way a local account is ever created**; there is no sign-up page and there will not be one |
| `assets/scripts/create-first-user.ts` | `scripts/…` | Local only, run once — see §5.5 |
| `assets/components/forgot-password-dialog.tsx` · `assets/components/reset-password-form.tsx` | `components/…` | Local **and** mail-setup only — skip both when there is no mail |

The login-method assets (`lib/auth.ts`, `lib/auth-client.ts`,
`lib/actions/auth.ts`, `components/login-form.tsx`, `env.example`) carry
`[METHOD: SSO|LDAP|LOCAL]` markers — delete every section (imports included)
belonging to methods that were not selected. The RBAC/admin assets
(`app/(admin-setup)/**`, `app/(admin)/**`, the admin components, and
`lib/actions/admin-*.ts`) are method-agnostic — copy them as-is regardless
of which login methods were chosen.

### 5.3 Schema + migrate

1. Paste `assets/prisma/schema-auth.prisma` into `prisma/schema.prisma`
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
   [Local + mail] also create `app/(auth)/reset-password/page.tsx` rendering
   `<ResetPasswordForm token={(await searchParams).token ?? ''} />`. **This route
   must stay public** — `proxy.ts` already lists it in `AUTH_ONLY_PATHS`
   (remove that entry only when local login is off); a user who cannot log in
   also cannot reach a protected page.
   No page is needed for "forgot" — it is a dialog on the login form.
2. Protected group layout (`app/(app)/layout.tsx`):
   `auth.api.getSession({ headers: await headers() })` → no session →
   `redirect('/login')` (distinguish `?reason=session_expired` when the cookie
   is still present — see `references/auth-flows.md`)
3. Logout buttons use `<form action={logoutAction}>` (SSO uses
   `ssoLogoutAction`) — never `signOut()` from the auth-client
4. **Identity block in the shell** — render `<NavUser>` in the sidebar footer
   (or the topbar's right-hand dropdown), fed from the session: `name`,
   `email`, `roleName` from the user's role, `authType` from `user.authType`.
   Project-specific profile rows (employee code, position, department) go in
   through `extraRows` — the component ships only the two rows every app has
   (email · last login method). DESIGN.md §3 fixes the placement and the two
   menu items, so users find "who am I / sign out" in the same spot in every
   app.
5. First deployment: log in → visit `/admin/setup` → one click → Administrator
   role → redirects to `/admin/users`, which now really exists
   **[Local-only projects have a chicken-and-egg here]**: a local account can
   only be made from `/admin/users`, which needs a login, and nobody has one
   yet. SSO/LDAP never hit this — their accounts appear on the first successful
   bind. So for local-only, run once:

   ```bash
   npx tsx scripts/create-first-user.ts "ชื่อผู้ดูแล" admin@__COMPANY_DOMAIN__ '<initial password>'
   ```

   then log in with it and continue with `/admin/setup`. The script refuses to
   run once any user exists — everyone after the first is created through
   `/admin/users`, where the permission guard and the audit log apply.
5. `app/(admin)/layout.tsx` calls `syncPermissionsIfNeeded()` on every request
   into the admin section — if you add a permission to `ALL_PERMISSIONS` later,
   it reaches the database the next time anyone opens an admin page, no
   migration step needed (see `references/rbac.md`)

## 6. Placeholders used across the assets

| Placeholder | Meaning | Example |
| --- | --- | --- |
| `__PROJECT_NAME__` | app slug / Keycloak Client ID — **also hidden in a fallback string in `login-form.tsx` (~line 181, flagged with a ⚠️ PLACEHOLDER comment); don't miss it** | `expense-portal` |
| `__BASE_PATH__` | Next.js basePath (no leading `/` when used as a cookie prefix) | `expense-portal` |
| `__KEYCLOAK_HOST__` | the org's central Keycloak host | — |
| `__REALM__` | the org's central realm | — |
| `__LDAP_HOST__` | AD server hostname | — |
| `__AD_BASE_DN__` | full AD base DN (one `DC=` per label) | `DC=example,DC=com` |
| `__COMPANY_DOMAIN__` | org email/UPN domain | `company.co.th` |
| `__APP_HOST__` | the host the app actually deploys to | — |

## 7. Quick Rules — DO / DON'T

| DO ✅ | DON'T ❌ |
| --- | --- |
| Derive the cookie prefix from the basePath and keep it **identical in 3 places**: `lib/auth.ts` / `proxy.ts` / `lib/actions/auth.ts` | Leave the default `better-auth.` on a shared domain (→ `ERR_TOO_MANY_REDIRECTS`) |
| Compute `SESSION_COOKIE_NAME` from `BETTER_AUTH_URL` (https → `__Secure-` prefix) | Hardcode the cookie name |
| Log out with `cookieStore.set(name, '', { maxAge: 0, secure })` | `cookieStore.delete()` — omits the `Secure` flag; browsers refuse to delete `__Secure-` cookies |
| Guard Keycloak plugin registration with `env.KEYCLOAK_* &&` | Call `keycloak()` bare (build crashes under `SKIP_ENV_VALIDATION=1`) |
| `redirectURI` = `${BETTER_AUTH_URL}${BASE_PATH}/api/auth/oauth2/callback/keycloak` | Let Better Auth guess the redirect URI (no basePath) |
| `auth.api.signInEmail(...)` | `auth.api.signIn.email(...)` (that path doesn't exist) |
| `auth.api.requestPasswordReset(...)` (1.5.x) | `auth.api.forgetPassword(...)` — removed |
| Build the reset link from `token` + `NEXT_PUBLIC_BASE_PATH` yourself | Mail the `url` Better Auth passes in (no basePath → 404 in prod only) |
| Answer "ถ้าอีเมลนี้มีอยู่…" for every input | Say "ไม่พบอีเมลนี้" — that is a user-enumeration oracle |
| Refuse reset for `authType !== 'local'` | Let an SSO/LDAP user set an app-local password beside the directory one |
| One `lib/password-policy.ts` for reset · change · admin-create | A different regex per form (the loosest one becomes the real rule) |
| `revokeSessionsOnPasswordReset: true` + `revokeOtherSessions` on change | Leave old sessions alive after a reset — the intruder simply stays |
| Require the current password to change one | Trust the session alone (a borrowed unlocked laptop = account taken) |
| Block `/api/auth/sign-up` in `proxy.ts` | Leave it reachable — `emailAndPassword.enabled` opens public self-registration on an internal app |
| Create local accounts only from `/admin/users` (guard + audit) | Add a sign-up page, or set `disableSignUp: true` (it also kills the server-side `signUpEmail` the admin action needs) |
| Admin **sends a reset link** | Admin types a new password for someone — then the audit log can no longer say who acted |
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
- [ ] [Local + mail] "ลืมรหัสผ่าน?" with a **real** email and with a made-up one →
      **the same message both times**, and the email arrives for the real one
- [ ] The mailed link opens the reset page **on the deployed basePath**, not a 404
- [ ] Using the same link twice → the second time says expired/already used
- [ ] After a reset, a session open on another browser is logged out
- [ ] [Local] Change password from the profile menu: wrong current password is
      refused; a password that breaks the policy is refused with the same message
      the reset page gives; after success this browser stays logged in
- [ ] The change-password item does **not** appear for an SSO/LDAP account
- [ ] [Local] `POST /api/auth/sign-up/email` from curl → **404**, and creating a
      user from `/admin/users` still works (the block is the HTTP route only)
- [ ] [Local] The new user can log in with the initial password, and the
      audit log has a `users.create` row with **no password in `detail`**
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
- [ ] With a basePath: the cookie name in DevTools starts with `__BASE_PATH__.` (or `__Secure-__BASE_PATH__.` on https)
- [ ] No real secrets / hostnames leaked into git (`.env.local` is gitignored)
