import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Declaring globalIgnores REPLACES eslint-config-next's default ignore set
  // → the defaults must be restated here, or eslint starts linting .next/ and
  // slows to a crawl.
  globalIgnores([
    // eslint-config-next defaults:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // ours: vitest coverage reports are not source
    'coverage/**',
  ]),
]);

export default eslintConfig;
