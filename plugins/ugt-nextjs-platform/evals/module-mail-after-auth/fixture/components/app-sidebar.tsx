'use client';

// Shell ของแอป — ฐานมาจาก shadcn block `sidebar-07` แล้วตัด demo (team-switcher,
// nav-projects, sample data) ออกตาม layout-shells.md แล้วเขียนเมนูจาก NAV_ITEMS
// ของโปรเจค + เมนู admin ของ auth-setup (components/app-nav.tsx) · footer = <NavUser />
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, Building, IdCard } from 'lucide-react';

import { useShellNavItems, type ShellNavItem } from '@/components/app-nav';
import { NAV_GROUP_ORDER } from '@/components/nav-items';
import { NavUser, type NavUserProps, type ProfileRow } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

// client component — อ่าน basePath จาก process.env ตรง ๆ (createEnv ว่างใน client bundle)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** ตัวตนที่ layout (server) ส่งมา — ค่า serializable ล้วน ไอคอนของแถวโปรไฟล์ประกอบที่นี่ */
export type ShellUser = Omit<NavUserProps, 'extraRows'> & {
  empCode: string | null;
  position: string | null;
  department: string | null;
};

/**
 * เมนูที่ active = href ที่ **ยาวที่สุด** ที่ match — `+ '/'` กัน `/` กลืนทุกเส้นทาง
 * และการเลือกตัวยาวสุดกัน `/leave` กับ `/leave-history` สว่างพร้อมกัน
 */
function isActive(pathname: string, href: string, items: readonly ShellNavItem[]): boolean {
  const matches = items.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  if (matches.length === 0) return false;
  const longest = matches.reduce((a, b) => (b.href.length > a.href.length ? b : a));
  return longest.href === href;
}

export function AppSidebar({
  perms,
  badges = {},
  user,
}: Readonly<{
  perms: readonly string[];
  /** `getAdminNavBadges(perms)` (lib/admin-badges.ts) — key = href */
  badges?: Record<string, number>;
  user: ShellUser;
}>) {
  const pathname = usePathname();
  const tProfile = useTranslations('app.profile');
  const items = useShellNavItems(perms);

  // งานหลัก → รายงาน → ตั้งค่า แล้วกลุ่มอื่น (จัดการระบบ) ต่อท้ายตามลำดับที่พบ (DESIGN.md §3)
  const groupOrder = [...new Set([...NAV_GROUP_ORDER, ...items.map((i) => i.group)])];
  const groups = groupOrder
    .map((group) => ({ group, items: items.filter((i) => i.group === group) }))
    .filter((g) => g.items.length > 0);

  // ข้อมูลจาก view พนักงาน HR — บัญชี local (ผู้รับเหมา) ไม่มี จึงไม่แสดงแถวว่าง
  const { empCode, position, department, ...navUser } = user;
  const extraRows: ProfileRow[] = [
    { icon: IdCard, label: tProfile('empCode'), value: empCode },
    { icon: Briefcase, label: tProfile('position'), value: position },
    { icon: Building, label: tProfile('department'), value: department },
  ].filter((row): row is ProfileRow => !!row.value);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              {/* โลโก้เป็น SVG fill="currentColor" — ต้องแสดงผ่าน CSS mask ไม่ใช่ <img>
                  ไม่งั้นรับสีจาก CSS ไม่ได้ ออกมาเป็นสีดำ (layout-shells.md) ·
                  inline style คือข้อยกเว้นค่า dynamic ที่อนุญาต (URL พก basePath) */}
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white">
                <span
                  aria-hidden
                  className="h-2 w-7 bg-primary [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain]"
                  style={{ maskImage: `url(${basePath}/brand/ube-logo-short.svg)` }}
                />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">ระบบคำขอลา</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map(({ group, items: groupItems }) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupItems.map((item) => {
                  const count = badges[item.href] ?? 0;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive(pathname, item.href, items)}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <item.icon strokeWidth={2} />
                        <span>{item.label}</span>
                        {count > 0 && item.badgeSrLabel && (
                          <span className="sr-only">{item.badgeSrLabel(count)}</span>
                        )}
                      </SidebarMenuButton>
                      {/* เป็น 0 ซ่อน · เกิน 99 = 99+ (DESIGN.md §4 ตัวเลขท้ายเมนู) —
                          ข้อความเต็มสำหรับ screen reader อยู่ใน sr-only ด้านบน */}
                      {count > 0 && (
                        <SidebarMenuBadge aria-hidden className="tabular-nums">
                          {count > 99 ? '99+' : count}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser {...navUser} extraRows={extraRows} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
