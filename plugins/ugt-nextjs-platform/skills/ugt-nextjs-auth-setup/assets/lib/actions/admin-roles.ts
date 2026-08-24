// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/lib/actions/admin-roles.ts
// kit-hash: adfc92e58cb4
'use server';

// lib/actions/admin-roles.ts — role CRUD for the (admin)/admin/roles page.
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { generateId } from 'better-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';

type ActionResult = { success: true } | { success: false; code: string };

// permissionIds = id ของแถวในตาราง Permission (ไม่ใช่คีย์ 'users:read') —
// เคยชื่อ permissionKeys แล้วหลอกคนต่อ caller ให้ส่งคีย์จน connect ไม่เจอแถว
type RoleInput = { name: string; description: string; permissionIds: string[] };

async function requirePermission(key: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, code: 'UNAUTHORIZED' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(key)) return { ok: false as const, code: 'FORBIDDEN' };
  return { ok: true as const, session };
}

async function auditLog(userId: string, action: string, detail: unknown) {
  await prisma.activityLog.create({ data: { userId, action, detail: JSON.stringify(detail) } }).catch(() => {});
}

export async function createRoleAction(input: RoleInput): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.ROLES_CREATE);
  if (!gate.ok) return { success: false, code: gate.code };

  if (!input.name.trim()) return { success: false, code: 'ROLE_NAME_REQUIRED' };

  const role = await prisma.role.create({
    data: {
      id: generateId(24),
      name: input.name.trim(),
      description: input.description.trim() || null,
      isSystem: false,
      permissions: {
        create: input.permissionIds.map((permissionId) => ({ permission: { connect: { id: permissionId } } })),
      },
    },
  });

  await auditLog(gate.session.user.id, 'roles.create', { roleId: role.id, name: role.name });
  revalidatePath('/admin/roles');
  return { success: true };
}

export async function updateRoleAction(roleId: string, input: RoleInput): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.ROLES_UPDATE);
  if (!gate.ok) return { success: false, code: gate.code };

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  // System roles (the bootstrap Administrator) are frozen — editing them here
  // risks stripping the only role that can undo the mistake. Rename/re-scope
  // by creating a new role instead.
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_EDIT_BLOCKED' };

  if (!input.name.trim()) return { success: false, code: 'ROLE_NAME_REQUIRED' };

  await prisma.$transaction([
    prisma.role.update({
      where: { id: roleId },
      data: { name: input.name.trim(), description: input.description.trim() || null },
    }),
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: input.permissionIds.map((permissionId) => ({ roleId, permissionId })),
    }),
  ]);

  await auditLog(gate.session.user.id, 'roles.update', { roleId, name: input.name });
  revalidatePath('/admin/roles');
  return { success: true };
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.ROLES_DELETE);
  if (!gate.ok) return { success: false, code: gate.code };

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { isSystem: true, name: true } });
  if (!role) return { success: false, code: 'ROLE_NOT_FOUND' };
  if (role.isSystem) return { success: false, code: 'SYSTEM_ROLE_DELETE_BLOCKED' };

  // Users holding this role fall back to "no role" (roleId is nullable) rather
  // than the delete being blocked — matches user.roleId's nullable design.
  await prisma.$transaction([
    prisma.user.updateMany({ where: { roleId }, data: { roleId: null } }),
    prisma.role.delete({ where: { id: roleId } }),
  ]);

  await auditLog(gate.session.user.id, 'roles.delete', { roleId, name: role.name });
  revalidatePath('/admin/roles');
  revalidatePath('/admin/users');
  return { success: true };
}
