# Schema and env schema — the auth tables' exceptions and every auth env var

Detail for SKILL.md §5.3 (paste the auth schema) and §5.4 (declare the env
vars in `lib/env.ts`).

## Auth-table exception

**Naming-rule exception — 8 tables, not 5**: `User`, `Session`, `Account`,
`Verification`, `RateLimit`, `Role`, `Permission`, `RolePermission` map to
**singular** names (Better Auth's own convention for the first five; the
last three share the form because they live in the same file and are read
together) — an explicit exception to the org's PascalCase-**plural** rule.
Do not pluralize them. `ActivityLogs` is the one plural in the set, and
both `verify.mjs` scripts enforce exactly this list.
**The same exception covers the audit columns and hard delete**: these
tables carry no `CreatedBy`/`UpdatedBy`/`IsActive`/`IsDeleted`, and the
shipped actions really do call `prisma.role.delete` / `prisma.user.delete`
instead of `IsDeleted = 1` — Better Auth owns these rows (it writes and
deletes them itself and never reads our columns), and `Session`/`Account`
cascade from `User`, so a soft-deleted user would keep working sessions.
**Record it during install** as a `⚠ deviation` line in
`docs/project-context/architecture.md` — `contracts/database.md` requires
that line for every audit-column / soft-delete exemption, e.g.
*⚠ deviation: ตาราง auth ทั้ง 8 ไม่มี audit columns และใช้ hard delete —
Better Auth เป็นเจ้าของแถว (ugt-nextjs-auth-setup §5.3)* — and, when the HR view
is installed, one more for `PendingRoleAssignments` (plural, app-owned, has
`CreatedBy`/`UpdatedBy` but no `IsActive`/`IsDeleted`: a pending row is consumed
on login and its history is the `users.preassign-*` audit trail):
*⚠ deviation: PendingRoleAssignments ไม่มี IsActive/IsDeleted และลบจริงเมื่อใช้ role
แล้วหรือแอดมินลบ — ประวัติอยู่ใน ActivityLogs (ugt-nextjs-auth-setup org-identity.md)*

## Env schema

What `lib/env.ts` (or equivalent) declares for auth:

- `BETTER_AUTH_SECRET` → `z.string().min(32)` (required)
- `BETTER_AUTH_URL` → **required** (`z.url()`), not optional: Better Auth decides
  the `__Secure-` cookie prefix from `baseURL`'s scheme and falls back to
  `NODE_ENV` when it is empty — unset in production means the name it sets and
  the name `lib/actions/auth.ts` looks for disagree → redirect loop
- `BETTER_AUTH_TRUSTED_ORIGINS` → optional string
- `KEYCLOAK_ISSUER/CLIENT_ID/CLIENT_SECRET` → required only when SSO is on
  (the code in `lib/auth.ts` already guards `undefined` to survive `SKIP_ENV_VALIDATION=1`)
- `LDAP_URL/LDAP_BASE_DN/LDAP_DOMAIN` → required only when LDAP is on
- `ORG_EMAIL_DOMAINS` → `z.string().optional()` (server block + `runtimeEnv`) —
  comma list, first = canonical; empty turns normalization and the Local-account
  refusal off (`org-identity.md` §5)
- `NEXT_PUBLIC_BASE_PATH` → `z.string().default('')` — **must** live in the
  t3-env `client` block **and** be listed in `runtimeEnv` (otherwise undefined at
  runtime). That declaration is what **server** files import from `@/lib/env`;
  **client** components read `process.env.NEXT_PUBLIC_BASE_PATH` directly instead,
  because a `createEnv()` wrapper comes back empty in the client bundle under
  Turbopack (`troubleshooting-session.md` §basePath and proxy.ts)
- `NEXT_PUBLIC_APP_NAME` → optional string (login-form.tsx displays it) — also
  in the `client` block + `runtimeEnv`
