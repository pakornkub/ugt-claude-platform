# Verification Checklist — the by-hand half

`scripts/verify.mjs` (SKILL.md §8) covers the machine-checkable part. Everything
below has to be exercised by a person; walk it before calling an install done.
Rows tagged `[SSO]` / `[LDAP]` / `[Local]` / `[Directory]` / `[Scope]` /
`[Approval]` only apply when that piece was installed.

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
- [ ] `BETTER_AUTH_URL` is set in **every** environment (not just dev) and its
      scheme matches how the app is really reached — an empty value in
      production picks the cookie prefix off `NODE_ENV` and loops
- [ ] The guard file matches the Next.js major: `proxy.ts` on ≥16,
      `middleware.ts` below it. Cheap proof it is loaded at all: log out, open a
      protected URL directly → you must land on `/login`, not the page
- [ ] [Local] The sign-in rate limit really fires: 6 wrong passwords in a minute
      → the 6th is refused by the limiter, not by the password check (a
      `customRules` key written with the `/api/auth` prefix silently never matches)
- [ ] `grep -rn "action: '" lib app` finds nothing — every `ActivityLogs.action`
      comes from `AUDIT_ACTIONS` in `lib/audit-actions.ts`
- [ ] `docs/project-context/architecture.md` has the `⚠ deviation` line for the
      auth tables (no audit columns + hard delete) — §5.3
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
