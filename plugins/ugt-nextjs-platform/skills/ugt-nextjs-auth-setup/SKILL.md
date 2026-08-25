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

> **ต้องติดตั้งก่อน**: `ugt-nextjs-database-setup` แล้วตามด้วย
> `ugt-nextjs-design-setup` — เหตุผลเต็มอยู่ที่ §4 Prerequisite

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
- `references/directory-enrichment.md` — filling employee code / department /
  position / supervisor from the org's employee view over a linked server,
  because SSO and LDAP only answer "who are you"
- `references/data-scope.md` — "may they?" vs "**whose data?**": the row-level
  scope layer, and the approval-chain view (**read before writing any route
  that accepts an empCode from the client**)
- `references/i18n-wiring.md` — registering the `auth` message catalog in
  `i18n/messages.ts` (§5.2) and why skipping it fails silently
- `references/placeholders.md` — the full placeholder table + substitution rules (§6)

## 2. Org Standards

The org-wide contract:

1. **One Keycloak server for the whole org** — a central realm synced with AD;
   **each project gets its own client** (Client ID = project name); never share
   clients between projects
2. **OIDC Authorization Code + PKCE (S256)** only — no implicit / direct access grants
3. **Session: 8-hour lifetime, refresh when 30 minutes remain**
   (`expiresIn: 8h`, `updateAge: 30m`)
4. **Audit log every time**: every auth event (login/logout, all password
   events for local accounts) and every privileged mutation writes to the
   ActivityLogs table after success — non-blocking, must never throw and
   break login. The mandated action catalog + full rules (naming, forbidden
   payloads, retention) in `references/audit-logging.md`
5. **RBAC shape**: `user (1)──(0..1) role (1)──(M:N) permission` — permission
   keys are `resource:action`, roles with `isSystem: true` cannot be deleted,
   every mutation guarded in the order **session → permission → action → audit log**
5b. **Permission is not scope.** A permission says *may they*; scope says *whose
   data*. Any route/action accepting a record-owner id from the client resolves
   `lib/scope.ts` and checks it — read-all → own → team, unlinked accounts see
   nothing, and out-of-scope answers **404** (`references/data-scope.md`)
6. **Cookie-prefix rule**: when multiple apps deploy under one domain (shared
   domain + basePath), the session cookie name must be unique per app — derive
   the prefix from the basePath, or cookies collide → `ERR_TOO_MANY_REDIRECTS`
7. **SSO logout = delete the local session + backchannel logout to Keycloak**
   (POST with the refresh_token) — the browser is never redirected through Keycloak
8. **[Local] One password policy, one file** (`lib/password-policy.ts`) shared by
   reset · change · admin-create; a reset link is **single-use, 1 hour**, sent
   only to `authType === 'local'` accounts, and answers identically whether or
   not the email exists; every password change revokes the user's other sessions
9. **Identity is enriched from the org employee view, not from the IdP.** SSO
   and LDAP give username + email + display name; employee code, department,
   position and supervisor come from the central view over a linked server,
   refreshed on every login by one shared helper — read-only, and never
   allowed to break login (`references/directory-enrichment.md`)
10. **No self-registration, and no pre-registration** (มติ 2026-08-11). SSO and
   LDAP accounts appear on their first successful login — their data already
   lives in the directory, so nobody creates them by hand; the role is assigned
   from `/admin/users` after that first login. Local accounts are the only kind
   created manually (`users:create` on `/admin/users`), and
   `disableSignUp: true` closes the endpoint Better Auth would otherwise publish

## 3. Interview — ask the installer first (one batch)

Ask all of these **in a single message** before doing anything:

1. **Which login methods?** SSO / LDAP / Local (default: SSO only)
2. **Deployed under a basePath / shared domain?** If yes → what basePath (e.g. `/__BASE_PATH__`)
3. **[If SSO] Does a Keycloak client exist yet?**
   - exists → request `KEYCLOAK_ISSUER` / `CLIENT_ID` / `CLIENT_SECRET`
   - not yet → follow `references/keycloak-client.md` (the redirect URI must
     be known before requesting) — and **render the request as a project file
     `docs/admin-handoff.md`** (Thai, real values, settings table + exact
     redirect URIs + a "ค่าที่ต้องส่งกลับ" section) so the user forwards a
     file, not a chat snippet. If the file already exists (e.g. cicd-setup
     wrote it), update its Keycloak section instead of overwriting.
4. **[If LDAP] AD server details?** `LDAP_URL` (ldaps:// or not), `LDAP_BASE_DN`, `LDAP_DOMAIN`
   — **[If SSO or LDAP]** also keep `docs/admin-handoff.md` §4 "TLS ภายในองค์กร"
     (from the cicd-setup template — internal-CA cert vs closed-intranet
     confirmation, see `references/keycloak-client.md`); don't delete it even
     if this interview didn't need the Keycloak client section
5. ~~Who is the first admin?~~ — **do NOT ask this.** SSO/LDAP rows may not be
   pre-created (มติ 2026-08-11), so nothing can be seeded from a name given in
   an interview — asking creates an expectation the system can't fulfill. Full
   mechanism (layout gate + the exact `docs/admin-handoff.md` wording) is in
   §5.5 step 5.
6. **Is there a central employee database to read over a linked server?**
   (default: yes for org apps) — SSO/LDAP give only username + email + display
   name. If the app needs employee code, department, position or supervisor,
   ask for the **four-part view name** and which columns carry those fields.
   → `references/directory-enrichment.md`. Answering "no" means deleting
   `lib/directory.ts`, its three call sites and the directory columns in the
   schema; say that out loud so it is a decision, not an omission.
   Two follow-ups, both defaulting to yes for org apps:
   - **"เห็นเฉพาะของตัวเองกับทีม" หรือทุกคนเห็นหมด?** → installs `lib/scope.ts`
     and adds a `<resource>:read-all` key per scoped resource
   - **มี workflow อนุมัติไหม?** → installs `lib/approval-chain.ts` and needs the
     **approval-chain view**, which is a different object from the employee one
7. **[If Local] Is `ugt-nextjs-mail-setup` installed?**
   - yes → password reset by email is installed (forgot dialog + `/reset-password`)
   - no → say plainly that **"ลืมรหัสผ่าน" cannot exist without it**, so the only
     recovery is an admin using "ตั้งรหัสผ่าน" on `/admin/users`. Offer to run
     mail-setup first. Never install the button without the mail behind it —
     Better Auth answers `RESET_PASSWORD_DISABLED` and the user gets a dead form.
   - Self-service **change password** and admin **set password** work either way.
8. **[Existing project with menus] เมนูเดิมตัวไหนบ้างที่ต้องคุมสิทธิ์?** — before
   asking, check whether the project already has an app shell/sidebar (that
   check itself needs no question — read the code). If it has existing menus,
   list them and ask which ones need permission control, because merging the
   admin menu in (§5.6) does **not** put existing menus under RBAC — the
   `/admin/roles` checklist only shows keys declared in `ALL_PERMISSIONS`.
   Menus not chosen stay visible to every logged-in user (the right default
   for general pages).

## 4. Prerequisite

**The database must be ready first** — via `ugt-nextjs-database-setup` (Prisma client +
`lib/prisma.ts` singleton + working migrate), because Better Auth stores
user/session/account in Prisma. If it isn't, stop and do the database first.

**The org UI kit must be installed too, for two separate reasons — the
DataTable one is narrow, the i18n one is not.** The three admin pages render
with the kit's `DataTable` plus `ui/date-range-picker`, `lib/pagination.ts`,
`lib/table-query.ts` and `lib/format.ts`, all installed by
`ugt-nextjs-design-setup` (the full-setup order design → auth guarantees
this). Table modes follow DESIGN.md §4 and are fixed per table, not asked in
the interview — each table's mode is stated on its row in the §5.2 asset
table.

Separately — and this covers far more of the skill than the three DataTable
pages — every converted asset calls `useTranslations()` unconditionally, so
it needs next-intl's provider chain (`i18n/request.ts`,
`NextIntlClientProvider`, the plugin registered in `next.config.ts`) whether
or not a single one of those files touches `DataTable`.

Installing auth standalone without the design kit: **run design-setup first
— this is the only real path**; dropping `DataTable` alone does nothing about
the i18n dependency. Plain shadcn `Table` works only for a project that also
hand-rolls the next-intl scaffolding (or strips every `useTranslations()`
call) — say which path was taken and record it as a DESIGN.md deviation.

## 5. Setup steps

### 5.1 Dependencies

```bash
# better-auth 1.7.0 removed genericOAuthClient in a MINOR bump — a deliberate
# rewrite, not a regression (full migration history in references/auth-flows.md
# SSO login flow). Every asset here is written for ≥1.7 — do not pin below 1.7.1.
npm i better-auth@^1.7.1 zod
npm i react-hook-form @hookform/resolvers   # ฟอร์ม auth ทุกตัวใช้ RHF + zodResolver (design-setup ลงให้แล้วถ้าติดตั้งก่อน)
npm i ldapts          # [METHOD: LDAP] only — never ldapjs (deprecated, no types)
npx shadcn@latest add button input label tabs card sonner field      # login/setup forms (field = error ใต้ช่อง ตาม DESIGN §4)
npx shadcn@latest add table select checkbox badge dialog alert-dialog sheet avatar dropdown-menu sidebar tooltip   # admin pages + NavUser (NavUser imports ui/sidebar even in a topbar shell; IconAction/TruncatedText need tooltip)
```

> `TooltipProvider` must already wrap the root layout (design-setup step 3
> installs it) — mira's Tooltip does not self-wrap a provider, and IconAction
> in the admin tables crashes prerender without it.

> **No shadcn yet?** Never run a plain `npx shadcn@latest init` — it installs
> the default (Radix) style while every kit asset targets **base-mira
> (Base UI)**: components render but menu items silently do nothing. The org
> preset init lives in design-setup §Step 3 — run that skill first (§4
> requires it anyway). With it installed, the `add` lines above are mostly
> no-ops — keep them for projects that trimmed the base set.

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
| `assets/lib/directory.ts` | `lib/directory.ts` | only when a central employee view exists — substitute the four-part view name + column map; skipping it means deleting the directory columns from the schema too (§3 Q6) |
| `assets/lib/scope.ts` + `assets/lib/scope.test.ts` | `lib/…` | row-level data scope (read-all → own → team). Needs `lib/directory.ts` for the management chain |
| `assets/lib/approval-chain.ts` | `lib/approval-chain.ts` | only when the app has an approval workflow — substitute `__HR_AUTHORIZE_VIEW__` (a **different** view from the employee one) |
| `assets/lib/password-policy.ts` · `assets/lib/actions/password.ts` | `lib/…` | Local only — the policy file is the single source for length/complexity, shared by reset · change · admin-create |
| `assets/components/change-password-dialog.tsx` | `components/…` | Local only; opened from NavUser, hidden for SSO/LDAP accounts |
| `assets/components/admin-user-actions.tsx` | `components/…` | Local only — the "เพิ่มผู้ใช้ local" dialog on `/admin/users` + admin set-password; **no sign-up page, and no AD pre-registration** (SSO/AD accounts appear on first login — มติ 2026-08-11) |
| `assets/components/users-table.tsx` | `components/users-table.tsx` | client half of `/admin/users` — DataTable **client mode**; the password column is `[METHOD: LOCAL]` (delete it with the other local sections) |
| `assets/components/audit-logs-table.tsx` | `components/audit-logs-table.tsx` | client half of `/admin/audit-logs` — DataTable **server mode**: toolbar filters (ชื่อผู้ใช้ / ช่วงวันที่ / action) push `q`/`from`/`to`/`action` to the URL, DataTable pushes `page`/`pageSize`/`sort`/`dir` itself; needs the design kit (§4) |
| `assets/lib/permission-group-select.ts` | `lib/permission-group-select.ts` | pure helpers behind the checklist's group select-all (tri-state + counts) — from HRMS มติ 13.3 |
| `assets/scripts/create-first-user.ts` | `scripts/…` | Local only, run once — see §5.5 |
| `assets/components/forgot-password-dialog.tsx` · `assets/components/reset-password-form.tsx` | `components/…` | Local **and** mail-setup only — skip both when there is no mail |

The login-method assets (`lib/auth.ts`, `lib/auth-client.ts`,
`lib/actions/auth.ts`, `components/login-form.tsx`, `env.example`) carry
`[METHOD: SSO|LDAP|LOCAL]` markers — delete every section (imports included)
belonging to methods that were not selected. The RBAC/admin assets
(`app/(admin-setup)/**`, `app/(admin)/**`, the admin components, and
`lib/actions/admin-*.ts`) are method-agnostic — copy them as-is regardless
of which login methods were chosen, **except the sidebar shell**: a project
that already has its own sidebar merges the admin menu into it instead of
shipping a second sidebar — §5.6, and skipping that step is the single most
common install mistake.

**i18n wiring (every project, since `ugt-nextjs-design-setup` 4.46.0):** every
converted asset calls `useTranslations()` unconditionally, so the `auth`
catalog must be registered before any of them render — copy
`assets/messages/auth.{th,en}.ts` to `messages/`, then register in
`i18n/messages.ts` exactly as `references/i18n-wiring.md` shows.
**Skipping the registration fails silently**: the app still builds and boots,
every auth screen just renders raw key paths (`auth.login.submit`) instead of
text — see that file for why. Run design-setup's `verify.mjs` (delegates to
`check-i18n.mjs`) before calling an install done.

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
   `<LoginForm sessionExpired={reason === 'session_expired'} ssoError={error} />`
   — both `reason` and `error` come from `searchParams`; `error` is the code
   Better Auth appends when `onAPIError.errorURL` (lib/auth.ts) redirects a
   failed flow back here (e.g. `unable_to_create_user`), and the form maps it
   to a Thai message. Without it a failed SSO login shows the user nothing.
   [Local + mail] also create `app/(auth)/reset-password/page.tsx` rendering
   `<ResetPasswordForm token={(await searchParams).token ?? ''} />`. **This route
   must stay public** — `proxy.ts` already lists it in `AUTH_ONLY_PATHS`
   (remove that entry only when local login is off); a user who cannot log in
   also cannot reach a protected page.
   No page is needed for "forgot" — it is a dialog on the login form.
2. Protected group layout (`app/(app)/layout.tsx`):
   `auth.api.getSession({ headers: await headers() })` → no session →
   `redirect('/login')` (distinguish `?reason=session_expired` when the cookie
   is still present — see `references/auth-flows.md`), **then the first-admin
   gate** — without it, the first user logs in to a blank permission-less app
   with no hint that `/admin/setup` exists (field report 2026-08-21):

   ```tsx
   if (!(await isAdminInitialized())) redirect('/admin/setup');
   ```

   (Safe and near-free for every user — caching details in `references/rbac.md`.)
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
5. First deployment: log in → the layout gate (step 2) lands on `/admin/setup`
   → one click → Administrator role → redirects to `/admin/users`, which now
   really exists. Write this into `docs/admin-handoff.md` (section "ผู้ดูแลระบบ
   คนแรก", Thai): *คนแรกที่ login จะถูกพาไปหน้า `/admin/setup` และกดปุ่มเดียว
   เพื่อเป็น Administrator — เลือกคนที่จะ login คนแรกให้ถูกคน* — do not promise
   any pre-seeded admin account; there is none by design (§3 Q5).
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
6. `app/(admin)/layout.tsx` calls `syncPermissionsIfNeeded()` on every request
   into the admin section — if you add a permission to `ALL_PERMISSIONS` later,
   it reaches the database the next time anyone opens an admin page, no
   migration step needed (see `references/rbac.md`)

### 5.6 Sidebar: merge into the existing shell, or use the fallback

Check FIRST whether the project already has an app shell with a sidebar/nav
(`app/(app)/layout.tsx`, a design-setup shell, or any layout that renders a
menu). The standalone `<AdminNav>` default exists **only** for projects with
no shell — shipping it into one that has a shell produces two competing
sidebars.

**Project already has a sidebar** (the normal case for existing projects):

1. Merge `ADMIN_NAV_ITEMS` (exported from `components/admin-nav.tsx`) into the
   existing nav config — as a "จัดการระบบ" (`auth.adminNav.systemGroup`) group,
   or wherever the project's menu structure puts admin items. Keep the
   per-item permission filter: the items carry their `perm` key, so feed the
   nav the result of `getUserPermissions()` and hide items the user lacks,
   exactly as `<AdminNav>` does.

   Each item carries `labelKey` (e.g. `'users'`), not a resolved `label`
   string — `t()` from next-intl's `useTranslations` only works inside a
   component/hook body, so the exported array can't hold pre-translated
   text. Resolve it yourself in whatever component renders the merged
   sidebar (it already has hook context): `const t = useTranslations('auth.adminNav'); t(item.labelKey)`.
2. In `app/(admin)/layout.tsx`, keep the guard (session →
   `syncPermissionsIfNeeded()` → permission check) but delete the shell —
   render plain `{children}` so the pages sit inside the project's own shell
   (nest the `(admin)` group under the shell's layout, or move the three admin
   pages under the project's protected route group with the guard preserved).

**No shell yet** (fresh project): copy as-is — the (admin) layout wraps
`SidebarProvider` + `<AdminNav>` (shadcn Sidebar with `NavUser` in the footer)
and works out of the box. Requires the `sidebar` + `tooltip` components (§5.1
installs them) and `TooltipProvider` in the root layout. When the project
later grows its own shell, migrate as above — and remove this fallback so
there is exactly one sidebar and one NavUser.

**Existing menus under RBAC** (from §3 Q8): for each menu the installer chose,
declare a `resource:action` key in `ALL_PERMISSIONS` (the §5.5 step-6 sync
seeds it to the database automatically — it then appears in the `/admin/roles`
checklist), filter that menu item by the key, and guard its page/Server Action
behind it. Declaring the key without wiring the check gives a checkbox that
does nothing — always do both ends or neither.

## 6. Placeholders used across the assets

Full table + substitution rules in `references/placeholders.md`. Two traps
worth repeating: `__PROJECT_NAME__` also hides in a fallback string in
`login-form.tsx` (grep for the ⚠️ PLACEHOLDER comment), and
`env.example`/`.env.local`/`.env` must be substituted too — `verify.mjs`
scans all three, not just `.ts`/`.tsx`/`.prisma`.

## 7. Quick Rules — DO / DON'T

> Only rules with no other home live here — everything else is in §2 or the
> references listed in §1.

| DO ✅ | DON'T ❌ |
| --- | --- |
| Require the current password to change one | Trust the session alone (a borrowed unlocked laptop = account taken) |
| Write the user + `credential` account rows with `hashPassword` (`better-auth/crypto`) | `auth.api.signUpEmail` in an admin action — `disableSignUp` blocks it too, and it mints a session for the new user |
| `isSelf` = `session.empCode === record.empCode` | `!viewAll` — a read-all user then loses the buttons on their **own** record |
| UI follows the kit's Base UI (base-mira) API: `render` on triggers, `onClick` on menu items | Radix idioms `asChild` / `onSelect` — they are silently ignored by Base UI and the button just stops working (shipped once: "ปุ่ม logout กดไม่ได้") |
| Destructive actions confirm via the kit's `ConfirmActionDialog`; row buttons via `IconAction` + `soft-*`; page headers via `page-shell` | `window.confirm`, bare ghost icon buttons, hand-written `<h1>` — DESIGN.md §3/§4 apply to these admin pages too |

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
- [ ] [Local] `POST /api/auth/sign-up/email` from curl → refused
      (`EMAIL_PASSWORD_SIGN_UP_DISABLED`), while "เพิ่มผู้ใช้" on `/admin/users`
      still works
- [ ] [Local] The new user can log in with the initial password, and the audit
      log has a `users.create` row with **no password in `detail`**
- [ ] [Local] Admin "ตั้งรหัสผ่าน" on a row → that user's open sessions die and
      the new password works; the button is absent on SSO/LDAP rows
- [ ] [LDAP/SSO] A brand-new AD user logs in for the first time → their row
      appears with directory fields filled; assign the role from `/admin/users`
      and it sticks on the next login
- [ ] [Directory] Log in and check the `User` row: employee code, department,
      position, supervisor are filled — and by **both** SSO and LDAP, not one
- [ ] [Directory] Change someone's department in the HR view, log in again →
      the app row follows
- [ ] [Directory] Point the view name at something unreachable → login still
      works, the fields just stay as they were (this is the check that matters)
- [ ] [Scope] As a user **without** `:read-all`, edit `?empCode=` to a colleague's
      → 404, and the list shows only your own + your team's rows
- [ ] [Scope] `npm test` passes `lib/scope.test.ts` (cycles, unlinked account,
      empty-list-means-no-rows)
- [ ] [Approval] Point `__HR_AUTHORIZE_VIEW__` at something unreachable →
      submitting a request **fails visibly**; it must never save with no approver
- [ ] [Approval] An employee with no chain configured gets "ติดต่อฝ่ายบุคคล",
      not the same message as a system error
- [ ] Static assets load (no `Unexpected token '<'` in the console)
- [ ] Fresh database: log in as anyone → the app layout redirects to
      `/admin/setup` (no blank permission-less page); after bootstrap the
      redirect stops for everyone
- [ ] `/admin/setup` works: one click grants Administrator and redirects to
      `/admin/users`; revisiting `/admin/setup` redirects away
- [ ] NavUser (bottom of the sidebar): opening the menu and clicking
      "บัญชีผู้ใช้" really opens the profile card, and "ออกจากระบบ" really logs
      out — this catches a leftover Radix `onSelect`/`asChild` (§7)
- [ ] Admin pages follow DESIGN.md §3/§4 (§7's UI rows): `page-shell`
      title+subtitle on all three pages · delete via `ConfirmActionDialog` ·
      row buttons `IconAction` soft colours with tooltips · role Sheet's
      permission checklist scrolls all the way
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
- [ ] `/admin/audit-logs` filters run server-side: filtering by user / date
      range / action changes the URL (`q`/`from`/`to`/`action`), and paging
      keeps the filter, and a refresh or a shared link shows the same result
- [ ] ActivityLogs has `login.success` / `logout` rows after testing
- [ ] Cookie prefix matches across `lib/auth.ts` / `proxy.ts` / `lib/actions/auth.ts` (grep `cookiePrefix\|APP_COOKIE_PREFIX`)
- [ ] With a basePath: the cookie name in DevTools starts with your basePath (e.g. `expense-portal.`, or `__Secure-expense-portal.` on https)
- [ ] Security headers reach **every** response, not just HTML pages —
      `curl -sI http://localhost:3000/login` and
      `curl -sI http://localhost:3000/api/health` must both show
      `content-security-policy`, `x-frame-options: DENY`,
      `x-content-type-options: nosniff`, `referrer-policy` and
      `permissions-policy` (every `return` in `proxy.ts` must go through
      `applySecurityHeaders()` — why each header exists is in that file's own
      comments, read those before changing it)
- [ ] `http://localhost` has **no** `strict-transport-security` header; https
      has it without `includeSubDomains`/`preload` (reasons in `proxy.ts`)
- [ ] No real secrets / hostnames leaked into git (`.env.local` is gitignored)
- [ ] th+en projects: `node <ugt-nextjs-design-setup skill dir>/scripts/check-i18n.mjs .`
      (cwd = project root) reports `0 failed`, and every auth screen (login,
      `/admin/users`, `/admin/roles`, `/admin/audit-logs`, change/reset/forgot
      password) shows English text after switching locale
