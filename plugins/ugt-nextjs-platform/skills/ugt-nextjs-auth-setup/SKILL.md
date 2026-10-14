---
name: ugt-nextjs-auth-setup
description: >
  Use when a project needs login — "ใส่ระบบ login", "ต่อ SSO", "login ด้วย AD",
  "ใช้ Keycloak ของบริษัท", "ยังไม่มีระบบสมาชิก" — SSO (Keycloak OIDC), AD/LDAP
  bind, or local email/password via Better Auth, plus session cookies, route
  guards in `proxy.ts`, RBAC, audit logging, the first-admin bootstrap page, and
  the /admin/users, /admin/roles, /admin/audit-logs pages. Also for anything
  touching permissions ("ใครเห็นเมนูนี้ได้", "เพิ่ม role", "guard หน้านี้",
  "หน้าจัดการ user/role") and the local-account lifecycle ("ลืมรหัสผ่าน",
  "รีเซ็ตรหัสผ่าน", "เปลี่ยนรหัสผ่านเอง", password policy). Reach for it on auth
  symptoms with documented causes here: ERR_TOO_MANY_REDIRECTS, login loops only
  in production, logout not sticking on https, static assets returning
  Unexpected token '<', Keycloak rejecting the redirect URI, a reset link that
  404s under a basePath (full list in the skill). Requires
  ugt-nextjs-database-setup first. Not for CI (→ ugt-nextjs-cicd-setup).
---

# UGT Auth Setup — SSO / LDAP / Local + RBAC

## When to use — symptoms with a documented cause here

Every row below was debugged in a real org project. This is an index only — the
cause and fix live in the file named (all under `references/`); read it when a
symptom appears, and `auth-flows.md` before changing a flow.

| Symptom | Cause + fix in |
| --- | --- |
| `ERR_TOO_MANY_REDIRECTS` after deploying behind a shared domain | `troubleshooting-session.md` §Cookies and redirect loops |
| `ERR_TOO_MANY_REDIRECTS` `/` ↔ `/login` in one browser only (stale cookie; fresh browser fine) | `troubleshooting-session.md` §Stale cookie loop |
| Login works locally but loops in production | `troubleshooting-session.md` §Cookies and redirect loops |
| Logout does not stick on https | `troubleshooting-session.md` §Cookies and redirect loops |
| Static assets return `Unexpected token '<'` | `troubleshooting-session.md` §basePath and proxy.ts |
| `npm ci` dies with `ERESOLVE` on Jenkins / in `docker build` only | `troubleshooting-upgrades.md` §Dependencies and schema |
| Profile menu (sidebar footer ⋮) kills the page — `Base UI error #31` | `troubleshooting-upgrades.md` §Kit re-syncs |
| SSO button 404 `PROVIDER_NOT_FOUND`, health green — after one deploy only | `troubleshooting-sso.md` §Keycloak / genericOAuth |
| SSO ends in `internal_server_error`, Prisma error on `Account.issuer` | `troubleshooting-upgrades.md` §Account.issuer |
| Keycloak rejects the redirect URI | `troubleshooting-sso.md` §Keycloak / genericOAuth · `keycloak-client.md` |
| Mailed reset link 404s | `troubleshooting-session.md` §basePath and proxy.ts |
| Email OTP always "expired" / 400 `TWO_FACTOR_NOT_ENABLED` after a `better-auth` bump | `troubleshooting-upgrades.md` §twoFactor lockout columns |
| SSO `unable_to_create_user` / `account_not_linked`, TLS errors, LDAP "Invalid username" on prod only | `troubleshooting-sso.md` |

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
ongoing admin pages to manage it afterward: `/admin/users` (tabs ทั้งหมด ·
ยังไม่มี role · ตั้งล่วงหน้า; assign or pre-assign a role), `/admin/roles` (CRUD +
permission checkboxes), `/admin/audit-logs` (read-only viewer).

Real code lives in `assets/` — adjust placeholders and copy straight into the
project. Deep detail lives in `references/`:

- `references/auth-flows.md` — how every flow works (read it before changing a login flow or cookie/guard setting)
- `references/troubleshooting-{session,sso,upgrades}.md` — every debugged symptom → cause → fix,
  split by topic (cookies/loops/basePath · Keycloak/LDAP · better-auth bumps/peer deps/re-syncs)
- `references/asset-map.md` · `references/schema-and-env.md` — per-asset table (§5.2), auth-table + env-var detail (§5.3–5.4)
- `references/rbac.md` — data model, guard pattern, bootstrap, adding permissions later
- `references/audit-logging.md` — action naming, write pattern, payload rules (PDPA), retention, viewer API
- `references/keycloak-client.md` — requesting/creating a Keycloak client for a new project
- `references/directory-enrichment.md` — filling employee code / department /
  position / supervisor from the org's employee view over a linked server,
  because SSO and LDAP only answer "who are you"
- `references/org-identity.md` — pre-assigned roles, the "ยังไม่มี role" tab/badge/admin
  mail, `ORG_EMAIL_DOMAINS` and the shared-account hole (§2 items 10–11) + kit-sync steps
- `references/data-scope.md` — "may they?" vs "**whose data?**": the row-level
  scope layer, and the approval-chain view (**read before writing any route
  that accepts an empCode from the client**)
- `references/i18n-wiring.md` — registering the `auth` message catalog in
  `i18n/messages.ts` (§5.2) and why skipping it fails silently
- `references/placeholders.md` — the full placeholder table + substitution rules (§6)
- `references/verification.md` — the by-hand half of the verification checklist
  (§8 runs the script; this is everything the script cannot see)

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
10. **No self-registration, no pre-created accounts — pre-assigned roles are
   fine** (มติ 2026-08-11, amended 2026-10-14). SSO/LDAP accounts appear only on
   their first successful login; nobody creates them by hand. An admin may
   **pre-assign a role** from the HR view (tab ตั้งล่วงหน้า): a
   `PendingRoleAssignments` row keyed by EmpCode + ADLoginName that the server
   resolves from the view — no `User`/`Account` row, so nothing for Better Auth
   to link into, and nothing typed, so no duplicate user; the first login
   applies it (`lib/after-login.ts`). Users who log in with no role show in the
   ยังไม่มี role tab, the menu badge, and (with mail) one admin email. Local
   accounts are the only kind created manually (`users:create`), and
   `disableSignUp: true` closes Better Auth's sign-up endpoint
   (`references/org-identity.md`)
11. **Org mailboxes belong to SSO/LDAP.** `ORG_EMAIL_DOMAINS` (first =
   canonical) normalizes every email from SSO/LDAP/HR before it is stored,
   shown or mailed; a Local account can neither be created nor sign in on those
   domains; SSO/LDAP never link into a row that is not the same AD username —
   so no Local password can share an employee's identity or role

## 3. Interview — ask the installer first (one batch)

Ask all of these in one interview round before doing anything — one
message, or back-to-back AskUserQuestion calls (≤4 per call):

1. **Which login methods?** SSO / LDAP / Local (default: SSO only)
2. **Deployed under a basePath / shared domain?** If yes → what basePath (e.g. `/__BASE_PATH__`)
3. **[If SSO] Does a Keycloak client exist yet?**
   - exists → request `KEYCLOAK_ISSUER` / `CLIENT_ID` / `CLIENT_SECRET`
   - not yet → follow `references/keycloak-client.md` (the redirect URI must
     be known before requesting) — and **render the request as a project file
     `docs/admin-handoff.md`** (Thai, real values, settings table + exact
     redirect URIs + the "ส่งกลับ" table — cicd-setup's template, table G only) so the user forwards a
     file, not a chat snippet. If the file already exists (e.g. cicd-setup
     wrote it), update its Keycloak section instead of overwriting.
4. **[If LDAP] AD server details?** `LDAP_URL` (ldaps:// or not), `LDAP_BASE_DN`, `LDAP_DOMAIN`
   (internal-CA TLS is not a question — `NODE_TLS_REJECT_UNAUTHORIZED=0` is org
   standard, already in env section 1 and both compose files)
   **[SSO/LDAP] Org email domains?** → `ORG_EMAIL_DOMAINS`, canonical first (§2 item 11)
5. **First admin — not a question.** SSO/LDAP rows can't be pre-created
   (มติ 2026-08-11) and pre-assigning needs a running app with an admin, so
   nothing could be seeded from a name given here; the
   first login claims admin via `/admin/setup`. Full
   mechanism (layout gate + the exact `docs/admin-handoff.md` wording) is in
   §5.5 step 5.
6. **Is there a central employee database to read over a linked server?**
   (default: yes for org apps) — SSO/LDAP give only username + email + display
   name. If the app needs employee code, department, position or supervisor,
   ask for the **four-part view name** and which columns carry those fields.
   → `references/directory-enrichment.md`. Answering "no" means deleting
   `lib/directory.ts`, its call sites, the directory columns in the schema and
   every `[DIRECTORY]` part (no pre-assigned roles — `org-identity.md` §6); say
   that out loud so it is a decision, not an omission.
   Two follow-ups, both defaulting to yes for org apps:
   - **"เห็นเฉพาะของตัวเองกับทีม" หรือทุกคนเห็นหมด?** → installs `lib/scope.ts`
     and adds a `<resource>:read-all` key per scoped resource
   - **มี workflow อนุมัติไหม?** → installs `lib/approval-chain.ts` and needs the
     **approval-chain view**, which is a different object from the employee one
7. **[If Local] Is `ugt-nextjs-mail-setup` installed?**
   - yes → password reset by email is installed now (forgot dialog + `/reset-password`)
   - no → **do NOT run mail-setup first** — mail-setup needs auth (session actor
     + the `dev-mode:enable` permission), so that order is a deadlock. Use the
     two-pass order full-setup §3 defines: **install auth now without the reset
     pieces** (no `sendResetPassword` in `lib/auth.ts`, no forgot dialog, no
     `/reset-password` page) → run `ugt-nextjs-mail-setup` → **come back to
     §5.5 and add the reset pieces**. Say out loud that until pass two lands,
     the only recovery is an admin using "ตั้งรหัสผ่าน" on `/admin/users`.
     Never install the button without the mail behind it — Better Auth answers
     `RESET_PASSWORD_DISABLED` and the user gets a dead form.
   - Self-service **change password** and admin **set password** work either way.
8. **[Existing project with menus] เมนูเดิมตัวไหนบ้างที่ต้องคุมสิทธิ์?** — before
   asking, check whether the project already has an app shell/sidebar (that
   check itself needs no question — read the code). If it has existing menus,
   list them and ask which ones need permission control, because merging the
   admin menu in (§5.6) does **not** put existing menus under RBAC — the
   `/admin/roles` checklist only shows keys declared in `ALL_PERMISSIONS`.
   Menus not chosen stay visible to every logged-in user (the right default
   for general pages).
9. **[Preserve mode — full-setup §2 Q0 = คงของเดิม, or any layout in the project
   already renders a menu]** — not a question, a constraint (มติ 2026-09-09,
   level **token + shell**): the admin pages go through §5.6's *merge* branch
   only — never `<AdminNav>` — sit under the project's protected layout, and
   inherit the design-setup tokens rebased onto the project's look (kit
   DataTable/dialogs unchanged); a prototype login found by full-setup §1 goes
   per §5.7. `/admin/*` as its own indigo shell beside the app is the failure
   this exists for — `scripts/verify.mjs` fails on it.

## 4. Prerequisite

**The database must be ready first** — via `ugt-nextjs-database-setup` (Prisma client +
`lib/prisma.ts` singleton + working migrate), because Better Auth stores
user/session/account in Prisma. If it isn't, stop and do the database first.

**The org UI kit must be installed too, for two reasons.** (1) The admin pages
render with the kit's `DataTable` + `ui/date-range-picker`, `lib/pagination.ts`,
`lib/table-query.ts`, `lib/format.ts` (`ugt-nextjs-design-setup`; the full-setup
order design → auth guarantees this). Table modes follow DESIGN.md §4, fixed
per table on its row in `references/asset-map.md` — not an interview question.
(2) Far broader: every asset calls `useTranslations()` unconditionally, so it
needs next-intl's provider chain (`i18n/request.ts`, `NextIntlClientProvider`,
the `next.config.ts` plugin) whether or not it touches `DataTable`.

Standalone without the design kit: **run design-setup first — the only real
path**; dropping `DataTable` does nothing about i18n. Plain shadcn `Table` works
only if the project also hand-rolls next-intl (or strips every
`useTranslations()`) — record that as a DESIGN.md deviation.

## 5. Setup steps

### 5.1 Dependencies

```bash
# better-auth 1.7.0 removed genericOAuthClient in a MINOR bump — a deliberate
# rewrite, not a regression (full migration history in references/troubleshooting-upgrades.md
# §better-auth 1.7 migration note). Every asset here is written for ≥1.7 — do not pin below 1.7.4 (1.7.0–1.7.2 required an `Account.issuer` column that 1.7.4+ removed again).
npm i better-auth@^1.7.4 zod@^4 --legacy-peer-deps   # zod pinned to 4 (clean-code mandates z.flattenError / z.iso.*) · --legacy-peer-deps: better-auth declares an optional peer vitest ^2–^4 and the org test-lint kit is vitest ^5 → plain install dies with ERESOLVE; afterwards re-check that vite / @testing-library/dom are still installed — the flag can prune them
grep -qs '^legacy-peer-deps=true' .npmrc || printf '# better-auth optional peer vitest ^2-^4 vs the org vitest ^5 — npm ci (Jenkins Install + Docker deps) needs this too\nlegacy-peer-deps=true\n' >> .npmrc   # append (never overwrite a registry/auth .npmrc) · commit it: the --legacy-peer-deps flag above fixes THIS install only
npm i react-hook-form @hookform/resolvers   # ฟอร์ม auth ทุกตัวใช้ RHF + zodResolver (design-setup ลงให้แล้วถ้าติดตั้งก่อน)
npm i ldapts          # [METHOD: LDAP] only — never ldapjs (deprecated, no types)
npx shadcn@latest add button input label tabs card sonner field      # login/setup forms (field = error ใต้ช่อง ตาม DESIGN §4)
npx shadcn@latest add table select checkbox badge dialog alert-dialog sheet avatar dropdown-menu sidebar tooltip   # admin pages + NavUser (NavUser imports ui/sidebar even in a topbar shell; IconAction/TruncatedText need tooltip)
```

> **After the `add` lines:** `git diff components/ui/button.tsx input.tsx`
> (the `sidebar` block can revert a rebased control scale) · `TooltipProvider`
> must already wrap the root layout · never a plain `npx shadcn@latest init`
> (Radix, not base-mira) — why for each: `references/asset-map.md` §shadcn caveats.

Then mount `<Toaster richColors />` (from sonner) in the root layout
(`app/layout.tsx`) — otherwise `toast.*()` in the login form renders nothing.

### 5.2 Copy assets → project locations

Assets mirror their destinations — **copy the `assets/` tree straight onto the
project root** (`assets/lib/auth.ts` → `lib/auth.ts`, `assets/app/(admin)/…` →
`app/(admin)/…`, `assets/components/…` → `components/…`, `assets/proxy.ts` →
`proxy.ts`; Next.js 16 uses `proxy.ts`, not `middleware.ts`), then handle the
exceptions:

> **Check the project's Next.js version before copying `proxy.ts`** (read
> `next` in `package.json`). `proxy.ts` is a **Next.js ≥16** filename: on 15 or
> older Next never loads it, so there is **no route protection at all** and
> nothing warns you — the app just serves protected pages to anyone. On <16,
> copy the identical content to `middleware.ts` instead (rename the exported
> `proxy` function to `middleware`; `export const config` stays as-is), or
> upgrade Next first.

Per-asset destinations and notes (which assets are method-, mail- or
workflow-conditional, which shadcn/kit components each needs, DataTable mode
per table) are in **`references/asset-map.md`** — walk that table while copying.

The login-method assets (`lib/auth.ts`, `lib/auth-client.ts`,
`lib/actions/auth.ts`, `components/login-form.tsx`, `env.example`) carry
`[METHOD: SSO|LDAP|LOCAL]` markers — delete every section (imports included)
belonging to methods that were not selected. Likewise `[DIRECTORY]` (no HR view)
and `[MAIL]` (no mail module yet) — the matrix is `references/org-identity.md` §6. The RBAC/admin assets
(`app/(admin-setup)/**`, `app/(admin)/**`, the admin components, and
`lib/actions/admin-*.ts`) are method-agnostic — copy them as-is regardless
of which login methods were chosen, **except the sidebar shell**: a project
that already has its own sidebar merges the admin menu into it instead of
shipping a second sidebar — §5.6, and skipping that step is the single most
common install mistake.

**i18n wiring (every project):** every
asset calls `useTranslations()` unconditionally, so the `auth`
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
   > **Naming-rule exception — 8 singular tables + no audit columns + hard
   > delete** (Better Auth owns these rows; `PendingRoleAssignments` is plural
   > but also hard-deletes). Do not pluralize them, and **record
   > the `⚠ deviation` line during install** — the table list, the reason and the
   > exact line are in `references/schema-and-env.md` §Auth-table exception.
2. Add project-specific custom fields on the `user` model at `// EXTENSION POINT:`
3. `npx prisma migrate dev --name auth-rbac`, then **must** run `npx prisma generate` immediately

### 5.4 Env schema (`lib/env.ts` or equivalent)

Declare `BETTER_AUTH_SECRET` (`min(32)`), `BETTER_AUTH_URL` (**required**
`z.url()`, never optional — redirect loop otherwise), `BETTER_AUTH_TRUSTED_ORIGINS`,
`KEYCLOAK_*` (SSO only), `LDAP_*` (LDAP only), `ORG_EMAIL_DOMAINS` (SSO/LDAP,
optional), and `NEXT_PUBLIC_BASE_PATH` +
`NEXT_PUBLIC_APP_NAME` in the t3-env `client` block **and** `runtimeEnv`. Type,
requiredness and the reason for each: `references/schema-and-env.md` §Env schema.

### 5.5 Wire the login page + guards

1. Create `app/(auth)/login/page.tsx`: the two-column hero `<LoginShell hero={…}>`
   (copy from the project's `app` catalog, optional photo — page + recipe in
   `references/login-page.md`) wrapping
   `<LoginForm sessionExpired={reason === 'session_expired'} ssoError={error} from={from} />`
   — all three from `searchParams`; `from` is the basePath-relative return-to-page
   path `proxy.ts`, the layout guard and `SessionExpiredDialog` attach; the form
   validates it (open-redirect guard) and every method returns there
   (`references/auth-flows.md` §Return-to-page). `error` is the code
   Better Auth appends when `onAPIError.errorURL` (lib/auth.ts) redirects a
   failed flow back here (e.g. `unable_to_create_user`), mapped to a Thai
   message — without it a failed SSO login shows nothing. **"Already signed in
   → into the app" lives here too**, checking the REAL session — never in
   `proxy.ts`, which sees only a cookie (a stale one loops `/` ↔ `/login`,
   `references/troubleshooting-session.md` §Stale cookie loop):

   ```tsx
   const session = await auth.api.getSession({ headers: await headers() });
   if (session) redirect('/'); // valid session only — a stale cookie falls through to the form
   ```
   [Local + mail] also create `app/(auth)/reset-password/page.tsx` rendering
   `<ResetPasswordForm token={(await searchParams).token ?? ''} />`. **This route
   must stay public** — `proxy.ts` already lists it in `AUTH_ONLY_PATHS`
   (remove that entry only when local login is off); a user who cannot log in
   also cannot reach a protected page.
   No page is needed for "forgot" — it is a dialog on the login form.
2. Protected group layout (`app/(app)/layout.tsx`):
   `auth.api.getSession({ headers: await headers() })` → no session →
   `redirect('/login')` (distinguish `?reason=session_expired` when the cookie
   is still present, and attach `?from=` read from the `x-from` request header
   that `proxy.ts` forwards — a server component cannot see its own URL any
   other way; snippet in `references/auth-flows.md` §Server Component session
   check), **then the first-admin gate** — without it, the first user logs in to a blank permission-less app
   with no hint that `/admin/setup` exists:

   ```tsx
   if (!(await isAdminInitialized())) redirect('/admin/setup'); // near-free — caching in references/rbac.md
   ```

   Also render `<SessionExpiredDialog />` once at the end of this layout — it
   receives the `session-expired` event `query-provider` and `lib/auth-client.ts`
   dispatch on a mid-page 401 (no navigation, so `proxy.ts` can't see it);
   without it every button just silently fails until a lucky refresh.
3. Logout buttons use `<form action={logoutAction}>` (SSO uses
   `ssoLogoutAction`) — never `signOut()` from the auth-client
4. **Identity block in the shell** — `<NavUser>` in the sidebar footer (or the
   topbar's right dropdown) fed from the session: `name`, `email`, `roleName`,
   `authType`. Project rows (employee code, position, department) go in via
   `extraRows`; DESIGN.md §3 fixes the placement and the two menu items, so
   "who am I / sign out" sits in the same spot in every app.
5. First deployment: log in → the layout gate (step 2) lands on `/admin/setup`
   → one click → Administrator role → redirects to `/admin/users`, which now
   really exists. Keep this line in `docs/admin-handoff.md` ("หลังระบบขึ้นแล้ว", Thai): *คนแรกที่ login จะถูกพาไปหน้า `/admin/setup` และกดปุ่มเดียว
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
7. **[SSO/LDAP] `lib/after-login.ts`** is already called from both login paths
   (SSO session hook, `ldapLoginAction` — after the directory refresh): it
   applies a pre-assigned role and, with mail installed, mails the
   `users:update` holders once when someone logs in with no role. It swallows
   every error — login never fails or waits on it. Without mail yet, delete its
   `[MAIL]` lines; mail-setup §4.6 restores them (`references/org-identity.md` §4)

### 5.6 Sidebar: merge into the existing shell, or use the fallback

Check FIRST whether the project already has an app shell with a sidebar/nav
(`app/(app)/layout.tsx`, a design-setup shell, or any layout that renders a
menu). The standalone `<AdminNav>` default exists **only** for projects with
no shell — shipping it into one that has a shell produces two competing
sidebars.

**Project already has a sidebar** (the normal case for existing projects —
**mandatory in preserve mode**; `scripts/verify.mjs` fails when a layout
with a nav exists and `<AdminNav>` is still rendered anywhere):

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
   **Keep the badge**: the layout feeding the nav calls `getAdminNavBadges(perms)`
   (`lib/admin-badges.ts`); render `<SidebarMenuBadge>` for a count > 0, as `<AdminNav>` does.
2. In `app/(admin)/layout.tsx`, keep the guard (session →
   `syncPermissionsIfNeeded()` → permission check) but delete the shell —
   render `<PageShell>{children}</PageShell>` (`ui/page-shell`) so the pages sit
   inside the project's own shell — plain `{children}` drops the fallback's
   `p-6`, the only padding the admin pages have, and they render flush against
   the sidebar and the right edge
   (nest the `(admin)` group under the shell's layout, or move the three admin
   pages under the project's protected route group with the guard preserved).

**No shell yet** (fresh project only — never a project that already renders
a menu): copy as-is — the (admin) layout wraps
`SidebarProvider` + `<AdminNav>` (shadcn Sidebar with `NavUser` in the footer)
and works out of the box. Requires the `sidebar` + `tooltip` components (§5.1
installs them) and `TooltipProvider` in the root layout. When the project
later grows its own shell, migrate as above — and remove this fallback so
there is exactly one sidebar and one NavUser.

### 5.7 Remove the prototype login (any project that had one)

Prototypes (AI Studio, v0, demos) often ship a fake gate — a `useAuth` context
with a hard-coded user, a login page comparing against a constant, a
`token`/`user` key in `localStorage`, an `isLoggedIn` flag. Better Auth installed
**beside** it changes nothing: the old gate still decides who gets in. Find it
(`scripts/verify.mjs` warns on these patterns until they are gone):

```bash
grep -rn "mockUser\|MOCK_USER\|mockSession\|fakeAuth\|DEMO_USER\|isLoggedIn\|localStorage\.\(get\|set\)Item(['\"]\(token\|user\|auth\|session\|currentUser\)" app components lib src 2>/dev/null
```

Keeping the project's routes and redirect targets (preserve mode): (1) replace
every read of the fake user with the real session (`auth.api.getSession` server,
`authClient.useSession()` client) and every role check with
`getUserPermissions()`; (2) keep the project's login page wired to
`lib/actions/auth.ts` **or** swap in the kit page — record which in DESIGN.md
§10; (3) delete the fake gate, its provider and storage keys — two gates is not
"extra safety", the mock one still lets people through.

**Existing menus under RBAC** (§3 Q8): per chosen menu, declare a
`resource:action` key in `ALL_PERMISSIONS` (the step-6 sync seeds it into the
`/admin/roles` checklist), filter the menu item by it, and guard its
page/Server Action — a key without the check is a checkbox that does nothing.

## 6. Placeholders used across the assets

Full table, substitution rules and why the login `<h1>` needs no placeholder:
`references/placeholders.md`. One trap worth repeating: `env.example`/`.env.local`/`.env`
must be substituted too — `verify.mjs` scans all three, not just `.ts`/`.tsx`/`.prisma`.

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
| After **any** `better-auth` bump (patch included), diff every plugin's `node_modules/better-auth/dist/plugins/<plugin>/schema.mjs` against `prisma/schema.prisma` and migrate the delta | Assume a minor/patch bump is schema-neutral — Better Auth adds required fields/rows without a migration, and the failure shows up as an unrelated 400/500 in a login step (e.g. twoFactor ≥1.6.24, see `references/troubleshooting-upgrades.md`) |

## 8. Verification Checklist

**Run the script first** (cwd = target project root):

```bash
node <skill-dir>/scripts/verify.mjs
```

It checks leftover placeholders, unremoved `[METHOD: …]` markers, the guard
file name + `config` export, the cookie prefix in all 3 files, audit constants,
the schema, mis-called APIs, and the org-identity rules (§2 items 10–11).

Everything the script cannot see — login through every selected method, logout,
the reset-link flows, scope/approval behaviour, the admin pages, security
headers, i18n — is the by-hand list in **`references/verification.md`**. Walk it
before calling an install done.
