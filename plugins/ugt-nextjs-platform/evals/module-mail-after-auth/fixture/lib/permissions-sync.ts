// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/lib/permissions-sync.ts
// kit-hash: 1cecfa4e299b
import { generateId } from 'better-auth';
import { prisma } from '@/lib/prisma';
import { ALL_PERMISSIONS } from '@/lib/permissions';

/**
 * Upsert every entry in ALL_PERMISSIONS into the Permission table.
 * Safe to call on every request (see references/rbac.md "Adding permissions
 * after bootstrap") — only inserts new keys / updates label+group on existing
 * ones. Never deletes a permission that was removed from the constant; that
 * needs a manual decision (see rbac.md pitfalls — renaming a key is not the
 * same as removing one).
 *
 * Call from the (admin) layout so new permissions apply the moment anyone
 * navigates to an admin page — no manual migration step.
 */
export async function syncPermissionsIfNeeded(): Promise<void> {
  await prisma.$transaction(
    ALL_PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { label: p.label, group: p.group },
        create: { id: generateId(24), ...p },
      })
    )
  );
}
