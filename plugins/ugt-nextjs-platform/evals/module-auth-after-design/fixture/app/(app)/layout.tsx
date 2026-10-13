import { AppSidebar } from '@/components/app-sidebar';
import { NAV_ITEMS } from '@/components/nav-items';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * Shell ของทุกหน้าที่อยู่หลัง login — หน้า login / setup ของ auth-setup อยู่นอก
 * route group นี้ จึงไม่ถูกครอบด้วย sidebar (ตามที่ตั้งใจ)
 *
 * `SiteHeader` เป็นลูกคนแรกของ `SidebarInset` เสมอ และรับ nav ชุดเดียวกับที่
 * sidebar วาด เพื่อให้ breadcrumb กับเมนูพูดตรงกัน (DESIGN.md §3)
 * ช่อง `actions` ว่างในโปรเจคนี้ — ไทยภาษาเดียว (ไม่มี LanguageSwitcher) และ
 * ไม่มี dark mode (ไม่มี ThemeToggle)
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader items={NAV_ITEMS} />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
