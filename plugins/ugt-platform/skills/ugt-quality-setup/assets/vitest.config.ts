import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // test ต้องรันได้โดยไม่มี .env จริง — ไม่งั้น CI ต้องถือ secret ไว้แค่เพื่อรัน unit test
    env: { SKIP_ENV_VALIDATION: '1' },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**', '.claude/**'],
    // JUnit reporter เปิดเฉพาะบน CI — Jenkins stage Unit Tests อ่าน test-results/junit.xml
    // ถ้าเปิดตลอดเวลา local จะมีไฟล์ report ค้างในโปรเจคทุกครั้งที่รัน test
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      // lcov จำเป็นสำหรับ SonarQube (sonar.javascript.lcov.reportPaths)
      reporter: ['text', 'html', 'lcov'],
      // include ต้องครอบ source จริงทั้งหมด — ถ้าใส่แค่ dir ที่มี test อยู่แล้ว
      // coverage จะสูงปลอมและ Quality Gate (new_coverage ≥ 60%) จะไม่มีความหมาย
      // ปรับรายการนี้ตาม layout จริงของโปรเจค
      include: ['app/**', 'components/**', 'lib/**', 'hooks/**'],
      exclude: ['**/*.d.ts', '**/*.config.*', '**/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // `server-only` throw นอก React Server environment → alias เป็น stub ในโปรเจค
      // ห้าม alias เข้า node_modules/next internals: จะพังใน git worktree ที่ยังไม่ npm install
      'server-only': resolve(__dirname, 'vitest.server-only-stub.js'),
    },
  },
});
