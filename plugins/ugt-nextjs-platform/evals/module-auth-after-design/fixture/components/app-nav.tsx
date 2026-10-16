'use client';

// ตัวต่อระหว่าง layout (Server Component) กับ shell ฝั่ง client — references/nav-config.md
// ของ design-setup. list เมนูมี icon (component) ซึ่ง RSC serialize ไม่ได้ จึงสร้างที่นี่ฝั่ง
// client แล้ววาดทั้ง sidebar และ header จากชุดเดียวกัน · layout ส่งมาได้แค่ข้อมูลธรรมดา
// (สิทธิ์ · ตัวตนของ NavUser · badge) — ตอนนี้ยังไม่มี login จึงยังไม่ต้องรับอะไร
// ugt-nextjs-auth-setup: กรองตามสิทธิ์ + merge เมนู admin ใน useShellNav และส่ง
// <NavUser /> เข้า `footer` ของ AppSidebar
import { AppSidebar } from '@/components/app-sidebar';
import { NAV_GROUPS, NAV_ITEMS } from '@/components/nav-items';
import { SiteHeader } from '@/components/site-header';

function useShellNav() {
  return { items: NAV_ITEMS, groups: NAV_GROUPS };
}

export function AppShellSidebar() {
  return <AppSidebar {...useShellNav()} appName="ระบบคำขอลา" />;
}

/**
 * ช่อง `actions` ว่างในโปรเจคนี้ — ไทยภาษาเดียว (ไม่มี LanguageSwitcher) และ
 * ไม่มี dark mode (ไม่มี ThemeToggle)
 */
export function AppShellHeader() {
  return <SiteHeader {...useShellNav()} />;
}
