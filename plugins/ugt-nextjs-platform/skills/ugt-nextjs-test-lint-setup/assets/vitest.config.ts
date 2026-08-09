import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Tests must run without a real .env — otherwise CI has to hold secrets
    // just to run unit tests
    env: { SKIP_ENV_VALIDATION: '1' },
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e/**', '.claude/**'],
    // JUnit reporter only on CI — the Jenkins Unit Tests stage reads
    // test-results/junit.xml. Enabling it everywhere litters every local run
    // with report files.
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: 'test-results/junit.xml',
    },
    coverage: {
      provider: 'v8',
      // lcov is required by SonarQube (sonar.javascript.lcov.reportPaths)
      reporter: ['text', 'html', 'lcov'],
      // include must cover ALL real source — listing only dirs that already
      // have tests inflates coverage and makes the Quality Gate
      // (new_coverage >= 60%) meaningless. Adjust to the project's layout.
      include: ['app/**', 'components/**', 'lib/**', 'hooks/**'],
      exclude: ['**/*.d.ts', '**/*.config.*', '**/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      // `server-only` throws outside a React Server environment → alias it to
      // an in-project stub. Never alias into node_modules/next internals: that
      // breaks in git worktrees without a full npm install.
      'server-only': resolve(__dirname, 'vitest.server-only-stub.js'),
    },
  },
});
