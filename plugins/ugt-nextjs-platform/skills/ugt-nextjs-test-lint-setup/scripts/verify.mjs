#!/usr/bin/env node
// Runnable version of the ugt-nextjs-test-lint-setup Verification Checklist
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const results = [];
const p = (...s) => join(ROOT, ...s);
const has = (...s) => existsSync(p(...s));
const read = (...s) => readFileSync(p(...s), 'utf8');

function check(name, fn) {
  try {
    const r = fn();
    results.push({ name, ...(r ?? { ok: true }) });
  } catch (error) {
    results.push({ name, ok: false, msg: error.message });
  }
}

const pkg = has('package.json') ? JSON.parse(read('package.json')) : null;

// ── 1. Required files ──────────────────────────────────────────────────────
const REQUIRED = [
  'package.json',
  'vitest.config.ts',
  'vitest.setup.ts',
  'vitest.server-only-stub.js',
  'eslint.config.mjs',
  '.prettierrc',
  '.prettierignore',
  '.husky/pre-commit',
];
check('Config files present', () => {
  const missing = REQUIRED.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-nextjs-test-lint-setup first` }
    : { ok: true };
});

// ── 2. npm scripts the pipeline calls by name ──────────────────────────────
const PIPELINE_SCRIPTS = ['lint', 'format:check', 'test:coverage', 'build'];
check('All Jenkins-called npm scripts present', () => {
  if (!pkg) return { ok: false, msg: 'No package.json' };
  const missing = PIPELINE_SCRIPTS.filter((s) => !pkg.scripts?.[s]);
  return missing.length
    ? { ok: false, msg: `Missing scripts: ${missing.join(', ')} — the calling stage goes red instantly` }
    : { ok: true };
});

check('lint-staged configured in package.json', () => {
  if (!pkg) return { ok: false, msg: 'No package.json' };
  const cfg = pkg['lint-staged'];
  if (!cfg && !has('.lintstagedrc') && !has('.lintstagedrc.json')) {
    return { ok: false, msg: 'No lint-staged config — pre-commit will do nothing' };
  }
  return { ok: true };
});

check('Required devDependencies installed', () => {
  if (!pkg) return { ok: false, msg: 'No package.json' };
  const dev = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
  const need = ['vitest', '@vitest/coverage-v8', 'eslint', 'prettier', 'husky', 'lint-staged'];
  const missing = need.filter((d) => !dev[d]);
  return missing.length ? { ok: false, msg: `Not installed: ${missing.join(', ')}` } : { ok: true };
});

// ── 3. vitest config — the pipeline's dependencies ─────────────────────────
const vitest = has('vitest.config.ts') ? read('vitest.config.ts') : '';

check('junit reporter enabled only when CI=true', () => {
  if (!vitest) return { ok: false, msg: 'No vitest.config.ts' };
  if (!vitest.includes('junit')) {
    return { ok: false, msg: 'No junit reporter — the Unit Tests stage will have no results to publish' };
  }
  return /process\.env\.CI\s*\?/.test(vitest)
    ? { ok: true }
    : { ok: 'warn', msg: 'junit always on — report files litter every local test run' };
});

check('outputFile points at test-results/junit.xml', () => {
  if (!vitest) return { ok: false, msg: 'No vitest.config.ts' };
  return /junit\s*:\s*['"]test-results\/junit\.xml['"]/.test(vitest)
    ? { ok: true }
    : { ok: false, msg: 'junit path is not test-results/junit.xml — the Jenkinsfile will not find it' };
});

check('Coverage reporter includes lcov', () => {
  if (!vitest) return { ok: false, msg: 'No vitest.config.ts' };
  return /reporter\s*:\s*\[[^\]]*['"]lcov['"]/.test(vitest)
    ? { ok: true }
    : { ok: false, msg: 'No lcov — SonarQube cannot read coverage → new_coverage = 0% → gate blocks' };
});

check('coverage.include covers the real source', () => {
  if (!vitest) return { ok: false, msg: 'No vitest.config.ts' };
  const inc = vitest.match(/include\s*:\s*\[([^\]]*)\][^}]*exclude/s)?.[1] ?? '';
  const block = vitest.match(/coverage\s*:\s*\{([\s\S]*?)\n\s{4}\}/)?.[1] ?? '';
  const listed = [...(block + inc).matchAll(/['"]([\w-]+)\/\*\*['"]/g)].map((m) => m[1]);
  const present = ['app', 'components', 'lib', 'hooks'].filter((d) => has(d));
  const uncovered = present.filter((d) => !listed.includes(d));
  if (!listed.length) return { ok: false, msg: 'No coverage.include found — coverage counts everything or nothing' };
  return uncovered.length
    ? { ok: false, msg: `Source dirs missing from coverage.include: ${uncovered.join(', ')} → inflated coverage` }
    : { ok: true };
});

check('test.env has SKIP_ENV_VALIDATION', () => {
  if (!vitest) return { ok: false, msg: 'No vitest.config.ts' };
  return /SKIP_ENV_VALIDATION/.test(vitest)
    ? { ok: true }
    : { ok: false, msg: 'SKIP_ENV_VALIDATION not set — tests will require a real .env to run' };
});

check('server-only alias points at the in-project stub', () => {
  if (!vitest) return { ok: false, msg: 'No vitest.config.ts' };
  if (!/'server-only'|"server-only"/.test(vitest)) {
    return { ok: 'warn', msg: 'No server-only alias — importing server modules in tests will throw' };
  }
  return /node_modules/.test(vitest.match(/server-only['"]\s*:\s*([^,\n]+)/)?.[1] ?? '')
    ? { ok: false, msg: 'Alias points into node_modules — breaks in git worktrees without a full install' }
    : { ok: true };
});

// ── 4. eslint / prettier / husky ───────────────────────────────────────────
check('eslint ignores complete (next defaults + coverage)', () => {
  if (!has('eslint.config.mjs')) return { ok: false, msg: 'No eslint.config.mjs' };
  const body = read('eslint.config.mjs');
  if (!/globalIgnores/.test(body)) {
    return { ok: 'warn', msg: 'No globalIgnores declared — using eslint-config-next defaults (coverage/ will be linted)' };
  }
  const need = ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'coverage/**'];
  const missing = need.filter((n) => !body.includes(n));
  return missing.length
    ? { ok: false, msg: `globalIgnores replaces next's defaults but is missing: ${missing.join(', ')}` }
    : { ok: true };
});

check('.husky/pre-commit runs lint-staged', () => {
  if (!has('.husky/pre-commit')) return { ok: false, msg: 'No .husky/pre-commit' };
  const body = read('.husky/pre-commit');
  if (/npm\s+(run\s+)?test|vitest/.test(body)) {
    return { ok: false, msg: 'pre-commit runs the whole test suite — slow enough that people bypass with --no-verify' };
  }
  return /lint-staged/.test(body)
    ? { ok: true }
    : { ok: false, msg: 'pre-commit does not invoke lint-staged' };
});

check('Test/coverage artifacts gitignored', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'No .gitignore' };
  const ig = read('.gitignore');
  const missing = ['coverage', 'test-results'].filter((d) => !ig.includes(d));
  return missing.length ? { ok: false, msg: `.gitignore missing: ${missing.join(', ')}` } : { ok: true };
});

// ── Report ─────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-test-lint-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Not machine-checkable: actually run `CI=true npm run test:coverage` and confirm junit.xml + lcov.info appear\n'
);
process.exit(failed > 0 ? 1 : 0);
