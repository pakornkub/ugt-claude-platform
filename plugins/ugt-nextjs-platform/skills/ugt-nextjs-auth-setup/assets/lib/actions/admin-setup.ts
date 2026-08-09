'use server';

// lib/actions/admin-setup.ts — first-admin bootstrap Server Action.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { generateId } from 'better-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { isAdminInitialized } from '@/lib/get-user-permissions';

type PermissionIdRow = { id: string };

/**
 * Initialise the admin system:
 * 1. Seed all permission rows
 * 2. Create the "Administrator" system role with every permission
 * 3. Assign the current user to that role
 *
 * Idempotent: returns an error if a system role already exists.
 */
export async function initializeAdminAction(): Promise<{
  error: string;
} | void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: 'Not authenticated' };

  const alreadyDone = await isAdminInitialized();
  if (alreadyDone) return { error: 'Admin system already initialized' };

  // 1. Seed permissions
  // Guard: isAdminInitialized was false, so the permission table should be empty.
  // createMany without skipDuplicates is safe here. (Permissions added AFTER this
  // initial seed must be upserted by a separate sync — see references/rbac.md.)
  await prisma.permission.createMany({
    data: ALL_PERMISSIONS.map((p) => ({
      id: generateId(24),
      key: p.key,
      label: p.label,
      group: p.group,
    })),
  });

  // 2. Load all permission rows (by key to avoid stale ids)
  const permissions: PermissionIdRow[] = await prisma.permission.findMany({ select: { id: true } });

  // 3. Create Administrator role with all permissions
  const adminRole = await prisma.role.create({
    data: {
      id: generateId(24),
      name: 'Administrator',
      description: 'Full system access',
      isSystem: true, // system roles cannot be deleted via the admin UI
      permissions: {
        create: permissions.map((p) => ({
          permission: { connect: { id: p.id } },
        })),
      },
    },
  });

  // 4. Assign current user as the first admin
  await prisma.user.update({
    where: { id: session.user.id },
    data: { roleId: adminRole.id },
  });

  redirect('/admin/users'); // shipped by ugt-nextjs-auth-setup's (admin) route group
}
