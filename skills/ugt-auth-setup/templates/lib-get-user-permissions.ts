import { prisma } from '@/lib/prisma';

/**
 * Load all permission keys for a user from their assigned role.
 * Returns an empty array if the user has no role.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      userRole: {
        select: {
          permissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
    },
  });

  return user?.userRole?.permissions.map((rp) => rp.permission.key) ?? [];
}

/**
 * Check whether the admin system has been initialised (at least one system role exists).
 * Used by the (admin-setup) flow to redirect away when already set up.
 */
export async function isAdminInitialized(): Promise<boolean> {
  const count = await prisma.role.count({ where: { isSystem: true } });
  return count > 0;
}
