// เมนูของแอป — แหล่งเดียว (references/nav-config.md ของ design-setup). `AppSidebar` วาดเมนู
// และ `SiteHeader` สร้าง breadcrumb จากชุดเดียวกัน (DESIGN.md §3: ห้าม hardcode label ของ crumb)
// เพิ่มเมนูใหม่ = เพิ่มแถวที่นี่ที่เดียว · `group` ต้องเป็นข้อความหัวข้อที่ sidebar แสดงจริง
// ไม่ใช่ชื่อหน้าอื่น · ไฟล์นี้มี lucide icon (component) จึง import ได้เฉพาะจาก client
// component (`components/app-nav.tsx`) — Server Component ส่ง list นี้เป็น prop ไม่ได้
import { CalendarDays } from 'lucide-react';

import type { NavGroup, NavItem } from '@/lib/nav';

/** ลำดับกลุ่มใน sidebar: งานหลัก → รายงาน → ตั้งค่า/admin ล่างสุด · color = จุดสี `--cat-*` */
export const NAV_GROUPS: readonly NavGroup[] = [
  { label: 'งานหลัก', color: 'cat-1' },
  { label: 'รายงาน', color: 'cat-6' },
  { label: 'ตั้งค่า', color: 'cat-8' },
];

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'คำขอลา', href: '/leave', icon: CalendarDays, group: 'งานหลัก' },
];
