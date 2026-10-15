# Org identity — pre-assigned roles, "no role yet", org email domains

SKILL.md §2 items 10–11 in full. Three features that share one premise: an
SSO/LDAP person's identity is the **AD username + the HR employee record**,
never an email and never a row someone typed.

Contents: §1 Why pre-assignment is not pre-registration · §2 Pre-assigned
roles · §3 "ยังไม่มีบทบาท" · §4 Admin mail · §5 Org email domains · §6 Removal
matrix · §7 Existing projects → `org-identity-migration.md`.

| Piece | Files | Needs |
| --- | --- | --- |
| Pre-assigned roles | `lib/actions/admin-preassign.ts` · `components/preassign-manager.tsx` · `lib/after-login.ts` (apply) · `PendingRoleAssignments` | SSO/LDAP **and** `lib/directory.ts` (`[DIRECTORY]`) |
| "ยังไม่มีบทบาท" visibility | `/admin/users` tabs · `lib/admin-badges.ts` · `ADMIN_NAV_ITEMS[].badgeLabelKey` | nothing extra |
| Admin mail on a first login without a role | `lib/after-login.ts` `[MAIL]` · `User.NoRoleNotifiedAt` · mail key `auth.user-without-role` | SSO/LDAP **and** `ugt-nextjs-mail-setup` |
| Org email domains | `lib/org-email.ts` · `ORG_EMAIL_DOMAINS` | SSO or LDAP (empty = off) |

## 1. Why pre-assignment is not pre-registration (มติ 2026-08-11, amended 2026-10-14)

มติ 2026-08-11 forbade creating SSO/LDAP accounts by hand for two reasons, and
both still hold:

1. **An unverified row is a linking target.** Better Auth links an SSO login
   into any existing user with the same email. A row an admin made ahead of
   time is a row the IdP never vouched for — whoever ends up holding it (a
   typo, a reused mailbox, a Local password) inherits the employee.
2. **A typed username duplicates people.** The HRMS original let admins type
   `ldapUsername`; one wrong character and the real login created a second row
   beside the pre-made one.

The amendment allows **assigning a role ahead of time**, because it creates
neither of those:

- No `User`/`Account` row is written — only `PendingRoleAssignments`, which
  Better Auth never reads, so there is nothing to link into. `verify.mjs`
  fails if `admin-preassign.ts` ever creates a user/account row.
- Nothing is typed. The admin searches the HR view and picks a result; the
  client sends only the chosen `EmpCode`, and `createPreassignAction`
  re-resolves the person from the view **server-side** to get `ADLoginName`.
- The account still appears on the person's first successful SSO/LDAP login,
  exactly as before. The role is applied then, by the same hook that refreshes
  directory fields.

Still forbidden: self-registration, and creating any SSO/LDAP account before
its first login.

## 2. Pre-assigned roles — the flow

```
/admin/users → tab "ตั้งล่วงหน้า (รอเข้าระบบ)" → เพิ่มจาก HR
  searchHrForPreassignAction(q)  → searchDirectory (read-only, [] when the linked server is down)
     status per person: available · has-account · pending · no-ad (no ADLoginName = can never log in)
  createPreassignAction({ empCode, roleId })
     → getDirectoryPersonByEmpCode (identity from the view, not the client)
     → refuse if a User already has that EmpCode/ldapUsername (USER_ALREADY_EXISTS — use the All tab)
     → PendingRoleAssignments { EmpCode @unique, LoginName @unique, FullName, Email, RoleId, CreatedBy }
     → audit users.preassign-create

first SSO/LDAP login → directory refresh → afterOrgLogin({ userId, loginName, person })
  loginName: SSO = preferred_username from the stored id_token (written onto
             User.ldapUsername by the session hook; held by another row →
             null) · LDAP = the directory's
             sAMAccountName of the bound account — never the typed text, never
             the email; unknown → null (no lookup, no pending role)
  match:   person.empCode when the directory answered · loginName when it is down
           (never email)
  apply:   one interactive $transaction — deleteMany(id + roleId) first; only
           count === 1 goes on (a parallel login, or a role edited meanwhile,
           gets 0 → no second apply, no second audit), then user.roleId =
           pending.roleId only WHERE roleId IS NULL (an admin's choice wins)
  audit:   users.preassign-apply (actor = the person; detail.setBy = the admin)
```

- Edit = change the role inline (`users.preassign-update`); delete =
  `ConfirmActionDialog` (`users.preassign-delete`). All three need
  `users:update` — the same permission as assigning a role on the All tab.
- Applying runs on **every** SSO/LDAP login, not just the first: one indexed
  lookup, and it covers a pending row created while the person was mid-login.
- Deleting a role cascades to its pending rows (`onDelete: Cascade`).
- Setting **or removing** a user's role on the All/no-role tab
  (`assignUserRoleAction`) deletes any pending row with that user's EmpCode /
  ldapUsername, so an explicit "no role" is not undone at the next login. Each
  removed row is audited `users.preassign-delete` with
  `reason: 'superseded-by-role-assign'`.
- Editing a pending row's role audits `previousRoleId` + `roleId`.
- No `IsActive`/`IsDeleted`: a pending row is an intent consumed on login;
  its history is the `users.preassign-*` audit trail. Record it with the auth
  tables' `⚠ deviation` line (`schema-and-env.md`).
- The HR view may hold resigned staff. If yours has a status column
  (`workstatus`), filter `searchDirectory` on it — the kit cannot know the
  values.

## 3. "ยังไม่มีบทบาท" — visibility

- `/admin/users` has three tabs: **ทั้งหมด · ยังไม่มีบทบาท · ตั้งล่วงหน้า
  (รอเข้าระบบ)**. `?tab=no-role|pending` opens one directly (the admin mail
  links to `?tab=no-role`); the page renders `<AdminUsersTabs key={activeTab}>`
  so a soft navigation to another `?tab=` re-mounts it, and the tab strip
  scrolls sideways on a phone. Picking a role in the no-role tab drops the row
  out of it.
- The users menu item shows a badge = users with `roleId IS NULL`.
  `getAdminNavBadges(perms)` (`lib/admin-badges.ts`, server) returns
  `{ [href]: count }` — empty unless the viewer holds `users:read`. The
  fallback `(admin)/layout.tsx` passes it to `<AdminNav badges>`; a project
  sidebar merged per §5.6 calls the same function in its own layout and
  renders `<SidebarMenuBadge>` + the sr-only `badgeLabelKey` text.

## 4. Admin mail on a first login without a role

`afterOrgLogin` → `notifyAdminsIfNoRole` (`[MAIL]`): when the user still has no
role after the pending check, claim `User.NoRoleNotifiedAt` (an `updateMany …
WHERE NoRoleNotifiedAt IS NULL`, so parallel logins send one mail), then send
`auth.user-without-role` to every user whose role holds `users:update`.

- **Never makes login fail or wait**: the call is fire-and-forget (a dead relay
  can hold a socket for minutes) and every error is logged and swallowed.
- Send failed, or no admin exists yet (before `/admin/setup`) → the claim is
  released and the next login tries again.
- On the dev deployment (`isDevEnvironment()`, basePath ending `-dev`) the
  subject gets `[DEV] ` via `sendTemplatedMail({ subjectPrefix })` — the mail
  still reaches the real admins, so they must see where it came from. The
  greeting name (`ADMIN_RECIPIENT_NAME`) lives with the mail defaults in
  `lib/types/mail-templates.ts`, not in the kit file.
- No mail module → delete the `[MAIL]` lines (imports of `sendTemplatedMail` /
  `env` / `PERMISSIONS` / `ADMIN_RECIPIENT_NAME` / `isDevEnvironment`, the
  `void notifyAdminsIfNoRole(…)` call, the function). Tab + badge keep working. Installing mail later = mail-setup §4.6
  puts them back; `verify.mjs` of both skills checks the pairing.

## 5. Org email domains — `ORG_EMAIL_DOMAINS`

Comma list, **first = canonical** (`ube.com,ube.co.th`). Each entry must be a
hostname — `ube.com;ube.co.th` or a space-separated list throws at startup
(`parseOrgDomains`) instead of silently matching nothing. Declared in
`lib/env.ts` server block as `z.string().optional()`; env section 3 and both
compose files (`[AUTH]`).

| Where | What |
| --- | --- |
| `lib/directory.ts` | every result's email → canonical (search list, pending row snapshot, enrichment) |
| SSO `mapProfileToUser` | a **new** identity's email → canonical; an existing row keeps its stored email for the lookup, then the session hook rewrites it canonical (own `update`, so a unique clash cannot drop the directory refresh) |
| LDAP `ldapLoginAction` | AD's email → canonical before the upsert |
| `/admin/users` | displays canonical (legacy rows until their next login) |
| `createLocalUserAction` · `create-first-user.ts` | **refuse** any org domain — `ORG_EMAIL_NOT_LOCAL` |
| `lib/auth.ts` `hooks.before` on `/sign-in/email` + `localLoginAction` | **refuse** Local sign-in with an org email — `ORG_EMAIL_USE_SSO` |

### The shared-account hole, and how each path closes it

Someone holding a **Local password on an employee's org mailbox** shares that
row with the employee once SSO links into it: two people, one identity, one
role. Closed on every path:

- **SSO** — no `preferred_username`/`sub` in the profile → refused. Every SSO
  refusal is `APIError('FOUND')` → `/login?error=sso_refused` (reason in the
  server log); a plain `Error` would be a bare 500 on the OAuth callback.
  `mapProfileToUser` resolves the row by `ldapUsername` first. When none
  exists, any other row holding the mailbox (all domain spellings, via
  `orgEmailVariants`) that is **not linked to this Keycloak subject**
  (`accounts: { none: { providerId: 'keycloak', accountId: sub } }` — a Local
  row, or another AD identity sharing the mail) is not this identity → the
  login is refused (fail closed — no `.catch`). Better Auth is
  never handed an email it could link into a Local row.
- **LDAP** — `ldapBind` looks up the account the bind authenticated
  (`userPrincipalName` first, then the implicit `sAMAccountName` form) and
  everything after keys on its `sAMAccountName`. The upsert is keyed on
  `ldapUsername`; a row holding the mailbox
  whose `ldapUsername` is NULL or different → `ORG_ACCOUNT_CONFLICT`
  (`login.failed` with `conflictUserId`). Prisma's `NOT { ldapUsername }`
  drops NULL rows, hence the explicit `OR: [{ ldapUsername: null }, …]`.
- **Local** — cannot be created on an org domain, and cannot sign in with one
  (the hook covers rows created before the rule and direct API calls).

Identity stays the AD username (`login-flows.md` §SSO); the email is only ever
normalized, never trusted as a key.

## 6. Removal matrix

| Project has | Delete |
| --- | --- |
| no HR view (§3 Q6 = no) | `[DIRECTORY]` parts: `admin-preassign.ts`, `preassign-manager.tsx`, the pending tab + query in the users page, `applyPendingRole` + its call in `lib/after-login.ts`, the pending-row cleanup in `assignUserRoleAction` (`admin-users.ts`), the "ตั้งล่วงหน้า" clause of `addUserHintSso` (th + en) and of the `auth.user-without-role` default (mail), the `pendingRoleAssignment` model + `role.preassigns`, the `USERS_PREASSIGN_*` actions |
| no mail | `[MAIL]` parts of `lib/after-login.ts` (keep `noRoleNotifiedAt` — mail may come later) |
| neither SSO nor LDAP | `lib/after-login.ts`, `lib/org-email.ts` (+ its imports in the Local paths), `ORG_EMAIL_DOMAINS` |

## 7. Existing projects (kit-sync)

→ moved to `org-identity-migration.md` (the SELECTs, re-assigning the admin, deploy, pre-assign, clean-up).
