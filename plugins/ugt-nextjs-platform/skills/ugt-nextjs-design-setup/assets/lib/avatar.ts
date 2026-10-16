// kit: ugt-nextjs-platform 4.80.0 · ugt-nextjs-design-setup/lib/avatar.ts
// kit-hash: b66b56aa046c
// source: ugt-hrms lib/utils.ts (avatarColorClass + getInitials) — installed by ugt-nextjs-design-setup
// convention: สี avatar มาจาก --cat-1..8 เท่านั้น (ตกแต่ง ไม่ใช่สถานะ) · DESIGN.md §1 · มติ 2026-10-16 B12

// ชื่อคลาสแบบ literal ให้ Tailwind scan เจอ — ห้ามประกอบสตริง `bg-cat-${i}` แบบ dynamic
// (class ที่ประกอบตอน runtime ไม่อยู่ใน CSS ที่ build ออกมา avatar จะไม่มีสีเงียบ ๆ)
const AVATAR_COLORS = [
  'bg-cat-1',
  'bg-cat-2',
  'bg-cat-3',
  'bg-cat-4',
  'bg-cat-5',
  'bg-cat-6',
  'bg-cat-7',
  'bg-cat-8',
] as const;

/**
 * คลาสพื้นสีประจำตัวของ avatar — hash จาก seed (รหัสพนักงาน/ชื่อ) จึงได้สีเดิมทุกครั้ง
 * ทุกหน้า. ใช้คู่ `text-white` — ทุก `--cat-*` ผ่าน WCAG AA กับตัวอักษรขาว
 * (`check-contrast.mjs` ตรวจ). seed ควรเป็นค่าที่ไม่เปลี่ยน (รหัส) มากกว่าชื่อที่แก้ได้.
 */
export function avatarColorClass(seed: string): (typeof AVATAR_COLORS)[number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.trunc(Math.imul(h, 31) + (seed.codePointAt(i) ?? 0));
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// สระนำ เ แ โ ใ ไ (U+0E40–U+0E44) เขียนก่อนพยัญชนะที่ออกเสียง — ตัวย่อต้องข้ามไป
// เขียนเป็น escape เพื่อให้โค้ดไม่มีอักษรไทยนอกคอมเมนต์ (กติกา check-i18n)
const THAI_LEADING_VOWELS = /^[เ-ไ]+/;

/** ตัวย่อจากคำแรก + คำสุดท้ายของชื่อ (ไทย/อังกฤษ) — ชื่อว่างได้ `?` */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const initial = (word: string) => word.replace(THAI_LEADING_VOWELS, '')[0] ?? word[0] ?? '';
  const first = initial(parts[0]);
  const last = parts.length > 1 ? initial(parts.at(-1) ?? '') : '';
  return (first + last).toUpperCase();
}
