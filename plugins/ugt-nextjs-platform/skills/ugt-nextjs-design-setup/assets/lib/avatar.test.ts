// kit: ugt-nextjs-platform 4.80.0 · ugt-nextjs-design-setup/lib/avatar.test.ts
// kit-hash: 4bfb4974d0b4
// installed by ugt-nextjs-design-setup alongside lib/avatar.ts
// ล็อกสองอย่างที่พังเงียบ: ตัวย่อชื่อที่ขึ้นต้นด้วยสระนำ (ได้ "เ"/"ไ" แทนพยัญชนะ)
// และสีที่ต้องคงเดิมทุกครั้งสำหรับคนเดิม
import { describe, expect, it } from 'vitest';
import { avatarColorClass, getInitials } from './avatar';

describe('getInitials', () => {
  it('ข้ามสระนำไทย เ แ โ ใ ไ', () => {
    expect(getInitials('เอกชัย ใจดี')).toBe('อจ');
    expect(getInitials('ไพโรจน์ แสงทอง')).toBe('พส');
    expect(getInitials('โชติ')).toBe('ช');
  });

  it('คำแรก + คำสุดท้าย · อังกฤษเป็นตัวใหญ่ · ว่าง = ?', () => {
    expect(getInitials('สมชาย กลาง ใจดี')).toBe('สจ');
    expect(getInitials('pakorn worakarn')).toBe('PW');
    expect(getInitials('   ')).toBe('?');
  });
});

describe('avatarColorClass', () => {
  it('seed เดิมได้สีเดิม และเป็น class literal ของ --cat-1..8', () => {
    expect(avatarColorClass('EMP0241')).toBe(avatarColorClass('EMP0241'));
    expect(avatarColorClass('EMP0241')).toMatch(/^bg-cat-[1-8]$/);
    expect(avatarColorClass('')).toMatch(/^bg-cat-[1-8]$/);
  });
});
