// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/lib/nav.test.ts
// kit-hash: 4b0691660222
// installed by ugt-nextjs-design-setup alongside lib/nav.ts
// ล็อกจุดที่พังเงียบของเมนู: longest-prefix (เมนูชื่อคล้ายสว่างพร้อมกัน / `/`
// กลืนทุกหน้า) · ค้นหาเมนู · และการจัดกลุ่มที่ต้องไม่ทำเมนูหายเพราะชื่อกลุ่มพิมพ์ผิด
import { describe, expect, it } from 'vitest';
import {
  NAV_GROUP_COLORS,
  NAV_GROUP_DOT,
  filterNavItems,
  findActiveHref,
  groupNavItems,
  navGroupColor,
  type NavGroup,
  type NavItem,
} from './nav';

const GROUPS: readonly NavGroup[] = [
  { label: 'งานหลัก', color: 'cat-1' },
  { label: 'รายงาน', color: 'cat-6' },
  { label: 'ตั้งค่า' },
];

const ITEMS: readonly NavItem[] = [
  { label: 'ภาพรวม', href: '/', group: 'งานหลัก' },
  { label: 'ใบลา', href: '/leave', group: 'งานหลัก' },
  { label: 'ประวัติใบลา', href: '/leave-history', group: 'งานหลัก' },
  { label: 'สรุปรายเดือน', href: '/reports/monthly', group: 'รายงาน' },
  { label: 'Users', href: '/admin/users', group: 'ตั้งค่า' },
];

describe('findActiveHref — ตัวเดียวกับที่ breadcrumb ใช้', () => {
  it('longest-prefix: /leave-history ไม่ถูก /leave แย่ง', () => {
    expect(findActiveHref('/leave-history/2026', ITEMS)).toBe('/leave-history');
    expect(findActiveHref('/leave/LV-1', ITEMS)).toBe('/leave');
  });

  it('href "/" match เฉพาะหน้า root · path นอกเมนู = undefined', () => {
    expect(findActiveHref('/', ITEMS)).toBe('/');
    expect(findActiveHref('/nowhere', ITEMS)).toBeUndefined();
  });
});

describe('filterNavItems — ช่องค้นหาเมนู', () => {
  it('ไม่สนตัวพิมพ์ · ตัดช่องว่าง · ว่าง = ทั้งหมด', () => {
    expect(filterNavItems(ITEMS, '  users ').map((i) => i.href)).toEqual(['/admin/users']);
    expect(filterNavItems(ITEMS, '')).toHaveLength(ITEMS.length);
  });

  it('พิมพ์ชื่อกลุ่ม = เห็นทั้งกลุ่ม', () => {
    expect(filterNavItems(ITEMS, 'รายงาน').map((i) => i.href)).toEqual(['/reports/monthly']);
  });

  it('ไม่เจอ = รายการว่าง (sidebar แสดงข้อความ "ไม่พบเมนู")', () => {
    expect(filterNavItems(ITEMS, 'zzz')).toEqual([]);
  });
});

describe('groupNavItems — ลำดับตาม groups และห้ามทำเมนูหาย', () => {
  it('เรียงตามลำดับ groups · กลุ่มว่างไม่แสดง', () => {
    const sections = groupNavItems(filterNavItems(ITEMS, 'ใบลา'), GROUPS);
    expect(sections.map((s) => s.group?.label)).toEqual(['งานหลัก']);
    expect(sections[0].items.map((i) => i.href)).toEqual(['/leave', '/leave-history']);
  });

  it('กลุ่มที่ไม่อยู่ใน groups ยังได้ section (ต่อท้าย ไม่มีสี) · ไม่มี group = section แรกไม่มีหัว', () => {
    const sections = groupNavItems(
      [
        { label: 'หน้าแรก', href: '/home' },
        { label: 'X', href: '/x', group: 'กลุ่มพิมพ์ผิด' },
        ...ITEMS,
      ],
      GROUPS
    );
    expect(sections.map((s) => s.group?.label)).toEqual([
      undefined,
      'งานหลัก',
      'รายงาน',
      'ตั้งค่า',
      'กลุ่มพิมพ์ผิด',
    ]);
    expect(sections.at(-1)?.group?.color).toBeUndefined();
  });
});

describe('สีกลุ่ม = --cat-* เท่านั้น', () => {
  it('navGroupColor อ่านจาก nav config', () => {
    expect(navGroupColor(GROUPS, 'รายงาน')).toBe('cat-6');
    expect(navGroupColor(GROUPS, 'ตั้งค่า')).toBeUndefined();
    expect(navGroupColor(GROUPS, undefined)).toBeUndefined();
  });

  it('ทุกสีมี class literal (Tailwind scan เจอ) และไม่มี status-*', () => {
    for (const color of NAV_GROUP_COLORS) expect(NAV_GROUP_DOT[color]).toBe(`bg-${color}`);
    expect(Object.values(NAV_GROUP_DOT).some((c) => c.includes('status'))).toBe(false);
  });
});
