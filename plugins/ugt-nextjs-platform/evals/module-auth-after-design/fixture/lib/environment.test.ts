// kit: ugt-nextjs-platform 4.76.0 · ugt-nextjs-design-setup/lib/environment.test.ts
// kit-hash: 8c0b5c7cd0d5
// source: ugt-voice-platform (2026-10-09) — installed by ugt-nextjs-design-setup alongside lib/environment.ts
// ล็อกกติกา dev = basePath ลงท้าย -dev — ผิดทางไหนก็เงียบ: prod โผล่แถบ DEV หรือ dev ไม่มีแถบเลย
// และต้องไม่ throw เมื่อ CI build ไม่มีค่า (SKIP_ENV_VALIDATION → undefined)
import { describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({ NEXT_PUBLIC_BASE_PATH: '' as string | undefined }));
vi.mock('@/lib/env', () => ({ env: testEnv }));

const { isDevEnvironment } = await import('./environment');

describe('isDevEnvironment', () => {
  it('true เฉพาะ basePath ที่ลงท้าย -dev (develop → /<project>-dev)', () => {
    testEnv.NEXT_PUBLIC_BASE_PATH = '/my-portal-dev';
    expect(isDevEnvironment()).toBe(true);
  });

  it('prod (/<project>) และ local (ว่าง) = false', () => {
    testEnv.NEXT_PUBLIC_BASE_PATH = '/my-portal';
    expect(isDevEnvironment()).toBe(false);
    testEnv.NEXT_PUBLIC_BASE_PATH = '';
    expect(isDevEnvironment()).toBe(false);
  });

  it('ไม่มีค่า (CI build ข้าม env validation) = false ไม่ throw', () => {
    testEnv.NEXT_PUBLIC_BASE_PATH = undefined;
    expect(isDevEnvironment()).toBe(false);
  });

  it('ลงท้าย -dev เท่านั้น — "-dev" กลางชื่อไม่นับ', () => {
    testEnv.NEXT_PUBLIC_BASE_PATH = '/my-dev-portal';
    expect(isDevEnvironment()).toBe(false);
  });
});
