// kit: ugt-nextjs-platform 4.35.0 · ugt-nextjs-design-setup/lib/format.test.ts
// kit-hash: 3cf753537e39
// installed by ugt-nextjs-design-setup alongside lib/format.ts
// ล็อกเฉพาะ timezone contract — ส่วนที่พังเงียบ ๆ แล้วเห็นเป็น "วันคลาดไปหนึ่ง"
// ไม่ใช่ error (DESIGN.md §5). เทสนี้ต้องผ่านทุก TZ ของเครื่องที่รัน
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatExportDate, toDateKey } from './format';

describe('timezone contract', () => {
  it('wall-clock date อ่าน UTC parts — วันไม่เลื่อนตามโซนเครื่อง', () => {
    expect(formatDate('2026-08-23')).toBe('23/08/2026');
    expect(formatExportDate('2026-08-23')).toBe('2026-08-23');
    // Date เที่ยงคืน UTC = ที่ Prisma คืนให้จากคอลัมน์ SQL date
    expect(formatExportDate(new Date('2026-08-23T00:00:00Z'))).toBe('2026-08-23');
  });

  it('instant แสดงเวลาไทยเสมอ ไม่ใช่โซนเครื่องผู้ดู', () => {
    // 17:30Z = 00:30 ของวันถัดไปที่กรุงเทพ — ถ้าหลุด pin จะได้ 23/08 บนเครื่อง UTC
    expect(formatDateTime('2026-08-23T17:30:00Z')).toBe('24/08/2026 00:30');
  });

  it('toDateKey คืนวันของเซลล์ที่ผู้ใช้คลิก (formatExportDate ตรงนี้จะร่นวัน)', () => {
    const picked = new Date(2026, 7, 23); // เที่ยงคืน local = สิ่งที่ปฏิทินส่งกลับมา
    expect(toDateKey(picked)).toBe('2026-08-23');
  });
});
