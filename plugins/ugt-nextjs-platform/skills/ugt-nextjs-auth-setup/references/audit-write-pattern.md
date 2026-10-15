# Audit Logging — write pattern

How code writes an `ActivityLogs` row: the order relative to the primary operation, the non-blocking form, and the export-route exception — moved out of `audit-logging.md` (rules, schema, naming, `detail` payload).

## Sequential (default) — log after the primary operation succeeds

```ts
export async function deleteRoleAction(roleId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, code: 'UNAUTHORIZED' };

  const perms = await getUserPermissions(session.user.id);
  if (!hasPermission(perms, PERMISSIONS.ROLES_DELETE)) {
    return { success: false, code: 'FORBIDDEN' };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_DELETE_BLOCKED' };

  // 1. Primary operation first
  await prisma.$transaction([
    prisma.user.updateMany({ where: { roleId }, data: { roleId: null } }),
    prisma.role.delete({ where: { id: roleId } }),
  ]);

  // 2. Audit log after success
  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: AUDIT_ACTIONS.ROLES_DELETE,
      detail: JSON.stringify({ targetRoleId: roleId }),
    },
  });

  return { success: true };
}
```

> The permission in the example is `ROLES_DELETE` on purpose: `lib/permissions.ts`
> deliberately ships **no `users:delete` key**, so an example built on
> `PERMISSIONS.USERS_DELETE` would compile to `hasPermission(perms, undefined)`
> — a permanent, silent 403 for everyone. Only check keys that exist.

`code` is a SCREAMING_SNAKE_CASE key translated client-side via the
`auth.errors` message catalog — see `lib/actions/admin-roles.ts` for a
worked example.

```ts
// ❌ reversed order — logs an operation that hasn't happened (or failed)
await prisma.activityLog.create({ ... });
await prisma.role.delete({ ... });
```

## Non-blocking — paths where audit must never block the user

```ts
const [result] = await Promise.all([
  prisma.appSetting.upsert({ ... }),
  prisma.activityLog
    .create({ data: { userId: session.user.id, action: AUDIT_ACTIONS.SETTINGS_UPDATE, detail } })
    .catch(() => {}), // ← swallow intentionally
]);
```

```ts
// ❌ no await and no catch → unhandled promise rejection
prisma.activityLog.create({ ... });
```

Every login/logout path must use the non-blocking form — an audit failure that
breaks login is the worse failure.

## Export routes — log before streaming

```ts
await prisma.activityLog.create({
  data: {
    userId: session.user.id,
    action: AUDIT_ACTIONS.EXPORT_EXCEL,
    detail: JSON.stringify({ filters, sort, rowCount: data.length }),
  },
});
return new Response(buffer, { headers: { 'Content-Type': '...' } });
```
