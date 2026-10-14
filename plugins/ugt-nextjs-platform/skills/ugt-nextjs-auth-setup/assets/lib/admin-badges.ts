// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/lib/admin-badges.ts
// kit-hash: da48770a0b4b
// installed by ugt-nextjs-auth-setup — server only (Prisma)
//
// ตัวเลขบนเมนู admin: key = `href` ของ ADMIN_NAV_ITEMS (components/admin-nav.tsx)
// เรียกจาก layout ที่วาดเมนู — fallback `(admin)/layout.tsx` หรือ sidebar ของโปรเจคเอง
// (SKILL.md §5.6) — แล้วส่งผลให้เมนูเป็น prop: ไฟล์นี้ใช้ใน Client Component ไม่ได้
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';

export async function getAdminNavBadges(perms: string[]): Promise<Record<string, number>> {
  // ไม่มีสิทธิ์เห็นหน้าผู้ใช้ = ไม่มีเหตุให้นับ (และไม่ควรรู้ด้วยว่ามีกี่คน)
  if (!perms.includes(PERMISSIONS.USERS_READ)) return {};
  // ผู้ใช้ที่ login แล้วแต่ยังไม่มี role — แท็บ "ยังไม่มี role" ของ /admin/users
  // badge พังต้องไม่ทำให้เมนูพัง → 0
  const usersWithoutRole = await prisma.user.count({ where: { roleId: null } }).catch(() => 0);
  return { '/admin/users': usersWithoutRole };
}
