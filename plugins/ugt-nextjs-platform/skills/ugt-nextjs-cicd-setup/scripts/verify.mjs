#!/usr/bin/env node
// Runnable version of the ugt-nextjs-cicd-setup Verification Checklist (the "files in repo" part)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
// Only the repo side is checkable here; the server side (Jenkins
// credentials/tools, SonarQube projects, webhooks) needs admin confirmation —
// see §6 in SKILL.md.
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

// The Jenkinsfile's header legend permanently documents [DB]/[SENTRY]/[VOLUME]
// in comments — a substring test for a tag against the WHOLE file is therefore
// always true, even after the blocks were correctly deleted. Anchor at the real
// pipeline body and drop `//`-led comment lines before testing which tags are
// actually IN USE. (Same fix as the python/php verify scripts.)
const PIPELINE_START = jf.indexOf('pipeline {');
const jfBody = PIPELINE_START >= 0 ? jf.slice(PIPELINE_START) : jf;
const jfActive = jfBody
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

// ── 1. Required files ──────────────────────────────────────────────────────
check('CI files present', () => {
  const missing = CI_FILES.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-nextjs-cicd-setup first` }
    : { ok: true };
});

check('/api/health exists', () => {
  const candidates = ['app/api/health/route.ts', 'app/api/health/route.tsx', 'src/app/api/health/route.ts'];
  if (!candidates.some((c) => has(c))) {
    return { ok: false, msg: 'No /api/health route — the container never reports healthy → Deploy stage fails' };
  }
  const file = candidates.find((c) => has(c));
  const body = read(file);
  return /version|commit|sha/i.test(body) && !/\/\/.*version/i.test(body)
    ? { ok: 'warn', msg: `${file} may expose version/commit info — this endpoint is public` }
    : { ok: true };
});

// ── 2. Leftover placeholders ───────────────────────────────────────────────
check('No __*__ placeholders left', () => {
  const found = [];
  for (const f of CI_FILES) {
    if (!has(f)) continue;
    const hits = [...new Set([...read(f).matchAll(/__[A-Z][A-Z0-9_]*__/g)].map((m) => m[0]))];
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

// ── 3. Jenkinsfile — structure ─────────────────────────────────────────────
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
check('Jenkinsfile has 10 stages in order', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const names = [...jf.matchAll(/stage\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
  const missing = STAGES.filter((s) => !names.some((n) => n.toLowerCase().includes(s.toLowerCase())));
  if (missing.length) return { ok: false, msg: `Missing stages: ${missing.join(', ')} (found ${names.length})` };
  // order check
  let cursor = -1;
  for (const s of STAGES) {
    const idx = names.findIndex((n, i) => i > cursor && n.toLowerCase().includes(s.toLowerCase()));
    if (idx === -1) return { ok: false, msg: `Stage "${s}" is out of order` };
    cursor = idx;
  }
  return { ok: true };
});

check('Quality Gate actually blocks the pipeline', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  if (!/waitForQualityGate/.test(jf)) return { ok: false, msg: 'No waitForQualityGate — the gate blocks nothing' };
  return /abortPipeline\s*:\s*true/.test(jf)
    ? { ok: true }
    : { ok: false, msg: 'waitForQualityGate without abortPipeline: true → gate goes red while the pipeline stays green' };
});

check('post block complete (notifications + cleanWs)', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const problems = [];
  if (!/emailext/.test(jf)) problems.push('no emailext');
  if (!/cleanWs/.test(jf)) problems.push('no cleanWs (workspace grows every build)');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Braces balanced in the Jenkinsfile', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  // strip strings/comments first so braces inside text don't skew the count
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
    : { ok: false, msg: `{ = ${open} but } = ${close} — Groovy cannot parse (usually a botched [SENTRY]/[DB] block removal)` };
});

check('No Groovy interpolation of secrets', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  // Strip single-quoted Groovy strings first — inside sh '''…''' a ${VAR} is
  // correct shell expansion, not Groovy interpolation leaking into the log
  const groovyInterpolated = jf.replace(/'''[\s\S]*?'''/g, '').replace(/'[^'\n]*'/g, '');
  const bad = [...groovyInterpolated.matchAll(/\$\{[^}]*(SECRET|PASSWORD|TOKEN|NVD|DSN)[^}]*\}/gi)].map(
    (m) => m[0]
  );
  return bad.length
    ? { ok: false, msg: `Secrets Groovy-interpolated (leak into the build log): ${[...new Set(bad)].join(', ')} — use '$VAR' so the shell expands` }
    : { ok: true };
});

// ── 4. [DB] / [SENTRY] consistency with reality ────────────────────────────
check('[DB] consistent with actual Prisma usage', () => {
  if (!jf || !pkg) return { ok: false, msg: 'No Jenkinsfile or package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const hasPrisma = Boolean(deps.prisma || deps['@prisma/client']);
  // [DB] tags live in comments — the functional signal is the active prisma command
  const marked = /\[DB\]/.test(jfActive) || /prisma/i.test(jfActive);
  if (hasPrisma && !marked) return { ok: false, msg: 'Project has Prisma but the Jenkinsfile has no prisma/migrate steps — deploys will skip migration' };
  if (!hasPrisma && marked) return { ok: false, msg: 'No Prisma but the Jenkinsfile still carries [DB] blocks — the stage will fail' };
  return { ok: true };
});

check('[SENTRY] consistent with actual Sentry usage', () => {
  if (!jf || !pkg) return { ok: false, msg: 'No Jenkinsfile or package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const hasSentry = Object.keys(deps).some((d) => d.startsWith('@sentry/'));
  const marked = /\[SENTRY\]|SENTRY_DSN/i.test(jfActive);
  if (hasSentry && !marked) return { ok: 'warn', msg: 'Project has Sentry but the Jenkinsfile passes no DSN build-arg → client-side DSN will be empty' };
  if (!hasSentry && marked) return { ok: false, msg: 'No Sentry but the Jenkinsfile still references sentry-dsn-* credentials — withCredentials will fail' };
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

check('Every path in sonar.sources / sonar.tests exists', () => {
  if (!sonar) return { ok: false, msg: 'No sonar-project.properties' };
  const missing = [];
  for (const key of ['sonar.sources', 'sonar.tests']) {
    const val = sonarProp(key);
    if (!val) continue;
    for (const entry of val.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (!has(entry)) missing.push(`${key}: ${entry}`);
    }
  }
  return missing.length
    ? { ok: false, msg: `Nonexistent paths → sonar-scanner fails instantly: ${missing.join(' · ')}` }
    : { ok: true };
});

check('sonar points at the lcov file', () => {
  if (!sonar) return { ok: false, msg: 'No sonar-project.properties' };
  const val = sonarProp('sonar.javascript.lcov.reportPaths');
  if (!val) return { ok: false, msg: 'No sonar.javascript.lcov.reportPaths → new_coverage = 0% → gate blocks' };
  return val.includes('lcov.info')
    ? { ok: true }
    : { ok: 'warn', msg: `Configured value is "${val}" — normally coverage/lcov.info` };
});

// ── 6. compose / Dockerfile ────────────────────────────────────────────────
for (const f of ['docker-compose.yml', 'docker-compose.dev.yml']) {
  check(`${f} configured correctly`, () => {
    if (!has(f)) return { ok: false, msg: `No ${f}` };
    const body = read(f);
    const problems = [];
    if (/healthcheck/i.test(body) && !body.includes('127.0.0.1')) {
      problems.push('healthcheck not using 127.0.0.1 (localhost on Alpine resolves IPv6 and fails)');
    }
    if (!/pull_policy\s*:\s*never/.test(body)) {
      problems.push('no pull_policy: never (compose will try to pull a locally-built image)');
    }
    if (!/APP_PORT/.test(body)) problems.push('no APP_PORT override');
    // volumes must live under /srv/appdata (org contract — Persistent data)
    const vols = [...body.matchAll(/^\s*-\s*(\/[^:\s]+):/gm)].map((m) => m[1]);
    const stray = vols.filter((v) => !v.startsWith('/srv/appdata/'));
    if (stray.length) problems.push(`bind mount นอก /srv/appdata: ${stray.join(', ')}`);
    return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
  });
}

check('Dockerfile has a HEALTHCHECK', () => {
  if (!has('Dockerfile')) return { ok: false, msg: 'No Dockerfile' };
  return /HEALTHCHECK/.test(read('Dockerfile'))
    ? { ok: true }
    : { ok: false, msg: 'No HEALTHCHECK — the Deploy stage cannot poll for healthy' };
});

check('next.config enables standalone output', () => {
  const cfg = ['next.config.ts', 'next.config.mjs', 'next.config.js'].find((f) => has(f));
  if (!cfg) return { ok: false, msg: 'No next.config.* found' };
  return /output\s*:/.test(read(cfg)) && /standalone/.test(read(cfg))
    ? { ok: true }
    : { ok: false, msg: `${cfg} does not set output: 'standalone' — the Dockerfile's COPY .next/standalone will fail` };
});

// ── 7. Scripts the pipeline calls ──────────────────────────────────────────
check('npm scripts the pipeline calls are present', () => {
  if (!pkg) return { ok: false, msg: 'No package.json' };
  const missing = ['lint', 'format:check', 'test:coverage', 'build'].filter((s) => !pkg.scripts?.[s]);
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-nextjs-test-lint-setup first` }
    : { ok: true };
});

check('.env / .env.dev are gitignored (and .env.example is not)', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'No .gitignore — .env/.env.dev/.env.local would be committable' };
  const lines = read('.gitignore').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const ignoresLiteral = (name) => lines.includes(name) || lines.includes(`/${name}`);
  const broadEnvGlob = lines.some((l) => /^\.env\*$/.test(l));
  const exampleExempted = lines.includes('!.env.example') || lines.includes('!/.env.example');
  const missing = ['.env', '.env.dev', '.env.local'].filter(
    (name) => !ignoresLiteral(name) && !broadEnvGlob
  );
  if (missing.length) return { ok: false, msg: `.gitignore doesn't cover: ${missing.join(', ')} — real secrets could be committed` };
  if (broadEnvGlob && !exampleExempted) {
    return { ok: false, msg: '.gitignore has a broad ".env*" rule with no "!.env.example" negation — the committable template would be ignored too' };
  }
  return { ok: true };
});

check('docs/admin-handoff.md rendered (no __*__ left)', () => {
  if (!has('docs/admin-handoff.md')) {
    return { ok: 'warn', msg: 'docs/admin-handoff.md missing — §4.6 renders it; the admin gets a chat snippet instead of a file' };
  }
  const hits = [...new Set([...read('docs/admin-handoff.md').matchAll(/__[A-Z][A-Z0-9_]*__/g)].map((m) => m[0]))];
  return hits.length
    ? { ok: false, msg: `placeholders left in docs/admin-handoff.md: ${hits.join(', ')} — the admin cannot act on a template` }
    : { ok: true };
});

check('Every compose /srv/appdata bind has its mkdir -p in the Jenkinsfile', () => {
  // The documented root:root failure (§4.3): a bind mount whose host dir the
  // Deploy stage never creates/chowns → docker creates it as root and the app
  // cannot write. Compare the <name> segment after /srv/appdata/<project>/.
  const names = new Set();
  for (const f of ['docker-compose.yml', 'docker-compose.dev.yml']) {
    if (!has(f)) continue;
    // Comment-stripped, same reason as jfActive: the shipped compose documents
    // the [VOLUME] block as a `#` example naming /uploads — scanning the raw
    // file makes a project with no volumes FAIL on a bind that never existed.
    const composeActive = read(f)
      .split('\n')
      .filter((l) => !l.trim().startsWith('#'))
      .join('\n');
    for (const m of composeActive.matchAll(/\/srv\/appdata\/[^/\s:]+\/([^\s:]+):/g)) names.add(m[1]);
  }
  if (names.size === 0) return { ok: true, msg: 'no /srv/appdata binds in compose — nothing to prepare' };
  // Match the path anywhere in the ACTIVE Jenkinsfile, not on `mkdir -p` lines:
  // the block iterates `for p in <path> <path>; do … mkdir -p "$p"`, so the
  // literal names live on the `for` line while the mkdir carries only `$p`.
  // jfActive, never jf: the shipped Jenkinsfile documents the step in a `//`
  // comment that already names /uploads and /reports, so scanning the raw file
  // lets the example satisfy the check for exactly those two volumes.
  const missing = [...names].filter((n) => !new RegExp(`/srv/appdata/[^/\\s]+/${n}\\b`).test(jfActive));
  return missing.length
    ? { ok: false, msg: `compose binds the Deploy stage never creates: ${missing.join(', ')} — add them to the \`for p in …\` list in the [VOLUME] block, or dockerd makes them root-owned on first up -d and the app cannot write` }
    : { ok: true };
});

check('.dockerignore exists and covers the heavy build debris', () => {
  // COPY . . in the builder stage runs over a Jenkins workspace that already
  // holds node_modules/.next/coverage from earlier stages — without a
  // .dockerignore the build context balloons and stale artifacts leak in.
  if (!has('.dockerignore')) {
    return { ok: false, msg: 'No .dockerignore — Dockerfile does COPY . . over a workspace containing node_modules/.next/coverage/test-results/dc-report' };
  }
  const body = read('.dockerignore');
  const missing = ['node_modules', '.next', 'coverage', 'test-results', 'dc-report', '.git'].filter(
    (entry) => !body.split('\n').some((l) => l.trim().replace(/\/$/, '') === entry)
  );
  return missing.length
    ? { ok: 'warn', msg: `.dockerignore missing entries: ${missing.join(', ')}` }
    : { ok: true };
});

check('owasp-suppressions.xml is readable XML', () => {
  if (!has('owasp-suppressions.xml')) return { ok: false, msg: 'No owasp-suppressions.xml' };
  const body = read('owasp-suppressions.xml');
  if (!/<suppressions/.test(body)) return { ok: false, msg: 'No <suppressions> root element' };
  const noReason = [...body.matchAll(/<suppress>([\s\S]*?)<\/suppress>/g)].filter(
    (m) => !/<notes>/.test(m[1])
  ).length;
  return noReason
    ? { ok: false, msg: `${noReason} suppression(s) without a <notes> rationale` }
    : { ok: true };
});

// ── Report ─────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-cicd-setup — verify (repo side)\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Still needs admin confirmation: Jenkins tools/credentials/global env · SonarQube projects + Quality Gate · both webhooks · Lightweight checkout disabled\n'
);
process.exit(failed > 0 ? 1 : 0);
