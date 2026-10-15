# Org identity — migrating an existing install (kit-sync)

The order of steps for turning on the org-identity rules (`org-identity.md`) in a project that installed auth before them — moved out of `org-identity.md` §7.

Order matters — the new rules refuse some existing rows at sign-in, so find
them and move the admin role **before** the deploy that turns the rules on.

1. **Run the SELECTs** (substitute your `ORG_EMAIL_DOMAINS` — one `LIKE` per
   domain):

   ```sql
   -- (a) Local accounts on an org domain — refused at sign-in after the deploy
   SELECT u.Id, u.Email, r.Name AS RoleName, r.IsSystem FROM [User] u
   JOIN Account a ON a.UserId = u.Id AND a.ProviderId = 'credential'
   LEFT JOIN Role r ON r.Id = u.RoleId
   WHERE u.Email LIKE '%@ube.com' OR u.Email LIKE '%@ube.co.th';

   -- (b) Already-shared rows: a password AND an SSO/AD identity on one user
   SELECT u.Id, u.Email, u.LdapUsername FROM [User] u
   WHERE EXISTS (SELECT 1 FROM Account a WHERE a.UserId = u.Id AND a.ProviderId = 'credential')
     AND (u.LdapUsername IS NOT NULL
          OR EXISTS (SELECT 1 FROM Account k WHERE k.UserId = u.Id AND k.ProviderId = 'keycloak'));

   -- (c) Of (a), the ones holding a system role — e.g. the only Administrator
   SELECT u.Id, u.Email, r.Name FROM [User] u
   JOIN Account a ON a.UserId = u.Id AND a.ProviderId = 'credential'
   JOIN Role r ON r.Id = u.RoleId AND r.IsSystem = 1
   WHERE u.Email LIKE '%@ube.com' OR u.Email LIKE '%@ube.co.th';
   ```

2. **Re-assign the admin first.** If (c) returns rows — typically *your only
   Administrator is a Local account on an org domain* (made with
   `create-first-user.ts` or `/admin/users` before the rule) — give
   Administrator to an SSO/LDAP account that has already logged in **before**
   deploying; otherwise nobody can reach `/admin/users` afterwards. No such
   account yet: have the future admin log in once with SSO/AD first (the new
   row shows in "ยังไม่มีบทบาท"), then assign the role from the old Local
   session.
3. **Deploy.** Schema: `User.NoRoleNotifiedAt` + `@@index([roleId])`, the
   `pendingRoleAssignment` model, `role.preassigns` →
   `npx prisma migrate dev --name org-identity` (Local-login projects also want
   the filtered `LdapUsername` index — `schema-and-env.md` §SQL Server: one NULL
   per unique column). Env: `ORG_EMAIL_DOMAINS` in `lib/env.ts` (server +
   `runtimeEnv`), section 3 of `.env.example`/`.env.local`, the Jenkins secret
   files, the compose line uncommented. **New files** — kit-sync never offers
   them, copy by hand: `lib/org-email.ts` + `org-email.test.ts`,
   `lib/after-login.ts`, `lib/admin-badges.ts`, `components/admin-users-tabs.tsx`,
   `components/login-shell.tsx` (+ the login page, `login-page.md` §5), and
   `[DIRECTORY]` `lib/actions/admin-preassign.ts` + `components/preassign-manager.tsx`.
   **With mail**: merge mail-setup's `lib/email.ts` (`subjectPrefix`),
   `lib/types/mail-templates.ts` (`auth.user-without-role` key + definition +
   default, `ADMIN_RECIPIENT_NAME`) and `messages/mail.*`. **Merge** the changed
   kit files kit-sync lists (`lib/auth.ts`, `lib/ldap.ts`, `lib/actions/auth.ts`,
   `admin-users.ts`, `directory.ts`, `audit-actions.ts`, `admin-nav.tsx`,
   `(admin)/layout.tsx`, the users page, `users-table.tsx`, `messages/auth.*`,
   `create-first-user.ts`); a merged sidebar adds the badge (`org-identity.md` §3).
   **No HR view** (`[DIRECTORY]` removed): `afterOrgLogin` is still called at
   **both** sites — the SSO session hook in `lib/auth.ts` and `ldapLoginAction`
   in `lib/actions/auth.ts` — with `person: null`.
4. **Pre-assign** the employees found in (a)/(b) (tab ตั้งล่วงหน้า) so the role
   is waiting when their real SSO/LDAP row appears.
5. **Clean the old rows.** For a Local-only row on an org mailbox, prefer
   **changing its email** to a non-org address (it keeps its id, audit history
   and FK rows) over deleting the `User` row. For a shared row (b) the employee
   keeps SSO/AD — remove the password and its sessions, and tell the password
   holder:

   ```sql
   DECLARE @id NVARCHAR(100) = '<User.Id>';
   DELETE FROM Account WHERE UserId = @id AND ProviderId = 'credential';
   DELETE FROM [Session] WHERE UserId = @id;
   ```
