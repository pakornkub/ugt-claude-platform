import { AppShellHeader, AppShellSidebar } from '@/components/app-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * Shell ของทุกหน้าที่อยู่หลัง login — หน้า login / setup ของ auth-setup อยู่นอก
 * route group นี้ จึงไม่ถูกครอบด้วย sidebar (ตามที่ตั้งใจ)
 *
 * layout นี้เป็น Server Component — เมนู (มี lucide icon) สร้างใน `components/app-nav.tsx`
 * ฝั่ง client แล้ววาดทั้ง sidebar และ header จากชุดเดียวกัน ห้ามส่ง NAV_ITEMS เป็น prop
 * จากที่นี่ (RSC serialize component ไม่ได้ — references/nav-config.md ของ design-setup)
 * `SiteHeader` เป็นลูกคนแรกของ `SidebarInset` เสมอ (DESIGN.md §3)
 */
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SidebarProvider>
      <AppShellSidebar />
      <SidebarInset>
        <AppShellHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
