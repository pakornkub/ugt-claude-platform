// เมนูของแอป — แหล่งเดียว. `AppSidebar` วาดเมนูจากที่นี่ และ `SiteHeader`
// สร้าง breadcrumb จากชุดเดียวกัน (DESIGN.md §3: ห้าม hardcode label ของ crumb)
// เพิ่มเมนูใหม่ = เพิ่มแถวที่นี่ที่เดียว · `group` ต้องเป็นข้อความหัวข้อที่ sidebar
// แสดงจริง ไม่ใช่ชื่อหน้าอื่น
import { CalendarDays, type LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** หัวข้อกลุ่มใน sidebar — crumb แรกของ breadcrumb ใช้ค่านี้ */
  group: string;
  /** สิทธิ์ที่ต้องมีจึงจะเห็นเมนู (auth-setup เป็นคนกรอง — ไม่มี = ทุกคนเห็น) */
  permission?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'คำขอลา', href: '/leave', icon: CalendarDays, group: 'งานหลัก' },
];

/** ลำดับกลุ่มใน sidebar: งานหลัก → รายงาน → ตั้งค่า/admin (DESIGN.md §3) */
export const NAV_GROUP_ORDER: readonly string[] = ['งานหลัก', 'รายงาน', 'ตั้งค่า'];
