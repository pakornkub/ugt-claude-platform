import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // การประกาศ globalIgnores ทับ default ignores ของ eslint-config-next ทั้งชุด
  // → ต้องเขียน default เดิมกลับมาด้วย ไม่งั้น eslint จะเริ่ม lint .next/ แล้วช้ามาก
  globalIgnores([
    // default ของ eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // ของเราเพิ่ม: coverage report จาก vitest ไม่ใช่ source
    'coverage/**',
  ]),
]);

export default eslintConfig;
