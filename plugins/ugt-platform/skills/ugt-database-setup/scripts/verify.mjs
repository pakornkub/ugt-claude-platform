#!/usr/bin/env node
// Verification Checklist ของ ugt-database-setup ในรูปแบบที่รันได้
//
//   node <path-to-skill>/scripts/verify.mjs
//
// ยึด process.cwd() เป็น root ของโปรเจคเสมอ (ไม่ใช่ที่ที่ script วางอยู่) —
// script นี้ต้องทำงานได้ทั้งเมื่อ skill มาจาก plugin cache และเมื่อถูก copy เข้าโปรเจค
// ไฟล์ที่ควรมีแต่หาไม่เจอ = FAIL ไม่ใช่ผ่าน (ตัวตรวจที่หาไฟล์ไม่เจอแล้วบอกว่าผ่านคือตัวตรวจที่โกหก)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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

/** ไล่ไฟล์ source ทั้งโปรเจค (ข้าม dir ที่ไม่ใช่ของเรา) */
function sourceFiles(exts = ['.ts', '.tsx']) {
  const skip = new Set([
    'node_modules',
    '.next',
    '.git',
    'coverage',
    'test-results',
    'generated',
    '.claude',
  ]);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (exts.some((e) => entry.endsWith(e))) out.push(full);
    }
  };
  walk(ROOT);
  return out;
}

// ── 1. ไฟล์ที่ต้องมี ────────────────────────────────────────────────────────
const REQUIRED = ['prisma/schema.prisma', 'prisma.config.ts', 'lib/prisma.ts', 'lib/env.ts'];
check('ไฟล์หลักครบ', () => {
  const missing = REQUIRED.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `ไม่พบ: ${missing.join(', ')} — รัน ugt-database-setup ก่อน` }
    : { ok: true };
});

const schemaExists = has('prisma/schema.prisma');
const schema = schemaExists ? read('prisma/schema.prisma') : '';

// ── 2. datasource / generator ───────────────────────────────────────────────
check('`url` ไม่อยู่ใน datasource ของ schema.prisma', () => {
  if (!schemaExists) return { ok: false, msg: 'ไม่มี schema.prisma' };
  const ds = schema.match(/datasource\s+\w+\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  return /^\s*url\s*=/m.test(ds)
    ? { ok: false, msg: 'พบ `url` ใน datasource — Prisma 7 + driver adapter จะ fail' }
    : { ok: true };
});

check('prisma.config.ts มี url', () => {
  if (!has('prisma.config.ts')) return { ok: false, msg: 'ไม่มี prisma.config.ts' };
  return /url\s*:/.test(read('prisma.config.ts'))
    ? { ok: true }
    : { ok: false, msg: 'prisma.config.ts ไม่มี `url` — connection จะไม่ถูกส่งให้ adapter' };
});

check('generator provider = "prisma-client-js"', () => {
  if (!schemaExists) return { ok: false, msg: 'ไม่มี schema.prisma' };
  const gen = schema.match(/generator\s+\w+\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  if (/provider\s*=\s*"prisma-client-js"/.test(gen)) return { ok: true };
  const found = gen.match(/provider\s*=\s*"([^"]+)"/)?.[1] ?? '(ไม่พบ)';
  return { ok: false, msg: `provider = "${found}" — ต้องเป็น "prisma-client-js" (ตัวอื่นไม่มี MSSQL driver adapter)` };
});

// ── 3. process.env ─────────────────────────────────────────────────────────
// ไฟล์ที่อ่าน process.env ตรง ๆ ได้ตามข้อยกเว้นที่ตั้งใจ:
// lib/env.ts = จุดเดียวที่ validate · *.config.ts ที่ root, instrumentation, sentry config
// = รันนอก app runtime (ก่อน env schema มีผล) · test/e2e = รันนอก app
const ENV_ALLOWED = [/^lib\/env\.ts$/, /^[^/]+\.config\.(ts|mjs|js)$/, /^instrumentation.*\.ts$/, /^sentry\..*\.config\.ts$/];
const ENV_ALLOWED_DIRS = [/^e2e\//, /\.(test|spec)\.tsx?$/];
check('ไม่มี process.env นอกไฟล์ที่อนุญาต', () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if ([...ENV_ALLOWED, ...ENV_ALLOWED_DIRS].some((re) => re.test(rel))) continue;
    const body = readFileSync(file, 'utf8');
    // NEXT_PUBLIC_* อ่านตรง ๆ ได้ตามข้อยกเว้นที่ ugt-auth-setup ระบุ (client bundle)
    const bad = [...body.matchAll(/process\.env\.(\w+)/g)]
      .map((m) => m[1])
      .filter((v) => !v.startsWith('NEXT_PUBLIC_') && v !== 'CI' && v !== 'NODE_ENV');
    if (bad.length) offenders.push(`${rel} (${[...new Set(bad)].join(', ')})`);
  }
  return offenders.length
    ? { ok: false, msg: `อ่าน process.env ตรง ๆ: ${offenders.slice(0, 5).join(' · ')}${offenders.length > 5 ? ` …อีก ${offenders.length - 5}` : ''} — import จาก @/lib/env แทน` }
    : { ok: true };
});

// ── 4. naming convention ใน schema ─────────────────────────────────────────
// ตารางที่ ugt-auth-setup ติดตั้ง map ชื่อ **เอกพจน์** — เป็นข้อยกเว้นจากกฎ PascalCase พหูพจน์
// (core ของ Better Auth ใช้ชื่อเอกพจน์ตาม convention ของ library และตาราง RBAC
// วางอยู่ข้างกันในไฟล์เดียว จึงใช้รูปเดียวกันทั้งชุด — ดู assets/schema-auth.prisma ของ ugt-auth-setup)
const BETTER_AUTH_MODELS = new Set([
  'user',
  'session',
  'account',
  'verification',
  'rateLimit',
  'role',
  'permission',
  'rolePermission',
]);

function parseModels() {
  return [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)].map(([, name, body]) => ({
    name,
    body,
    map: body.match(/@@map\("([^"]+)"\)/)?.[1] ?? null,
    fields: body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//') && !l.startsWith('@@'))
      .map((l) => ({
        line: l,
        name: l.split(/\s+/)[0],
        map: l.match(/@map\("([^"]+)"\)/)?.[1] ?? null,
      })),
  }));
}
const models = schemaExists ? parseModels() : [];

check('ทุก model มี @@map()', () => {
  const missing = models.filter((m) => !m.map).map((m) => m.name);
  return missing.length ? { ok: false, msg: `ไม่มี @@map: ${missing.join(', ')}` } : { ok: true };
});

check('@@map เป็น PascalCase พหูพจน์ (ยกเว้นตาราง Better Auth)', () => {
  const bad = models
    .filter((m) => m.map && !BETTER_AUTH_MODELS.has(m.name))
    .filter((m) => !/^[A-Z]/.test(m.map) || !m.map.endsWith('s'))
    .map((m) => `${m.name} -> "${m.map}"`);
  return bad.length
    ? { ok: false, msg: `ชื่อตารางไม่ใช่ PascalCase พหูพจน์: ${bad.join(', ')}` }
    : { ok: true };
});

check('ทุก scalar field มี @map()', () => {
  const bad = [];
  for (const m of models) {
    for (const f of m.fields) {
      if (f.map) continue;
      // ข้าม relation field และ field ที่ไม่ใช่คอลัมน์จริง
      if (/@relation|\[\]/.test(f.line)) continue;
      const type = f.line.split(/\s+/)[1] ?? '';
      const isScalar = /^(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Bytes|Json)\??$/.test(type);
      if (isScalar) bad.push(`${m.name}.${f.name}`);
    }
  }
  return bad.length
    ? { ok: false, msg: `ไม่มี @map: ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? ` …อีก ${bad.length - 10}` : ''}` }
    : { ok: true };
});

// ── 5. T-SQL reserved words ────────────────────────────────────────────────
const RESERVED = ['key', 'value', 'group', 'count', 'order', 'day', 'month', 'user', 'session', 'index', 'check', 'default', 'primary', 'table', 'column', 'view', 'select', 'from', 'where'];
check('ไม่มีชื่อคอลัมน์ชนคำสงวน T-SQL', () => {
  const bad = [];
  for (const m of models) {
    for (const f of m.fields) {
      if (!f.map) continue;
      if (RESERVED.includes(f.map.toLowerCase())) bad.push(`${m.name}.${f.name} -> "${f.map}"`);
    }
  }
  return bad.length
    ? { ok: false, msg: `คอลัมน์ชนคำสงวน (เติมคำขยาย เช่น key->SettingKey): ${bad.join(', ')}` }
    : { ok: true };
});

// ── 6. audit columns ──────────────────────────────────────────────────────
const AUDIT = ['Id', 'CreatedAt', 'UpdatedAt', 'CreatedBy', 'UpdatedBy', 'IsActive', 'IsDeleted'];
check('audit columns ครบในตารางที่ app เป็นเจ้าของ (warn)', () => {
  const skip = new Set([...BETTER_AUTH_MODELS, 'activityLog', 'role', 'permission', 'rolePermission']);
  const incomplete = [];
  for (const m of models) {
    if (skip.has(m.name) || !m.map) continue;
    const cols = m.fields.map((f) => f.map).filter(Boolean);
    const missing = AUDIT.filter((a) => !cols.includes(a));
    if (missing.length) incomplete.push(`${m.name} (ขาด ${missing.join('/')})`);
  }
  return incomplete.length
    ? { ok: 'warn', msg: `${incomplete.join(' · ')} — ตาราง master/transaction ควรมีครบ ตาราง lookup/join ยกเว้นได้` }
    : { ok: true };
});

// ── 7. raw SQL ────────────────────────────────────────────────────────────
check('ไม่มี $queryRawUnsafe / $executeRawUnsafe', () => {
  const bad = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    if (/\$(query|execute)RawUnsafe/.test(body)) bad.push(relative(ROOT, file));
  }
  return bad.length
    ? { ok: false, msg: `ใช้ Unsafe variant: ${bad.join(', ')} — ใช้ tagged template แทน` }
    : { ok: true };
});

// ── 8. env / gitignore ────────────────────────────────────────────────────
check('.env.example มีอยู่และไม่มีค่าจริงหลุด', () => {
  if (!has('.env.example')) return { ok: false, msg: 'ไม่มี .env.example' };
  const body = read('.env.example');
  // ค่าที่ไม่มีร่องรอย placeholder เลย = น่าสงสัยว่าเป็นค่าจริง
  const PLACEHOLDER = /<|CHANGE[_-]?ME|YOUR[_-]|REPLACE|TODO|xxx|\*\*\*|placeholder|example\.com/i;
  const leaked = body
    .split('\n')
    .filter((l) => /^(DATABASE_URL|.*PASSWORD|.*SECRET|.*TOKEN)=/i.test(l))
    .filter((l) => {
      const v = l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
      return v && !PLACEHOLDER.test(v);
    });
  return leaked.length
    ? { ok: false, msg: `.env.example อาจมีค่าจริง: ${leaked.map((l) => l.split('=')[0]).join(', ')}` }
    : { ok: true };
});

check('.env.local อยู่ใน .gitignore', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'ไม่มี .gitignore' };
  const ig = read('.gitignore');
  return /^\.env(\.local|\*)?$/m.test(ig) || ig.includes('.env.local') || ig.includes('.env*')
    ? { ok: true }
    : { ok: false, msg: '.gitignore ไม่ครอบ .env.local — secret จะถูก commit' };
});

check('build guard: lib/prisma.ts รองรับ SKIP_ENV_VALIDATION', () => {
  if (!has('lib/prisma.ts')) return { ok: false, msg: 'ไม่มี lib/prisma.ts' };
  const body = read('lib/prisma.ts');
  // asset ของ ugt-database-setup ใช้รูปแบบ `if (!url) return {} as sql.config`
  return /SKIP_ENV_VALIDATION|NEXT_PHASE|phase-production-build|!url/.test(body)
    ? { ok: true }
    : { ok: 'warn', msg: 'ไม่พบ build guard — `npm run build` โดยไม่มี DB จริงอาจ fail' };
});

// ── รายงาน ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-database-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} ผ่าน · ${warned} เตือน · ${failed} ไม่ผ่าน\n` +
    'ข้อที่ตรวจด้วยเครื่องไม่ได้ (ยังต้องทำมือ): npx prisma validate · npx prisma generate หลัง migrate\n'
);
process.exit(failed > 0 ? 1 : 0);
