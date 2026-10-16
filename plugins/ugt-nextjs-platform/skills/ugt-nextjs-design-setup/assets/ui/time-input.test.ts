// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/time-input.test.ts
// kit-hash: 9725250a1234
// installed by ugt-nextjs-design-setup alongside ui/time-input.tsx
// ล็อกบั๊กที่บันทึกเวลาผิดเงียบ ๆ (review 2026-10-16): "9:15" เคยกลายเป็น 23:05
import { describe, expect, it } from 'vitest';
import { maskTimeInput, normalizeTimeInput, TIME_PATTERN } from './time-input';

describe('time-input', () => {
  it.each([
    ['0817', '08:17'],
    ['081', '08:1'],
    ['9:', '09:'],
    ['9.', '09:'],
    ['9:15', '09:15'],
    ['915', '09:15'],
    ['', ''],
  ])('mask %j → %j', (raw, shown) => expect(maskTimeInput(raw)).toBe(shown));

  it.each([
    ['8', '08:00'],
    ['915', '09:15'],
    ['7:05', '07:05'],
    ['1:00', '01:00'],
    ['8.30', '08:30'],
    ['12:3', '12:03'],
    ['23:59', '23:59'],
    ['', ''],
  ])('normalize %j → %j', (raw, saved) => expect(normalizeTimeInput(raw)).toBe(saved));

  it.each(['24:00', '0860', '99:99'])('out of range %j is kept for the schema to flag', (raw) => {
    expect(TIME_PATTERN.test(normalizeTimeInput(raw))).toBe(false);
  });
});
