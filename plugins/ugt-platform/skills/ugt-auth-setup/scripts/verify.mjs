#!/usr/bin/env node
// Verification Checklist ของ ugt-auth-setup ในรูปแบบที่รันได้ (ส่วนที่ตรวจด้วยเครื่องได้)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// ยึด process.cwd() เป็น root ของโปรเจค — ไฟล์ที่ควรมีแต่หาไม่เจอ = FAIL ไม่ใช่ผ่าน
// การทดสอบ flow จริง (login ได้ทุก method, logout แล้ว cookie หาย, /admin/setup)
// ตรวจด้วยเครื่องไม่ได้ — ยังต้องกดเองตาม §8 ใน SKILL.md
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const results = [];
const p = (...s) => join(ROOT, ...s);
const has = (...s) => existsSync(p(...s));
const read = (...s) => readFileSync(p(...s), 'utf8');

/** ตัดคอมเมนต์ออกก่อน scan — ไม่งั้นจะจับข้อความที่ "เตือนห้ามใช้" มาเป็นการใช้จริง */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function check(name, fn) {
  try {
    const r = fn();
    results.push({ name, ...(r ?? { ok: true }) });
  } catch (error) {
    results.push({ name, ok: false, msg: error.message });
  }
}

function sourceFiles() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', 'generated', '.claude']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|prisma)$/.test(entry)) out.push(full);
    }
  };
  walk(ROOT);
  return out;
}

const AUTH_FILES = [
  'lib/auth.ts',
  'lib/auth-client.ts',
  'lib/actions/auth.ts',
  'lib/permissions.ts',
  'lib/get-user-permissions.ts',
  'proxy.ts',
  'app/api/auth/[...all]/route.ts',
];
const pkg = has('package.json') ? JSON.parse(read('package.json')) : null;
const schema = has('prisma/schema.prisma') ? read('prisma/schema.prisma') : '';

// ── 1. ไฟล์ที่ต้องมี ────────────────────────────────────────────────────────
check('ไฟล์ auth หลักครบ', () => {
  const missing = AUTH_FILES.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `ไม่พบ: ${missing.join(', ')} — รัน ugt-auth-setup ก่อน` }
    : { ok: true };
});

check('proxy.ts ไม่ใช่ middleware.ts', () => {
  if (has('middleware.ts') && !has('proxy.ts')) {
    return { ok: false, msg: 'พบ middleware.ts — Next.js 16 ใช้ proxy.ts guard จะไม่ทำงาน' };
  }
  return { ok: true };
});

check('หน้า first-admin bootstrap มีอยู่', () => {
  const candidates = [
    'app/(admin-setup)/admin/setup/page.tsx',
    'app/admin/setup/page.tsx',
    'src/app/(admin-setup)/admin/setup/page.tsx',
  ];
  return candidates.some((c) => has(c))
    ? { ok: true }
    : { ok: false, msg: 'ไม่พบหน้า /admin/setup — deploy ครั้งแรกจะไม่มีทางได้ Administrator' };
});

// ── 2. placeholder ค้าง (รวมตัวที่ซ่อนกลางไฟล์) ───────────────────────────
const PLACEHOLDERS = [
  '<project-name>',
  '<base-path>',
  '<keycloak-host>',
  '<realm>',
  '<ldap-host>',
  '<ad-base-dn>',
  '<company-domain>',
  '<app-host>',
];
check('ไม่เหลือ placeholder <...>', () => {
  const found = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    const hits = PLACEHOLDERS.filter((ph) => body.includes(ph));
    if (hits.length) found.push(`${relative(ROOT, file)}: ${hits.join(', ')}`);
  }
  for (const f of ['.env.local', '.env.example', '.env']) {
    if (!has(f)) continue;
    const hits = PLACEHOLDERS.filter((ph) => read(f).includes(ph));
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

check('marker [METHOD: …] ถูกลบหมดแล้ว', () => {
  const found = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    const hits = [...new Set([...body.matchAll(/\[METHOD:\s*[^\]]+\]/g)].map((m) => m[0]))];
    if (hits.length) found.push(`${relative(ROOT, file)}: ${hits.join(', ')}`);
  }
  return found.length
    ? { ok: false, msg: `marker ค้าง (แปลว่ายังไม่ได้ตัด section ของ method ที่ไม่เปิด): ${found.join(' · ')}` }
    : { ok: true };
});

// ── 3. cookie prefix ต้องตรงกัน 3 จุด ─────────────────────────────────────
check('cookie prefix ตรงกันทั้ง 3 ไฟล์', () => {
  const targets = ['lib/auth.ts', 'proxy.ts', 'lib/actions/auth.ts'];
  const missing = targets.filter((f) => !has(f));
  if (missing.length) return { ok: false, msg: `ไม่มีไฟล์: ${missing.join(', ')}` };
  const noPrefix = targets.filter((f) => !/cookiePrefix|APP_COOKIE_PREFIX/.test(read(f)));
  if (noPrefix.length) {
    return {
      ok: false,
      msg: `ไม่อ้าง cookie prefix: ${noPrefix.join(', ')} — บน shared domain จะเจอ ERR_TOO_MANY_REDIRECTS`,
    };
  }
  // ทุกไฟล์ควร derive จาก NEXT_PUBLIC_BASE_PATH ไม่ใช่ hardcode
  const hardcoded = targets.filter((f) => {
    const body = read(f);
    return /cookiePrefix\s*:\s*['"][^'"]+['"]/.test(body);
  });
  return hardcoded.length
    ? { ok: false, msg: `hardcode cookie prefix: ${hardcoded.join(', ')} — ต้อง derive จาก NEXT_PUBLIC_BASE_PATH` }
    : { ok: true };
});

check('proxy redirect เป็น app-relative', () => {
  if (!has('proxy.ts')) return { ok: false, msg: 'ไม่มี proxy.ts' };
  const body = stripComments(read('proxy.ts'));
  // จับเฉพาะการ *เขียน* ค่าให้ url.pathname โดยมี basePath ปนอยู่ในบรรทัดเดียวกัน
  const bad = body
    .split('\n')
    .filter((l) => /\burl\.pathname\s*=/.test(l))
    .filter((l) => /basePath|BASE_PATH/.test(l));
  return bad.length
    ? { ok: false, msg: `ต่อ basePath เข้า url.pathname เอง → basePath ซ้ำใน URL (clone() พามาให้แล้ว): ${bad.map((l) => l.trim()).join(' · ')}` }
    : { ok: true };
});

check('proxy ปล่อยผ่าน /_next/ และ /api/health', () => {
  if (!has('proxy.ts')) return { ok: false, msg: 'ไม่มี proxy.ts' };
  const body = read('proxy.ts');
  const problems = [];
  if (!body.includes('_next')) problems.push('ไม่ bypass /_next/ → static asset จะได้ HTML redirect (Unexpected token \'<\')');
  if (!body.includes('/api/health')) problems.push('ไม่ bypass /api/health → healthcheck จะถูกเด้งไป /login');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── 4. Better Auth API ที่เรียกผิดบ่อย ────────────────────────────────────
check('ใช้ auth.api.signInEmail (ไม่ใช่ signIn.email)', () => {
  const bad = sourceFiles().filter((f) => /auth\.api\.signIn\.email/.test(readFileSync(f, 'utf8')));
  return bad.length
    ? { ok: false, msg: `${bad.map((f) => relative(ROOT, f)).join(', ')} — path นี้ไม่มีจริงใน Better Auth` }
    : { ok: true };
});

check('logout ไม่ใช้ cookieStore.delete()', () => {
  const bad = [];
  for (const f of ['lib/actions/auth.ts']) {
    if (!has(f)) continue;
    if (/cookie(Store)?\s*\.\s*delete\s*\(/.test(stripComments(read(f)))) bad.push(f);
  }
  return bad.length
    ? {
        ok: false,
        msg: `${bad.join(', ')} ใช้ cookieStore.delete() — ไม่ส่ง Secure flag บน https จึงลบ __Secure- cookie ไม่ได้ (ใช้ set(name, '', { maxAge: 0, secure }))`,
      }
    : { ok: true };
});

check('Keycloak plugin ถูก guard ด้วย env', () => {
  if (!has('lib/auth.ts')) return { ok: false, msg: 'ไม่มี lib/auth.ts' };
  const body = read('lib/auth.ts');
  if (!/KEYCLOAK/.test(body)) return { ok: 'warn', msg: 'ไม่ได้เปิด SSO (ไม่มีการอ้าง KEYCLOAK_*)' };
  return /KEYCLOAK_ISSUER\s*&&|KEYCLOAK_CLIENT_ID\s*&&|\?\s*\[/.test(body)
    ? { ok: true }
    : { ok: false, msg: 'เรียก keycloak() โดยไม่ guard undefined — build ด้วย SKIP_ENV_VALIDATION=1 จะ crash' };
});

// ── 5. schema ที่ auth ต้องการ ────────────────────────────────────────────
check('rateLimit model: id เป็น @id และ key nullable', () => {
  if (!schema) return { ok: false, msg: 'ไม่มี prisma/schema.prisma' };
  const model = schema.match(/model\s+rateLimit\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!model) return { ok: 'warn', msg: 'ไม่มี model rateLimit (ไม่ได้เปิด rate limit ของ Better Auth)' };
  const problems = [];
  if (!/^\s*id\s+String\s+@id/m.test(model)) problems.push('id ไม่ใช่ @id');
  if (!/^\s*key\s+String\?/m.test(model)) problems.push('key ไม่ nullable');
  return problems.length
    ? { ok: false, msg: `${problems.join(' · ')} — Better Auth v1 ส่ง id มาด้วย จะได้ error "Unknown argument 'id'"` }
    : { ok: true };
});

check('ตาราง auth/RBAC map ชื่อเอกพจน์ตาม convention', () => {
  if (!schema) return { ok: false, msg: 'ไม่มี prisma/schema.prisma' };
  const expect = {
    user: 'User',
    session: 'Session',
    account: 'Account',
    verification: 'Verification',
    rateLimit: 'RateLimit',
    role: 'Role',
    permission: 'Permission',
    rolePermission: 'RolePermission',
    activityLog: 'ActivityLogs',
  };
  const wrong = [];
  for (const [model, want] of Object.entries(expect)) {
    const body = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1];
    if (!body) continue;
    const got = body.match(/@@map\("([^"]+)"\)/)?.[1];
    if (got !== want) wrong.push(`${model} -> "${got ?? '(ไม่มี @@map)'}" ควรเป็น "${want}"`);
  }
  return wrong.length ? { ok: false, msg: wrong.join(' · ') } : { ok: true };
});

check('ActivityLogs ไม่ถูก UPDATE/DELETE จาก app code', () => {
  const bad = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    if (/prisma\.activityLog\.(update|delete|deleteMany|updateMany|upsert)/.test(body)) {
      bad.push(relative(ROOT, file));
    }
  }
  return bad.length
    ? { ok: false, msg: `${bad.join(', ')} — ตาราง audit เป็น append-only` }
    : { ok: true };
});

// ── 6. env ────────────────────────────────────────────────────────────────
check('BETTER_AUTH_SECRET บังคับความยาว ≥ 32', () => {
  if (!has('lib/env.ts')) return { ok: false, msg: 'ไม่มี lib/env.ts' };
  const body = read('lib/env.ts');
  if (!body.includes('BETTER_AUTH_SECRET')) return { ok: false, msg: 'lib/env.ts ไม่มี BETTER_AUTH_SECRET' };
  // min(32) หรือ min(32, 'ข้อความ') ก็ผ่านทั้งคู่
  return /BETTER_AUTH_SECRET\s*:[^\n]*min\(\s*32\s*[,)]/.test(body)
    ? { ok: true }
    : { ok: 'warn', msg: 'ไม่พบ .min(32) — secret สั้นจะทำให้ HMAC อ่อน' };
});

check('NEXT_PUBLIC_BASE_PATH อยู่ใน client block + runtimeEnv', () => {
  if (!has('lib/env.ts')) return { ok: false, msg: 'ไม่มี lib/env.ts' };
  const body = read('lib/env.ts');
  if (!body.includes('NEXT_PUBLIC_BASE_PATH')) {
    return { ok: 'warn', msg: 'ไม่ประกาศ NEXT_PUBLIC_BASE_PATH (โปรเจคไม่มี basePath ก็ปกติ)' };
  }
  const occurrences = (body.match(/NEXT_PUBLIC_BASE_PATH/g) ?? []).length;
  return occurrences >= 2
    ? { ok: true }
    : { ok: false, msg: 'ประกาศแค่ที่เดียว — ต้องอยู่ทั้ง client block และ runtimeEnv ไม่งั้น undefined ตอน runtime' };
});

check('ldapts ไม่ใช่ ldapjs', () => {
  if (!pkg) return { ok: false, msg: 'ไม่มี package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (deps.ldapjs) return { ok: false, msg: 'ใช้ ldapjs (deprecated, ไม่มี types) — เปลี่ยนเป็น ldapts' };
  const usesLdap = has('lib/ldap.ts');
  if (usesLdap && !deps.ldapts) return { ok: false, msg: 'มี lib/ldap.ts แต่ยังไม่ติดตั้ง ldapts' };
  return { ok: true };
});

check('.env.local ไม่ถูก commit', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'ไม่มี .gitignore' };
  const ig = read('.gitignore');
  return ig.includes('.env.local') || ig.includes('.env*')
    ? { ok: true }
    : { ok: false, msg: '.gitignore ไม่ครอบ .env.local — secret จะหลุดเข้า git' };
});

// ── รายงาน ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-auth-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} ผ่าน · ${warned} เตือน · ${failed} ไม่ผ่าน\n` +
    'ตรวจด้วยเครื่องไม่ได้ ต้องกดเอง: login ครบทุก method · logout แล้ว cookie + DB session หาย ·\n' +
    '/admin/setup กดครั้งเดียวได้ Administrator · ActivityLogs มีแถว login.success/logout\n'
);
process.exit(failed > 0 ? 1 : 0);
