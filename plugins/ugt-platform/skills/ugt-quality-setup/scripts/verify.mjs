#!/usr/bin/env node
// Verification Checklist ของ ugt-quality-setup ในรูปแบบที่รันได้
//
//   node <path-to-skill>/scripts/verify.mjs
//
// ยึด process.cwd() เป็น root ของโปรเจค — ไฟล์ที่ควรมีแต่หาไม่เจอ = FAIL ไม่ใช่ผ่าน
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

// ── 1. ไฟล์ที่ต้องมี ────────────────────────────────────────────────────────
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
check('ไฟล์ config ครบ', () => {
  const missing = REQUIRED.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `ไม่พบ: ${missing.join(', ')} — รัน ugt-quality-setup ก่อน` }
    : { ok: true };
});

// ── 2. npm scripts ที่ pipeline เรียกตามชื่อ ───────────────────────────────
const PIPELINE_SCRIPTS = ['lint', 'format:check', 'test:coverage', 'build'];
check('npm scripts ที่ Jenkins เรียกครบ', () => {
  if (!pkg) return { ok: false, msg: 'ไม่มี package.json' };
  const missing = PIPELINE_SCRIPTS.filter((s) => !pkg.scripts?.[s]);
  return missing.length
    ? { ok: false, msg: `ขาด script: ${missing.join(', ')} — stage ที่เรียกจะแดงทันที` }
    : { ok: true };
});

check('lint-staged ตั้งไว้ใน package.json', () => {
  if (!pkg) return { ok: false, msg: 'ไม่มี package.json' };
  const cfg = pkg['lint-staged'];
  if (!cfg && !has('.lintstagedrc') && !has('.lintstagedrc.json')) {
    return { ok: false, msg: 'ไม่มี config ของ lint-staged — pre-commit จะไม่ทำอะไร' };
  }
  return { ok: true };
});

check('devDependencies ที่จำเป็นครบ', () => {
  if (!pkg) return { ok: false, msg: 'ไม่มี package.json' };
  const dev = { ...(pkg.devDependencies ?? {}), ...(pkg.dependencies ?? {}) };
  const need = ['vitest', '@vitest/coverage-v8', 'eslint', 'prettier', 'husky', 'lint-staged'];
  const missing = need.filter((d) => !dev[d]);
  return missing.length ? { ok: false, msg: `ยังไม่ติดตั้ง: ${missing.join(', ')}` } : { ok: true };
});

// ── 3. vitest config — จุดที่ pipeline พึ่งพา ─────────────────────────────
const vitest = has('vitest.config.ts') ? read('vitest.config.ts') : '';

check('junit reporter เปิดเฉพาะเมื่อ CI=true', () => {
  if (!vitest) return { ok: false, msg: 'ไม่มี vitest.config.ts' };
  if (!vitest.includes('junit')) {
    return { ok: false, msg: 'ไม่มี junit reporter — stage Unit Tests จะไม่มีผลทดสอบให้ publish' };
  }
  return /process\.env\.CI\s*\?/.test(vitest)
    ? { ok: true }
    : { ok: 'warn', msg: 'junit เปิดตลอดเวลา — local จะมีไฟล์ report ค้างทุกครั้งที่รัน test' };
});

check('outputFile ชี้ test-results/junit.xml', () => {
  if (!vitest) return { ok: false, msg: 'ไม่มี vitest.config.ts' };
  return /junit\s*:\s*['"]test-results\/junit\.xml['"]/.test(vitest)
    ? { ok: true }
    : { ok: false, msg: 'path ของ junit ไม่ใช่ test-results/junit.xml — Jenkinsfile อ่านไม่เจอ' };
});

check('coverage reporter มี lcov', () => {
  if (!vitest) return { ok: false, msg: 'ไม่มี vitest.config.ts' };
  return /reporter\s*:\s*\[[^\]]*['"]lcov['"]/.test(vitest)
    ? { ok: true }
    : { ok: false, msg: 'ไม่มี lcov — SonarQube อ่าน coverage ไม่ได้ → new_coverage = 0% → gate block' };
});

check('coverage.include ครอบ source จริง', () => {
  if (!vitest) return { ok: false, msg: 'ไม่มี vitest.config.ts' };
  const inc = vitest.match(/include\s*:\s*\[([^\]]*)\][^}]*exclude/s)?.[1] ?? '';
  const block = vitest.match(/coverage\s*:\s*\{([\s\S]*?)\n\s{4}\}/)?.[1] ?? '';
  const listed = [...(block + inc).matchAll(/['"]([\w-]+)\/\*\*['"]/g)].map((m) => m[1]);
  const present = ['app', 'components', 'lib', 'hooks'].filter((d) => has(d));
  const uncovered = present.filter((d) => !listed.includes(d));
  if (!listed.length) return { ok: false, msg: 'ไม่พบ coverage.include — coverage จะนับทุกไฟล์หรือไม่นับเลย' };
  return uncovered.length
    ? { ok: false, msg: `dir ที่มี source แต่ไม่อยู่ใน coverage.include: ${uncovered.join(', ')} → coverage สูงปลอม` }
    : { ok: true };
});

check('test.env มี SKIP_ENV_VALIDATION', () => {
  if (!vitest) return { ok: false, msg: 'ไม่มี vitest.config.ts' };
  return /SKIP_ENV_VALIDATION/.test(vitest)
    ? { ok: true }
    : { ok: false, msg: 'ไม่ตั้ง SKIP_ENV_VALIDATION — test จะต้องมี .env จริงถึงจะรันได้' };
});

check('alias server-only ชี้ stub ในโปรเจค', () => {
  if (!vitest) return { ok: false, msg: 'ไม่มี vitest.config.ts' };
  if (!/'server-only'|"server-only"/.test(vitest)) {
    return { ok: 'warn', msg: 'ไม่มี alias server-only — import โมดูลฝั่ง server เข้ามาทดสอบจะ throw' };
  }
  return /node_modules/.test(vitest.match(/server-only['"]\s*:\s*([^,\n]+)/)?.[1] ?? '')
    ? { ok: false, msg: 'alias ชี้เข้า node_modules — พังใน git worktree ที่ยังไม่ install' }
    : { ok: true };
});

// ── 4. eslint / prettier / husky ──────────────────────────────────────────
check('eslint ignore ครบ (default ของ next + coverage)', () => {
  if (!has('eslint.config.mjs')) return { ok: false, msg: 'ไม่มี eslint.config.mjs' };
  const body = read('eslint.config.mjs');
  if (!/globalIgnores/.test(body)) {
    return { ok: 'warn', msg: 'ไม่ประกาศ globalIgnores — ใช้ default ของ eslint-config-next (coverage/ จะถูก lint)' };
  }
  const need = ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'coverage/**'];
  const missing = need.filter((n) => !body.includes(n));
  return missing.length
    ? { ok: false, msg: `globalIgnores ทับ default ของ next แต่ขาด: ${missing.join(', ')}` }
    : { ok: true };
});

check('.husky/pre-commit รัน lint-staged', () => {
  if (!has('.husky/pre-commit')) return { ok: false, msg: 'ไม่มี .husky/pre-commit' };
  const body = read('.husky/pre-commit');
  if (/npm\s+(run\s+)?test|vitest/.test(body)) {
    return { ok: false, msg: 'pre-commit รัน test ทั้งชุด — ช้าจนคนเลี่ยงด้วย --no-verify' };
  }
  return /lint-staged/.test(body)
    ? { ok: true }
    : { ok: false, msg: 'pre-commit ไม่เรียก lint-staged' };
});

check('artifact ของ test/coverage อยู่ใน .gitignore', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'ไม่มี .gitignore' };
  const ig = read('.gitignore');
  const missing = ['coverage', 'test-results'].filter((d) => !ig.includes(d));
  return missing.length ? { ok: false, msg: `.gitignore ขาด: ${missing.join(', ')}` } : { ok: true };
});

// ── รายงาน ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-quality-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} ผ่าน · ${warned} เตือน · ${failed} ไม่ผ่าน\n` +
    'ข้อที่ตรวจด้วยเครื่องไม่ได้: รัน `CI=true npm run test:coverage` จริงแล้วดูว่ามีไฟล์ junit.xml + lcov.info เกิดขึ้น\n'
);
process.exit(failed > 0 ? 1 : 0);
