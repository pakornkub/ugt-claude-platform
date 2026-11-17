// kit: ugt-nextjs-platform 4.91.0 · ugt-nextjs-auth-setup/lib/actions/admin-setup.ts
// kit-hash: c7c308a4b546
'use server';

// lib/actions/admin-setup.ts — first-admin bootstrap Server Action.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { generateId } from 'better-auth';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncPermissionsIfNeeded } from '@/lib/permissions-sync';
import { isAdminInitialized } from '@/lib/get-user-permissions';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';

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
  code: string;
} | void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { code: 'UNAUTHORIZED' };

  const alreadyDone = await isAdminInitialized();
  if (alreadyDone) return { code: 'ALREADY_INITIALIZED' };

  // 1. Seed permissions — upsert เสมอ ห้าม createMany เปล่า: isAdminInitialized
  // เช็คแค่ role ระบบ ไม่ได้เช็คตาราง Permission — bootstrap รอบก่อนที่พังกลางคัน
  // (seed สำเร็จแต่ยังไม่ได้สร้าง role) จะทิ้งแถวไว้ แล้ว retry ชน unique key ค้าง
  // อยู่หน้า setup ตลอด (skipDuplicates ก็ใช้ไม่ได้บน SQL Server)
  await syncPermissionsIfNeeded();

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

  // 5. Audit — คนแรกที่ได้สิทธิ์ทั้งระบบต้องมีร่องรอย (contract auth.md: audit
  // หลังทุก privileged mutation) · non-blocking เหมือน auditLog ใน admin-roles.ts
  await prisma.activityLog
    .create({
      data: {
        userId: session.user.id,
        action: AUDIT_ACTIONS.ADMIN_BOOTSTRAP,
        detail: JSON.stringify({ roleId: adminRole.id, roleName: adminRole.name, permissionCount: permissions.length }),
      },
    })
    .catch(() => {});

  redirect('/admin/users'); // shipped by ugt-nextjs-auth-setup's (admin) route group
}
