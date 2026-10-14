'use client';

// เมนูของ shell = NAV_ITEMS ของโปรเจค + ADMIN_NAV_ITEMS ของ auth-setup รวมเป็นชุดเดียว
// (auth-setup SKILL.md §5.6 — โปรเจคที่มี sidebar อยู่แล้ว merge เมนู admin เข้ามา
// ไม่ใช้ <AdminNav> แยก) · sidebar กับ breadcrumb ใช้ hook ตัวเดียวกันเสมอ
// ไม่งั้นสองที่จะพูดไม่ตรงกัน (DESIGN.md §3)
//
// กรองตามสิทธิ์ที่นี่เป็นแค่ UX ("ซ่อนตามสิทธิ์ ไม่ disable") — ด่านจริงคือ guard
// ฝั่ง server ใน app/(app)/admin/layout.tsx และในทุก Server Action
import { useTranslations } from 'next-intl';

import { ADMIN_NAV_ITEMS } from '@/components/admin-nav';
import { NAV_ITEMS, type NavItem } from '@/components/nav-items';
import { SiteHeader } from '@/components/site-header';

export interface ShellNavItem extends NavItem {
  /** ข้อความ sr-only คู่กับตัวเลข badge (ตัวเลขเปล่า ๆ ไม่มีความหมายกับ screen reader) */
  badgeSrLabel?: (count: number) => string;
}

export function useShellNavItems(perms: readonly string[]): ShellNavItem[] {
  const t = useTranslations('auth.adminNav');
  const appItems = NAV_ITEMS.filter((item) => !item.permission || perms.includes(item.permission));
  const adminItems = ADMIN_NAV_ITEMS.filter((item) => perms.includes(item.perm)).map(
    ({ href, labelKey, icon, perm, badgeLabelKey }): ShellNavItem => ({
      label: t(labelKey),
      href,
      icon,
      group: t('systemGroup'),
      permission: perm,
      badgeSrLabel: badgeLabelKey ? (count) => t(badgeLabelKey, { count }) : undefined,
    })
  );
  return [...appItems, ...adminItems];
}

/** SiteHeader ที่ได้ breadcrumb จากเมนูชุดเดียวกับ sidebar (รวมเมนู admin) */
export function AppSiteHeader({ perms }: Readonly<{ perms: readonly string[] }>) {
  return <SiteHeader items={useShellNavItems(perms)} />;
}
