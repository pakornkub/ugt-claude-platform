'use server';

// lib/actions/admin-users.ts — role assignment for the (admin)/admin/users page.
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';

type ActionResult = { success: true } | { success: false; error: string };

/** Server Action guard pattern (org contract): session -> permission -> action -> audit log. */
export async function assignUserRoleAction(userId: string, roleId: string | null): Promise<ActionResult> {
  // 1. Session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { success: false, error: 'Unauthorized' };

  // 2. Permission
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.USERS_UPDATE)) {
    return { success: false, error: 'Forbidden' };
  }

  // 3. Domain checks + action
  // Changing your own role (including away from Administrator) is done by
  // another admin, never by yourself — the same "cannot act on your own
  // privileged record" rule as delete-self elsewhere in this pattern.
  if (userId === session.user.id) {
    return { success: false, error: 'Cannot change your own role' };
  }
  await prisma.user.update({ where: { id: userId }, data: { roleId } });

  // 4. Audit log (non-blocking)
  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: 'users.role-assign',
        detail: JSON.stringify({ targetId: userId, roleId }),
      },
    })
    .catch(() => {});

  revalidatePath('/admin/users');
  return { success: true };
}
