#!/usr/bin/env node
// Runnable version of the ugt-python-cicd-setup Verification Checklist (the "files in repo" part)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
// Only the repo side is checkable here; the server side (Jenkins
// tools/credentials, docker group membership, SonarQube projects, webhooks)
// needs admin confirmation — see §7 (server side) in SKILL.md.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
  'requirements-dev.txt',
];
const jf = has('Jenkinsfile') ? read('Jenkinsfile') : '';
const pyproject = has('pyproject.toml') ? read('pyproject.toml') : '';

// ── 1. Required files ──────────────────────────────────────────────────────
check('CI files present', () => {
  const missing = CI_FILES.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-python-cicd-setup first` }
    : { ok: true };
});

check('requirements.txt + requirements-dev.txt present as separate files', () => {
  const missing = [];
  if (!has('requirements.txt')) missing.push('requirements.txt');
  if (!has('requirements-dev.txt')) missing.push('requirements-dev.txt');
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — Install stage and Dockerfile both COPY requirements.txt directly` }
    : { ok: true };
});

// recursively list *.py files, skipping .venv (and other noise dirs that can
// legitimately appear in a Python project workspace)
function listPyFiles(dir, skip = new Set(['.venv', '.git', '__pycache__', 'node_modules'])) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listPyFiles(full, skip));
    else if (entry.name.endsWith('.py')) out.push(full);
  }
  return out;
}

check('/api/health exists', () => {
  // Only web shapes carry the [WEB] health-poll block in the Deploy stage —
  // batch shape has no long-running process to poll (SKILL.md §2.8).
  if (!/\[WEB\]/.test(jf)) return { ok: true };
  const hits = listPyFiles(ROOT).filter((f) => readFileSync(f, 'utf8').includes('/api/health'));
  if (!hits.length) {
    return {
      ok: false,
      msg: 'No /api/health string found in **/*.py — the container never reports healthy → Deploy stage fails',
    };
  }
  const body = hits.map((f) => readFileSync(f, 'utf8')).join('\n');
  return /version|commit|sha/i.test(body) && !/#.*version/i.test(body)
    ? { ok: 'warn', msg: `${hits[0]} may expose version/commit info — this endpoint is public` }
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
    : { ok: false, msg: `{ = ${open} but } = ${close} — Groovy cannot parse (usually a botched [DB]/[VOLUME] block removal)` };
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

// ── 4. [DB] consistency with reality ───────────────────────────────────────
check('[DB] consistent with actual alembic/manage.py usage', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const hasDb = has('alembic.ini') || has('alembic') || has('manage.py');
  const marked = /\[DB\]/.test(jf);
  if (hasDb && !marked) {
    return { ok: false, msg: 'Project has alembic/manage.py but the Jenkinsfile has no [DB] migrate block — deploys will skip migration' };
  }
  if (!hasDb && marked) {
    return { ok: false, msg: 'No alembic/manage.py but the Jenkinsfile still carries a [DB] migrate block — the stage will fail' };
  }
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

check('sonar points at the coverage.xml report', () => {
  if (!sonar) return { ok: false, msg: 'No sonar-project.properties' };
  const val = sonarProp('sonar.python.coverage.reportPaths');
  if (!val) return { ok: false, msg: 'No sonar.python.coverage.reportPaths → new_coverage = 0% → gate blocks' };
  return val.includes('coverage.xml')
    ? { ok: true }
    : { ok: 'warn', msg: `Configured value is "${val}" — normally coverage.xml` };
});

// ── 6. compose / Dockerfile ────────────────────────────────────────────────
for (const f of ['docker-compose.yml', 'docker-compose.dev.yml']) {
  check(`${f} configured correctly`, () => {
    if (!has(f)) return { ok: false, msg: `No ${f}` };
    const body = read(f);
    const problems = [];
    if (/healthcheck/i.test(body) && !body.includes('127.0.0.1')) {
      problems.push('healthcheck not using 127.0.0.1 (localhost on slim resolves IPv6 and fails)');
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
  // Batch shape (Dockerfile.batch) has no EXPOSE/HEALTHCHECK by design — no
  // long-running process to poll (SKILL.md §5.3). Web shape must have one.
  if (!/\[WEB\]/.test(jf)) return { ok: true };
  return /HEALTHCHECK/.test(read('Dockerfile'))
    ? { ok: true }
    : { ok: false, msg: 'No HEALTHCHECK — the Deploy stage cannot poll for healthy' };
});

// ── 7. Python tooling ───────────────────────────────────────────────────────
check('pyproject.toml has [tool.ruff] and [tool.pytest.ini_options] wired for CI', () => {
  if (!pyproject) return { ok: false, msg: 'No pyproject.toml — run ugt-python-cicd-setup first' };
  const problems = [];
  if (!/\[tool\.ruff\]/.test(pyproject)) problems.push('no [tool.ruff] section');
  const pytestSection = pyproject.match(/\[tool\.pytest\.ini_options\]([\s\S]*?)(\n\[|$)/);
  if (!pytestSection) {
    problems.push('no [tool.pytest.ini_options] section');
  } else if (!/test-results\/junit\.xml/.test(pytestSection[1])) {
    problems.push('[tool.pytest.ini_options] does not point at test-results/junit.xml — Unit Tests stage cannot publish JUnit results');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('tests/ has at least one test_*.py file', () => {
  if (!has('tests')) return { ok: false, msg: 'No tests/ directory — pytest has nothing to run' };
  const files = readdirSync(p('tests')).filter((f) => /^test_.*\.py$/.test(f));
  return files.length ? { ok: true } : { ok: false, msg: 'tests/ has no test_*.py files — pytest collects 0 tests' };
});

// ── 8. .env / .gitignore / .dockerignore ───────────────────────────────────
check('.env / .env.dev are gitignored (and .env.example is not)', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'No .gitignore — .env/.env.dev would be committable' };
  const lines = read('.gitignore').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const ignoresLiteral = (name) => lines.includes(name) || lines.includes(`/${name}`);
  const broadEnvGlob = lines.some((l) => /^\.env\*$/.test(l));
  const exampleExempted = lines.includes('!.env.example') || lines.includes('!/.env.example');
  const missing = ['.env', '.env.dev'].filter((name) => !ignoresLiteral(name) && !broadEnvGlob);
  if (missing.length) return { ok: false, msg: `.gitignore doesn't cover: ${missing.join(', ')} — real secrets could be committed` };
  if (broadEnvGlob && !exampleExempted) {
    return { ok: false, msg: '.gitignore has a broad ".env*" rule with no "!.env.example" negation — the committable template would be ignored too' };
  }
  return { ok: true };
});

check('.env.example is committed (documents required keys)', () => {
  return has('.env.example')
    ? { ok: true }
    : { ok: false, msg: 'No .env.example — dev/admin have no record of which keys are required' };
});

check('.dockerignore excludes CI artifacts from the build context', () => {
  if (!has('.dockerignore')) {
    return { ok: false, msg: 'No .dockerignore — .venv/coverage/dc-report/test-results will bloat or leak into the image' };
  }
  const lines = read('.dockerignore').split('\n').map((l) => l.trim());
  const required = ['.venv', 'coverage', 'dc-report', 'test-results'];
  const missing = required.filter((r) => !lines.some((l) => l === r || l.startsWith(`${r}/`) || l.startsWith(`${r}*`)));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — Docker build context and/or git will pick these up` }
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
console.log('\nugt-python-cicd-setup — verify (repo side)\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Still needs admin confirmation: Jenkins tools (SonarQube-Scanner, Dependency-Check) · Jenkins user in the docker group · ' +
    'credentials (nvd, env-<project>, env-<project>-dev) + global env (NOTIFY_EMAIL, SMTP_FROM) · SonarQube projects + Quality Gate · ' +
    'both webhooks · Lightweight checkout disabled · /srv/appdata writable\n'
);
process.exit(failed > 0 ? 1 : 0);
