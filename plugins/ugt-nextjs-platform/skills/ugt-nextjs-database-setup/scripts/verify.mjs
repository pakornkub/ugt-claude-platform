#!/usr/bin/env node
// Runnable version of the ugt-nextjs-database-setup Verification Checklist
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Always anchors at process.cwd() as the project root (not where the script
// lives) — this must work whether the skill came from the plugin cache or was
// copied into a project. A file that should exist but can't be found is a
// FAIL, never a pass (a checker that can't find its files and reports green is
// a checker that lies).
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

/** Walk all source files in the project (skipping non-source dirs) */
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

// ── 1. Required files ──────────────────────────────────────────────────────
const REQUIRED = ['prisma/schema.prisma', 'prisma.config.ts', 'lib/prisma.ts', 'lib/env.ts'];
check('Core files present', () => {
  const missing = REQUIRED.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-nextjs-database-setup first` }
    : { ok: true };
});

const schemaExists = has('prisma/schema.prisma');
const schema = schemaExists ? read('prisma/schema.prisma') : '';

// ── 2. datasource / generator ──────────────────────────────────────────────
check('No `url` inside the schema.prisma datasource', () => {
  if (!schemaExists) return { ok: false, msg: 'No schema.prisma' };
  const ds = schema.match(/datasource\s+\w+\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  return /^\s*url\s*=/m.test(ds)
    ? { ok: false, msg: '`url` found in datasource — Prisma 7 + driver adapter will fail' }
    : { ok: true };
});

check('prisma.config.ts carries the url', () => {
  if (!has('prisma.config.ts')) return { ok: false, msg: 'No prisma.config.ts' };
  return /url\s*:/.test(read('prisma.config.ts'))
    ? { ok: true }
    : { ok: false, msg: 'prisma.config.ts has no `url` — the connection never reaches the adapter' };
});

check('generator provider = "prisma-client-js"', () => {
  if (!schemaExists) return { ok: false, msg: 'No schema.prisma' };
  const gen = schema.match(/generator\s+\w+\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  if (/provider\s*=\s*"prisma-client-js"/.test(gen)) return { ok: true };
  const found = gen.match(/provider\s*=\s*"([^"]+)"/)?.[1] ?? '(not found)';
  return { ok: false, msg: `provider = "${found}" — must be "prisma-client-js" (others have no MSSQL driver adapter)` };
});

// ── 3. process.env ─────────────────────────────────────────────────────────
// Files allowed to read process.env directly, by deliberate exception:
// lib/env.ts = the single validation point · root *.config.ts, instrumentation,
// sentry configs = run outside the app runtime (before the env schema applies) ·
// test/e2e files = run outside the app
const ENV_ALLOWED = [/^lib\/env\.ts$/, /^[^/]+\.config\.(ts|mjs|js)$/, /^instrumentation.*\.ts$/, /^sentry\..*\.config\.ts$/];
const ENV_ALLOWED_DIRS = [/^e2e\//, /\.(test|spec)\.tsx?$/];
check('No process.env outside the allowlist', () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if ([...ENV_ALLOWED, ...ENV_ALLOWED_DIRS].some((re) => re.test(rel))) continue;
    const body = readFileSync(file, 'utf8');
    // NEXT_PUBLIC_* may be read directly per the ugt-nextjs-auth-setup exception (client bundle)
    const bad = [...body.matchAll(/process\.env\.(\w+)/g)]
      .map((m) => m[1])
      .filter((v) => !v.startsWith('NEXT_PUBLIC_') && v !== 'CI' && v !== 'NODE_ENV');
    if (bad.length) offenders.push(`${rel} (${[...new Set(bad)].join(', ')})`);
  }
  return offenders.length
    ? { ok: false, msg: `Direct process.env reads: ${offenders.slice(0, 5).join(' · ')}${offenders.length > 5 ? ` …and ${offenders.length - 5} more` : ''} — import from @/lib/env instead` }
    : { ok: true };
});

// ── 4. Schema naming conventions ───────────────────────────────────────────
// Tables installed by ugt-nextjs-auth-setup map to **singular** names — the exception
// to the PascalCase-plural rule (Better Auth core uses singular by its own
// convention, and the RBAC tables sit next to them in the same file, so the
// whole set shares the form — see ugt-nextjs-auth-setup's assets/schema-auth.prisma)
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

check('Every model has @@map()', () => {
  const missing = models.filter((m) => !m.map).map((m) => m.name);
  return missing.length ? { ok: false, msg: `No @@map: ${missing.join(', ')}` } : { ok: true };
});

check('@@map is PascalCase plural (Better Auth tables exempt)', () => {
  const bad = models
    .filter((m) => m.map && !BETTER_AUTH_MODELS.has(m.name))
    .filter((m) => !/^[A-Z]/.test(m.map) || !m.map.endsWith('s'))
    .map((m) => `${m.name} -> "${m.map}"`);
  return bad.length
    ? { ok: false, msg: `Table names not PascalCase plural: ${bad.join(', ')}` }
    : { ok: true };
});

check('Every scalar field has @map()', () => {
  const bad = [];
  for (const m of models) {
    for (const f of m.fields) {
      if (f.map) continue;
      // skip relation fields and non-column lines
      if (/@relation|\[\]/.test(f.line)) continue;
      const type = f.line.split(/\s+/)[1] ?? '';
      const isScalar = /^(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Bytes|Json)\??$/.test(type);
      if (isScalar) bad.push(`${m.name}.${f.name}`);
    }
  }
  return bad.length
    ? { ok: false, msg: `No @map: ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? ` …and ${bad.length - 10} more` : ''}` }
    : { ok: true };
});

// ── 5. T-SQL reserved words ────────────────────────────────────────────────
const RESERVED = ['key', 'value', 'group', 'count', 'order', 'day', 'month', 'user', 'session', 'index', 'check', 'default', 'primary', 'table', 'column', 'view', 'select', 'from', 'where'];
check('No column name collides with a T-SQL reserved word', () => {
  const bad = [];
  for (const m of models) {
    for (const f of m.fields) {
      if (!f.map) continue;
      if (RESERVED.includes(f.map.toLowerCase())) bad.push(`${m.name}.${f.name} -> "${f.map}"`);
    }
  }
  return bad.length
    ? { ok: false, msg: `Reserved-word columns (add a qualifier, e.g. key->SettingKey): ${bad.join(', ')}` }
    : { ok: true };
});

// ── 6. Audit columns ───────────────────────────────────────────────────────
const AUDIT = ['Id', 'CreatedAt', 'UpdatedAt', 'CreatedBy', 'UpdatedBy', 'IsActive', 'IsDeleted'];
check('Audit columns complete on app-owned tables (warn)', () => {
  const skip = new Set([...BETTER_AUTH_MODELS, 'activityLog']);
  const incomplete = [];
  for (const m of models) {
    if (skip.has(m.name) || !m.map) continue;
    const cols = m.fields.map((f) => f.map).filter(Boolean);
    const missing = AUDIT.filter((a) => !cols.includes(a));
    if (missing.length) incomplete.push(`${m.name} (missing ${missing.join('/')})`);
  }
  return incomplete.length
    ? { ok: 'warn', msg: `${incomplete.join(' · ')} — master/transaction tables should carry the full set; lookup/join tables may be exempt` }
    : { ok: true };
});

// ── 7. Raw SQL ─────────────────────────────────────────────────────────────
check('No $queryRawUnsafe / $executeRawUnsafe', () => {
  const bad = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    if (/\$(query|execute)RawUnsafe/.test(body)) bad.push(relative(ROOT, file));
  }
  return bad.length
    ? { ok: false, msg: `Unsafe variants in use: ${bad.join(', ')} — use tagged templates instead` }
    : { ok: true };
});

// ── 8. env / gitignore ─────────────────────────────────────────────────────
check('.env.example exists and leaks no real values', () => {
  if (!has('.env.example')) return { ok: false, msg: 'No .env.example' };
  const body = read('.env.example');
  // A value with no trace of a placeholder is suspect
  const PLACEHOLDER = /<|CHANGE[_-]?ME|YOUR[_-]|REPLACE|TODO|xxx|\*\*\*|placeholder|example\.com/i;
  const leaked = body
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .filter((l) => /^(DATABASE_URL|.*PASSWORD|.*SECRET|.*TOKEN)=/i.test(l))
    .filter((l) => {
      const v = l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
      return v && !PLACEHOLDER.test(v);
    });
  return leaked.length
    ? { ok: false, msg: `.env.example may hold real values: ${leaked.map((l) => l.split('=')[0]).join(', ')}` }
    : { ok: true };
});

check('.env.local is gitignored', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'No .gitignore' };
  const ig = read('.gitignore');
  return /^\.env(\.local|\*)?$/m.test(ig) || ig.includes('.env.local') || ig.includes('.env*')
    ? { ok: true }
    : { ok: false, msg: '.gitignore does not cover .env.local — secrets would be committed' };
});

check('Build guard: lib/prisma.ts survives SKIP_ENV_VALIDATION', () => {
  if (!has('lib/prisma.ts')) return { ok: false, msg: 'No lib/prisma.ts' };
  const body = read('lib/prisma.ts');
  // ugt-nextjs-database-setup's asset uses the `if (!url) return {} as sql.config` form
  return /SKIP_ENV_VALIDATION|NEXT_PHASE|phase-production-build|!url/.test(body)
    ? { ok: true }
    : { ok: 'warn', msg: 'No build guard found — `npm run build` without a live DB may fail' };
});

// ── Report ─────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-database-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Not machine-checkable (still manual): npx prisma validate · npx prisma generate after every migrate\n'
);
process.exit(failed > 0 ? 1 : 0);
