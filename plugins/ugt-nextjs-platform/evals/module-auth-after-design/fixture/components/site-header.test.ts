// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/components/site-header.test.ts
// kit-hash: da456d04ad7b
// installed by ugt-nextjs-design-setup alongside components/site-header.tsx
// ล็อก derivation ของ breadcrumb — จุดที่พังเงียบ ๆ แล้วเห็นเป็น "header กับ
// sidebar พูดไม่ตรงกัน" ไม่ใช่ error: crumb แรกต้องเป็น "หัว group" ของเมนู
// ไม่ใช่ label ของเพจอื่น และ longest-prefix ต้องกันเมนูชื่อคล้ายชนกัน
import { describe, expect, it } from 'vitest';
import { deriveCrumbs, type SiteHeaderNavItem } from './site-header';

const NAV: readonly SiteHeaderNavItem[] = [
  { label: 'ภาพรวม', href: '/', group: 'งานหลัก' },
  { label: 'ใบลา', href: '/leave', group: 'งานหลัก' },
  { label: 'ประวัติใบลา', href: '/leave-history', group: 'งานหลัก' },
  { label: 'ผู้ใช้', href: '/admin/users' },
];

describe('deriveCrumbs — breadcrumb ต้องตรงกับ sidebar เสมอ', () => {
  it('หน้าเมนูปกติ = group › หน้า (group คือหัวข้อใน sidebar ไม่ใช่เพจอื่น)', () => {
    expect(deriveCrumbs('/leave', NAV)).toEqual([
      { label: 'งานหลัก' },
      { label: 'ใบลา', href: '/leave' },
    ]);
  });

  it('หน้า record = group › หน้า › segment จาก URL (decoded)', () => {
    expect(deriveCrumbs('/leave/LV-0241', NAV)).toEqual([
      { label: 'งานหลัก' },
      { label: 'ใบลา', href: '/leave' },
      { label: 'LV-0241' },
    ]);
    expect(deriveCrumbs('/leave/%E0%B8%A5%E0%B8%B2', NAV).at(-1)).toEqual({ label: 'ลา' });
  });

  it('longest-prefix: /leave-history ไม่ถูก /leave แย่ง (บั๊กที่ nav highlight เคยเจอ)', () => {
    expect(deriveCrumbs('/leave-history/2026', NAV)).toEqual([
      { label: 'งานหลัก' },
      { label: 'ประวัติใบลา', href: '/leave-history' },
      { label: '2026' },
    ]);
  });

  it('href "/" ไม่กลืนทุกเส้นทาง — match เฉพาะหน้า root เอง', () => {
    expect(deriveCrumbs('/', NAV)).toEqual([{ label: 'งานหลัก' }, { label: 'ภาพรวม', href: '/' }]);
    expect(deriveCrumbs('/leave', NAV).some((c) => c.label === 'ภาพรวม')).toBe(false);
  });

  it('เมนูไม่มี group = เริ่มที่ชื่อหน้าเลย · path นอกเมนู = ไม่มี crumb', () => {
    expect(deriveCrumbs('/admin/users', NAV)).toEqual([{ label: 'ผู้ใช้', href: '/admin/users' }]);
    expect(deriveCrumbs('/nowhere', NAV)).toEqual([]);
  });

  it('crumb กลุ่มได้สีจุดจาก groups ชุดเดียวกับ sidebar (--cat-*) · ไม่มีสี = ไม่มี key color', () => {
    const groups = [{ label: 'งานหลัก', color: 'cat-1' as const }];
    expect(deriveCrumbs('/leave', NAV, groups)[0]).toStrictEqual({
      label: 'งานหลัก',
      color: 'cat-1',
    });
    expect(deriveCrumbs('/leave', NAV)[0]).toStrictEqual({ label: 'งานหลัก' });
    // สีอยู่ที่ crumb กลุ่มเท่านั้น — หน้า/segment ไม่มีสี
    expect(
      deriveCrumbs('/leave/LV-1', NAV, groups)
        .slice(1)
        .some((c) => 'color' in c)
    ).toBe(false);
  });
});
