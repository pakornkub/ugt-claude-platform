// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-auth-setup/lib/get-user-permissions.ts
// kit-hash: d13b315cc7aa
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

// จำผลบวกไว้ระดับ process — ระบบที่ bootstrap แล้วไม่ย้อนกลับเป็น "ยังไม่ตั้ง"
// (ยกเว้นล้าง DB ซึ่งมากับ restart อยู่แล้ว) จึงไม่ต้อง query ซ้ำทุก request
// จาก gate ใน app layout
let adminInitialized = false;

/**
 * Check whether the admin system has been initialised (at least one system role exists).
 * Used by the (admin-setup) flow to redirect away when already set up, and by the
 * protected app layout to send everyone to /admin/setup until the first admin exists
 * (SKILL.md §5.5 — ไม่งั้นผู้ใช้แรกเจอหน้าเปล่าโดยไม่รู้ว่าต้องไปไหน).
 */
export async function isAdminInitialized(): Promise<boolean> {
  if (adminInitialized) return true;
  const count = await prisma.role.count({ where: { isSystem: true } });
  adminInitialized = count > 0;
  return adminInitialized;
}
