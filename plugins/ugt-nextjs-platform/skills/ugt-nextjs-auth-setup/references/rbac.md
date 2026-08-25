# RBAC — org model, guard pattern, first-admin bootstrap

Custom RBAC backed by Prisma (NOT Better Auth's organization plugin). Every user
has **at most one role**; every role has a set of permissions.

## Data model

```
user (1) ── (0..1) role (1) ── (M) rolePermission (M) ── (1) permission
```

Models live in `assets/prisma/schema-auth.prisma`. Key points:

- `user.roleId String?` + `userRole role?` relation — nullable: a user with no
  role has zero permissions.
- `role.isSystem Boolean` — system roles (the bootstrap Administrator) cannot be
  deleted via any code path. Check before delete:
  `if (role?.isSystem) return { success: false, code: 'SYSTEM_ROLE_DELETE_BLOCKED' };`
- `permission.key` is unique — e.g. `users:read`. Column mapped to `PermKey`
  because `KEY` is T-SQL reserved (`GROUP` likewise → `GroupName`).
- `rolePermission` M:N join with `@@id([roleId, permissionId])` and cascade
  deletes on both sides.

## Permission naming convention — `resource:action`

| Situation | Key pattern | Example |
| --- | --- | --- |
| Page/layout guard (view access) | `resource:read` | `users:read`, `roles:read` |
| Create / Update / Delete | `resource:create` etc. | `users:create` |
| Data visibility scope (all vs. own records) | `resource:read-all` | `reports:read-all` |
| Acting on behalf of others | `resource:manage-all` | `requests:manage-all` |
| Custom action | `resource:custom-verb` | `users:reset-password` |

Rules:

- All keys defined as constants in `PERMISSIONS` (`lib/permissions.ts`) — never
  raw strings inline.
- A section layout guard (e.g. `/admin/*`) is **derived** from sub-permissions —
  no separate `admin:read` key:
  ```ts
  const canAdmin = [PERMISSIONS.USERS_READ, PERMISSIONS.ROLES_READ, PERMISSIONS.AUDIT_LOGS_READ]
    .some((p) => hasPermission(userPermissions, p));
  ```
- Separate **read-all** (can see others' data) from **manage-all** (can act on
  others' behalf) — never overload one key for both.

## Loading + checking permissions

```ts
const perms = await getUserPermissions(session.user.id); // string[] via role chain
if (!hasPermission(perms, PERMISSIONS.ROLES_DELETE)) { /* forbidden */ }
```

**Only check keys that exist in `lib/permissions.ts`.** There is no
`users:delete` key on purpose (nothing in the kit deletes users — SSO/AD rows
appear on first login, มติ 2026-08-11). `PERMISSIONS.USERS_DELETE` compiles to
`undefined`, and `hasPermission(perms, undefined)` is `false` for everybody —
a permanent 403 with no error message anywhere.

`getUserPermissions` returns `[]` for users without a role → `hasPermission`
returns `false` for everything. Load permissions **server-side only**; pass them
to Client Components as props — never call `getUserPermissions` from a Client
Component or store permissions in client state.

## Server Action guard pattern (org contract)

Every privileged Server Action: **session → permission → action → audit log**.

```ts
'use server';

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  // 1. Session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  // 2. Permission — a key that really exists in lib/permissions.ts
  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.ROLES_DELETE)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  // 3. Domain checks + action
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_DELETE_BLOCKED' };
  // Holders fall back to "no role" (user.roleId is nullable) — the delete is
  // never blocked by them.
  await prisma.$transaction([
    prisma.user.updateMany({ where: { roleId }, data: { roleId: null } }),
    prisma.role.delete({ where: { id: roleId } }),
  ]);

  // 4. Audit log (non-blocking — .catch(() => {})), action from the constants
  await prisma.activityLog.create({
    data: { userId: session.user.id, action: AUDIT_ACTIONS.ROLES_DELETE, detail: JSON.stringify({ targetId: roleId }) },
  }).catch(() => {});

  revalidatePath('/admin/roles');
  return { success: true };
}
```

The `code` is a SCREAMING_SNAKE_CASE key looked up client-side in the
`auth.errors` message catalog and translated for display — see
`lib/use-field-error.ts` or the guard pattern in `lib/actions/admin-roles.ts`
for a worked example.

Same shape for Server Component page guards (`redirect('/login')` /
`redirect('/')`) and API route handlers (401/403 JSON).

## UI-level guards

- **Hide, don't disable** buttons the user lacks permission for (disabled
  buttons leak feature existence).
- Sidebar items gated per-permission; a menu item leading to a Forbidden page is
  a UX defect.
- UI hiding is UX only — the Server Action guard is the security boundary.

## First-admin bootstrap flow

Route group `(admin-setup)` → `/admin/setup` (templates in
`assets/app/(admin-setup)/`):

1. Layout: any authenticated session may enter (permissions don't exist yet).
2. Page: `isAdminInitialized()` (`role.count({ where: { isSystem: true } }) > 0`)
   → already done? `redirect('/admin/users')`.
3. Action `initializeAdminAction`:
   1. session check + `isAdminInitialized()` re-check (idempotent)
   2. seed **ALL_PERMISSIONS** → `permission.createMany` (table known empty)
   3. create `Administrator` role, `isSystem: true`, connected to every permission
   4. assign `roleId` to the current user
   5. `redirect('/admin/users')`

Operational flow for a fresh deployment: first person logs in (any method) →
visits `/admin/setup` → clicks once → becomes Administrator → lands on
`/admin/users`, described below.

## Ongoing admin pages (route group `(admin)`, templates in `assets/app/(admin)/`)

Everything after bootstrap — managing who has what, day to day:

| Route | What it does | Guard |
| --- | --- | --- |
| `/admin/users` | List users (kit `DataTable`, client mode), assign/unassign a role inline (`UserRoleSelect`) | view: `USERS_READ` · change: `USERS_UPDATE` |
| `/admin/roles` | Create/edit/delete roles (kit `DataTable`, client mode) with a permission-checkbox grid, grouped by `permission.group` | `ROLES_READ` / `_CREATE` / `_UPDATE` / `_DELETE` |
| `/admin/audit-logs` | Read-only `ActivityLogs` viewer — kit `DataTable` **server mode**: filter/sort/page ทั้งหมดผ่าน URL, query ใน page ตรง ๆ ไม่มี API route (ดู `audit-logging.md`) | `AUDIT_LOGS_READ` |

`app/(admin)/layout.tsx` is the section-level guard (same derived-permission
pattern as the example in "UI-level guards" above) plus the sidebar
(`AdminNav`, which hides links the user lacks the permission for — UI hiding
only, every action still re-checks server-side).

**A user cannot change their own role** (`assignUserRoleAction`) and **a
system role's permissions cannot be edited or the role deleted**
(`updateRoleAction` / `deleteRoleAction` both check `isSystem`) — both rules
exist for the same reason: without them, an admin can lock everyone (including
themselves) out with one click and no one left with `ROLES_UPDATE` to undo it.

## Adding permissions after bootstrap

The bootstrap seeds once. Permissions added to `ALL_PERMISSIONS` later must be
**upserted** (safe to re-run) and attached to system roles — shipped as
`lib/permissions-sync.ts`'s `syncPermissionsIfNeeded()`:

```ts
await prisma.$transaction(
  ALL_PERMISSIONS.map((p) =>
    prisma.permission.upsert({
      where: { key: p.key },
      update: { label: p.label, group: p.group },
      create: { id: generateId(24), ...p },
    })
  )
);
```

`app/(admin)/layout.tsx` calls it on every request into the admin section, so
navigating to any admin page applies new permissions — no manual migration
needed. Note the sync only upserts by key; **renaming** a key requires a
manual SQL `UPDATE` on the permission table or users silently lose the
permission.

## Pitfalls

- **Stale constant name → silent 403**: after renaming a `PERMISSIONS` constant,
  `PERMISSIONS.OLD_NAME` compiles to `undefined`; `hasPermission(perms, undefined)`
  is always `false`. Grep all actions/route handlers for the old name after any rename.
- **Seeding with `create` instead of `upsert`** outside the bootstrap fails on
  re-run.
- **Guard only in UI**: any authenticated user can invoke a Server Action
  directly — the action-level check is mandatory.
