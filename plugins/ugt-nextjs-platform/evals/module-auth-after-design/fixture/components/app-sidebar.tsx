'use client';

// Shell ของแอป — ฐานมาจาก shadcn block `sidebar-07` แล้วตัด demo (team-switcher,
// nav-projects, sample data) ออกตาม layout-shells.md แล้วเขียนเมนูจาก NAV_ITEMS
// ของโปรเจคแทน · footer เป็นที่ของ <NavUser /> ซึ่ง ugt-nextjs-auth-setup ติดตั้ง
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_GROUP_ORDER, NAV_ITEMS, type NavItem } from '@/components/nav-items';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';

// client component — อ่าน basePath จาก process.env ตรง ๆ (createEnv ว่างใน client bundle)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/**
 * เมนูที่ active = href ที่ **ยาวที่สุด** ที่ match — `+ '/'` กัน `/` กลืนทุกเส้นทาง
 * และการเลือกตัวยาวสุดกัน `/leave` กับ `/leave-history` สว่างพร้อมกัน
 */
function isActive(pathname: string, href: string, items: readonly NavItem[]): boolean {
  const matches = items.filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  if (matches.length === 0) return false;
  const longest = matches.reduce((a, b) => (b.href.length > a.href.length ? b : a));
  return longest.href === href;
}

export function AppSidebar({ items = NAV_ITEMS }: Readonly<{ items?: readonly NavItem[] }>) {
  const pathname = usePathname();
  const groups = NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((i) => i.group === group),
  })).filter((g) => g.items.length > 0);

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
                {groupItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive(pathname, item.href, items)}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon strokeWidth={2} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ugt-nextjs-auth-setup ติด <NavUser /> ตรงนี้ (avatar + ชื่อ + อีเมล + ออกจากระบบ) */}
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
