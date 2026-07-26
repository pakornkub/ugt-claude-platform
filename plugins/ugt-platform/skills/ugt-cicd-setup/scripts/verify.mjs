#!/usr/bin/env node
// Verification Checklist ของ ugt-cicd-setup ในรูปแบบที่รันได้ (ส่วน "ไฟล์ใน repo")
//
//   node <path-to-skill>/scripts/verify.mjs
//
// ยึด process.cwd() เป็น root ของโปรเจค — ไฟล์ที่ควรมีแต่หาไม่เจอ = FAIL ไม่ใช่ผ่าน
// ตรวจได้เฉพาะฝั่ง repo · ฝั่ง server (Jenkins credentials/tools, SonarQube project,
// webhook) ต้องให้ admin ยืนยันเอง — ดู §6 ใน SKILL.md
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

const CI_FILES = [
  'Jenkinsfile',
  'sonar-project.properties',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.dev.yml',
  'owasp-suppressions.xml',
];
const pkg = has('package.json') ? JSON.parse(read('package.json')) : null;
const jf = has('Jenkinsfile') ? read('Jenkinsfile') : '';

// ── 1. ไฟล์ที่ต้องมี ────────────────────────────────────────────────────────
check('ไฟล์ CI ครบ', () => {
  const missing = CI_FILES.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `ไม่พบ: ${missing.join(', ')} — รัน ugt-cicd-setup ก่อน` }
    : { ok: true };
});

check('/api/health มีอยู่จริง', () => {
  const candidates = ['app/api/health/route.ts', 'app/api/health/route.tsx', 'src/app/api/health/route.ts'];
  if (!candidates.some((c) => has(c))) {
    return { ok: false, msg: 'ไม่มี route /api/health — container จะไม่เคยขึ้น healthy → stage Deploy fail' };
  }
  const file = candidates.find((c) => has(c));
  const body = read(file);
  return /version|commit|sha/i.test(body) && !/\/\/.*version/i.test(body)
    ? { ok: 'warn', msg: `${file} อาจคืน version/commit ออกไป — endpoint นี้เปิดสาธารณะ` }
    : { ok: true };
});

// ── 2. placeholder ค้าง ─────────────────────────────────────────────────────
check('ไม่เหลือ placeholder __*__', () => {
  const found = [];
  for (const f of CI_FILES) {
    if (!has(f)) continue;
    const hits = [...new Set([...read(f).matchAll(/__[A-Z][A-Z0-9_]*__/g)].map((m) => m[0]))];
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

// ── 3. Jenkinsfile — โครงสร้าง ─────────────────────────────────────────────
const STAGES = [
  'Checkout',
  'Install',
  'Code Quality',
  'Unit Tests',
  'Build',
  'OWASP',
  'SonarQube',
  'Quality Gate',
  'Docker Build',
  'Deploy',
];
check('Jenkinsfile มี 10 stage ตามลำดับ', () => {
  if (!jf) return { ok: false, msg: 'ไม่มี Jenkinsfile' };
  const names = [...jf.matchAll(/stage\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  const missing = STAGES.filter((s) => !names.some((n) => n.toLowerCase().includes(s.toLowerCase())));
  if (missing.length) return { ok: false, msg: `ขาด stage: ${missing.join(', ')} (พบ ${names.length} stage)` };
  // ตรวจลำดับ
  let cursor = -1;
  for (const s of STAGES) {
    const idx = names.findIndex((n, i) => i > cursor && n.toLowerCase().includes(s.toLowerCase()));
    if (idx === -1) return { ok: false, msg: `stage "${s}" อยู่ผิดลำดับ` };
    cursor = idx;
  }
  return { ok: true };
});

check('Quality Gate block pipeline จริง', () => {
  if (!jf) return { ok: false, msg: 'ไม่มี Jenkinsfile' };
  if (!/waitForQualityGate/.test(jf)) return { ok: false, msg: 'ไม่มี waitForQualityGate — gate ไม่ block อะไรเลย' };
  return /abortPipeline\s*:\s*true/.test(jf)
    ? { ok: true }
    : { ok: false, msg: 'waitForQualityGate ไม่มี abortPipeline: true → gate แดงแต่ pipeline เขียวต่อ' };
});

check('post block ครบ (แจ้งผล + cleanWs)', () => {
  if (!jf) return { ok: false, msg: 'ไม่มี Jenkinsfile' };
  const problems = [];
  if (!/emailext/.test(jf)) problems.push('ไม่มี emailext');
  if (!/cleanWs/.test(jf)) problems.push('ไม่มี cleanWs (workspace บวมทุก build)');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('brace ใน Jenkinsfile สมดุล', () => {
  if (!jf) return { ok: false, msg: 'ไม่มี Jenkinsfile' };
  // ตัด string/comment ออกก่อนนับ เพื่อไม่ให้ { } ในข้อความรบกวน
  const stripped = jf
    .replace(/'''[\s\S]*?'''/g, '')
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/'[^'\n]*'/g, '')
    .replace(/"[^"\n]*"/g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const open = (stripped.match(/\{/g) ?? []).length;
  const close = (stripped.match(/\}/g) ?? []).length;
  return open === close
    ? { ok: true }
    : { ok: false, msg: `{ = ${open} แต่ } = ${close} — Groovy parse ไม่ผ่าน (มักเกิดจากลบ block [SENTRY]/[DB] แล้ว brace เหลือ/ขาด)` };
});

check('ไม่มี Groovy interpolation ของ secret', () => {
  if (!jf) return { ok: false, msg: 'ไม่มี Jenkinsfile' };
  // ตัด single-quoted Groovy string ออกก่อน — ใน sh '''…''' ตัว ${VAR} เป็น shell
  // expansion ที่ถูกต้อง ไม่ใช่ Groovy interpolation ที่รั่วลง log
  const groovyInterpolated = jf.replace(/'''[\s\S]*?'''/g, '').replace(/'[^'\n]*'/g, '');
  const bad = [...groovyInterpolated.matchAll(/\$\{[^}]*(SECRET|PASSWORD|TOKEN|NVD|DSN)[^}]*\}/gi)].map(
    (m) => m[0]
  );
  return bad.length
    ? { ok: false, msg: `secret ถูก interpolate ด้วย Groovy (รั่วลง build log): ${[...new Set(bad)].join(', ')} — ใช้ '$VAR' ให้ shell expand` }
    : { ok: true };
});

// ── 4. ความสอดคล้องของ marker [DB] / [SENTRY] กับของจริงในโปรเจค ──────────
check('[DB] สอดคล้องกับการมี Prisma จริง', () => {
  if (!jf || !pkg) return { ok: false, msg: 'ไม่มี Jenkinsfile หรือ package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const hasPrisma = Boolean(deps.prisma || deps['@prisma/client']);
  const marked = /\[DB\]/.test(jf) || /prisma/i.test(jf);
  if (hasPrisma && !marked) return { ok: false, msg: 'โปรเจคมี Prisma แต่ Jenkinsfile ไม่มีขั้น prisma/migrate — deploy จะขึ้นโดยไม่ migrate' };
  if (!hasPrisma && marked) return { ok: false, msg: 'โปรเจคไม่มี Prisma แต่ Jenkinsfile ยังมี block [DB] — stage จะ fail' };
  return { ok: true };
});

check('[SENTRY] สอดคล้องกับการมี Sentry จริง', () => {
  if (!jf || !pkg) return { ok: false, msg: 'ไม่มี Jenkinsfile หรือ package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const hasSentry = Object.keys(deps).some((d) => d.startsWith('@sentry/'));
  const marked = /\[SENTRY\]|SENTRY_DSN/i.test(jf);
  if (hasSentry && !marked) return { ok: 'warn', msg: 'โปรเจคมี Sentry แต่ Jenkinsfile ไม่ส่ง DSN เป็น build-arg → client-side DSN จะว่าง' };
  if (!hasSentry && marked) return { ok: false, msg: 'ไม่มี Sentry แต่ Jenkinsfile ยังอ้าง credential sentry-dsn-* — withCredentials จะ fail' };
  return { ok: true };
});

// ── 5. sonar-project.properties ────────────────────────────────────────────
const sonar = has('sonar-project.properties') ? read('sonar-project.properties') : '';
const sonarProp = (key) =>
  sonar
    .split('\n')
    .find((l) => l.trim().startsWith(`${key}=`))
    ?.split('=')
    .slice(1)
    .join('=')
    .trim();

check('ทุก path ใน sonar.sources / sonar.tests มีอยู่จริง', () => {
  if (!sonar) return { ok: false, msg: 'ไม่มี sonar-project.properties' };
  const missing = [];
  for (const key of ['sonar.sources', 'sonar.tests']) {
    const val = sonarProp(key);
    if (!val) continue;
    for (const entry of val.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!has(entry)) missing.push(`${key}: ${entry}`);
    }
  }
  return missing.length
    ? { ok: false, msg: `path ไม่มีจริง → sonar-scanner fail ทันที: ${missing.join(' · ')}` }
    : { ok: true };
});

check('sonar ชี้ lcov ถูกที่', () => {
  if (!sonar) return { ok: false, msg: 'ไม่มี sonar-project.properties' };
  const val = sonarProp('sonar.javascript.lcov.reportPaths');
  if (!val) return { ok: false, msg: 'ไม่มี sonar.javascript.lcov.reportPaths → new_coverage = 0% → gate block' };
  return val.includes('lcov.info')
    ? { ok: true }
    : { ok: 'warn', msg: `ค่าที่ตั้งไว้คือ "${val}" — ปกติเป็น coverage/lcov.info` };
});

// ── 6. compose / Dockerfile ────────────────────────────────────────────────
for (const f of ['docker-compose.yml', 'docker-compose.dev.yml']) {
  check(`${f} ตั้งค่าถูก`, () => {
    if (!has(f)) return { ok: false, msg: `ไม่มี ${f}` };
    const body = read(f);
    const problems = [];
    if (/healthcheck/i.test(body) && !body.includes('127.0.0.1')) {
      problems.push('healthcheck ไม่ได้ใช้ 127.0.0.1 (localhost บน Alpine ไป IPv6 แล้ว fail)');
    }
    if (!/pull_policy\s*:\s*never/.test(body)) {
      problems.push('ไม่มี pull_policy: never (compose จะพยายาม pull image ที่ build ในเครื่อง)');
    }
    if (!/APP_PORT/.test(body)) problems.push('ไม่มี APP_PORT ให้ override');
    return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
  });
}

check('Dockerfile มี HEALTHCHECK', () => {
  if (!has('Dockerfile')) return { ok: false, msg: 'ไม่มี Dockerfile' };
  return /HEALTHCHECK/.test(read('Dockerfile'))
    ? { ok: true }
    : { ok: false, msg: 'ไม่มี HEALTHCHECK — Deploy stage poll สถานะ healthy ไม่ได้' };
});

check('next.config เปิด output standalone', () => {
  const cfg = ['next.config.ts', 'next.config.mjs', 'next.config.js'].find((f) => has(f));
  if (!cfg) return { ok: false, msg: 'ไม่พบ next.config.*' };
  return /output\s*:/.test(read(cfg)) && /standalone/.test(read(cfg))
    ? { ok: true }
    : { ok: false, msg: `${cfg} ไม่ได้ตั้ง output: 'standalone' — Dockerfile จะ COPY .next/standalone ไม่เจอ` };
});

// ── 7. scripts ที่ pipeline เรียก ──────────────────────────────────────────
check('npm scripts ที่ pipeline เรียกครบ', () => {
  if (!pkg) return { ok: false, msg: 'ไม่มี package.json' };
  const missing = ['lint', 'format:check', 'test:coverage', 'build'].filter((s) => !pkg.scripts?.[s]);
  return missing.length
    ? { ok: false, msg: `ขาด: ${missing.join(', ')} — รัน ugt-quality-setup ก่อน` }
    : { ok: true };
});

check('owasp-suppressions.xml เป็น XML ที่อ่านได้', () => {
  if (!has('owasp-suppressions.xml')) return { ok: false, msg: 'ไม่มี owasp-suppressions.xml' };
  const body = read('owasp-suppressions.xml');
  if (!/<suppressions/.test(body)) return { ok: false, msg: 'ไม่มี root element <suppressions>' };
  const noReason = [...body.matchAll(/<suppress>([\s\S]*?)<\/suppress>/g)].filter(
    (m) => !/<notes>/.test(m[1])
  ).length;
  return noReason
    ? { ok: false, msg: `${noReason} suppression ไม่มี <notes> อธิบายเหตุผล` }
    : { ok: true };
});

// ── รายงาน ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-cicd-setup — verify (ฝั่ง repo)\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} ผ่าน · ${warned} เตือน · ${failed} ไม่ผ่าน\n` +
    'ยังต้องให้ admin ยืนยัน: Jenkins tools/credentials/global env · SonarQube project + Quality Gate · webhook สองทาง · ปิด Lightweight checkout\n'
);
process.exit(failed > 0 ? 1 : 0);
