#!/usr/bin/env node
// Runnable version of the ugt-php-cicd-setup Verification Checklist (the "files in repo" part)
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
  'Dockerfile.ci',
  'docker-compose.yml',
  'docker-compose.dev.yml',
  'owasp-suppressions.xml',
  'phpunit.xml',
  'phpstan.neon',
  '.php-cs-fixer.php',
];
const jf = has('Jenkinsfile') ? read('Jenkinsfile') : '';
const sonar = has('sonar-project.properties') ? read('sonar-project.properties') : '';

// The header legend (top-of-file comment block) permanently documents every
// placeholder/tag as literal text ("[DB]", "[WP]", "__PROJECT_NAME__", ...) —
// a plain substring/regex test for a tag like [DB] or [WP] against the WHOLE
// file is therefore always true regardless of which blocks are actually IN
// USE. Anchor at the real pipeline body and drop `//`-led comment lines
// before testing which tags are actually active.
const PIPELINE_START = jf.indexOf('pipeline {');
const jfBody = PIPELINE_START >= 0 ? jf.slice(PIPELINE_START) : jf;
const jfActive = jfBody
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

// PHP has exactly one deploy shape ([WEB]) — no batch shape like Python's
// Dockerfile.batch, so HEALTHCHECK / healthcheck / /api/health are never
// conditional here.
const dockerfile = has('Dockerfile') ? read('Dockerfile') : '';
const isWordPress = /^FROM\s+wordpress/im.test(dockerfile);

// ── 1. Required files ──────────────────────────────────────────────────────
check('CI files present', () => {
  const missing = CI_FILES.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-php-cicd-setup first` }
    : { ok: true };
});

// ── 2. /api/health — three fixed locations, never a tree walk ──────────────
// SKILL.md §5.3: Laravel serves /api/health as a route (DocumentRoot = public/
// so a root-level file is never served); CI4/legacy/WordPress serve it as a
// plain file. Checking a small fixed set instead of walking **/*.php avoids
// false hits inside vendor/ and matches exactly the locations the setup step
// is allowed to place the file at.
check('/api/health exists (Laravel route or PHP file)', () => {
  const fileHits = ['api/health/index.php', 'public/api/health/index.php'].filter((f) => has(f));
  let routeHit = null;
  if (has('routes')) {
    for (const f of readdirSync(p('routes')).filter((n) => n.endsWith('.php'))) {
      if (read('routes', f).includes('/api/health')) {
        routeHit = `routes/${f}`;
        break;
      }
    }
  }
  if (!fileHits.length && !routeHit) {
    return {
      ok: false,
      msg:
        'No /api/health found — checked api/health/index.php, public/api/health/index.php, routes/*.php ' +
        '— the container never reports healthy → Deploy stage fails',
    };
  }
  const body = [...fileHits.map((f) => read(f)), ...(routeHit ? [read(routeHit)] : [])].join('\n');
  return /version|commit|sha/i.test(body) && !/(#|\/\/).*version/i.test(body)
    ? { ok: 'warn', msg: `${fileHits[0] ?? routeHit} may expose version/commit info — this endpoint is public` }
    : { ok: true };
});

// ── 3. Leftover placeholders ───────────────────────────────────────────────
// tests/SmokeTest.php carries its own __ENTRY_FILE__ placeholder and
// .claude/rules/ugt-php-ci.md carries __PROJECT_NAME__ twice (SKILL.md §5.2) —
// both are copied into every project, so scan them too, skipping silently if
// somehow absent (that absence is already caught by its own check below).
// PHP magic constants (__DIR__, __LINE__, ...) share the same __UPPER__ shape
// as our placeholders but are real language syntax in .php-cs-fixer.php and
// SmokeTest.php — allowlist them BY NAME, never by file extension, so a
// leftover __ENTRY_FILE__ or __PROJECT_NAME__ in the very same file still fails.
const PHP_MAGIC_CONSTANTS = new Set([
  '__DIR__',
  '__FILE__',
  '__LINE__',
  '__CLASS__',
  '__FUNCTION__',
  '__METHOD__',
  '__NAMESPACE__',
  '__TRAIT__',
  '__COMPILER_HALT_OFFSET__',
]);
const PLACEHOLDER_FILES = [...CI_FILES, 'tests/SmokeTest.php', '.claude/rules/ugt-php-ci.md'];
check('No __*__ placeholders left (PHP magic constants excluded)', () => {
  const found = [];
  for (const f of PLACEHOLDER_FILES) {
    if (!has(f)) continue;
    const hits = [...new Set([...read(f).matchAll(/__[A-Z][A-Z0-9_]*__/g)].map((m) => m[0]))].filter(
      (tag) => !PHP_MAGIC_CONSTANTS.has(tag)
    );
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

// ── 4. Jenkinsfile — structure ─────────────────────────────────────────────
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
    : { ok: false, msg: `{ = ${open} but } = ${close} — Groovy cannot parse (usually a botched [DB]/[VOLUME]/[WP] block removal)` };
});

check('No Groovy interpolation of secrets', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const groovyInterpolated = jf.replace(/'''[\s\S]*?'''/g, '').replace(/'[^'\n]*'/g, '');
  const bad = [...groovyInterpolated.matchAll(/\$\{[^}]*(SECRET|PASSWORD|TOKEN|NVD|DSN)[^}]*\}/gi)].map(
    (m) => m[0]
  );
  return bad.length
    ? { ok: false, msg: `Secrets Groovy-interpolated (leak into the build log): ${[...new Set(bad)].join(', ')} — use '$VAR' so the shell expands` }
    : { ok: true };
});

// ── 5. [DB] consistency with reality ───────────────────────────────────────
check('[DB] consistent with actual artisan usage', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const hasArtisan = has('artisan');
  // "[DB]" itself only ever appears inside comment lines (header legend + the
  // label on the migrate block) — the real functional signal that the Deploy
  // stage performs a migration is the active (non-comment) artisan/spark
  // migrate command.
  const marked = /\[DB\]/.test(jfActive) || /artisan\s+migrate|spark\s+migrate/.test(jfActive);
  if (hasArtisan && !marked) {
    // Warn, not fail — a Laravel project may genuinely have no migrations yet.
    return {
      ok: 'warn',
      msg: 'Project has artisan (Laravel) but the Jenkinsfile has no [DB] migrate block — confirm this is intentional (no migrations yet)',
    };
  }
  if (!hasArtisan && marked) {
    return { ok: false, msg: 'No artisan file but the Jenkinsfile still carries a [DB] migrate block — the Deploy stage will fail running php artisan migrate' };
  }
  return { ok: true };
});

// ── 6. sonar-project.properties ────────────────────────────────────────────
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

check('sonar points at clover.xml + junit.xml reports', () => {
  if (!sonar) return { ok: false, msg: 'No sonar-project.properties' };
  const problems = [];
  const cov = sonarProp('sonar.php.coverage.reportPaths');
  if (!cov) problems.push('no sonar.php.coverage.reportPaths → new_coverage = 0% → gate blocks');
  else if (!cov.includes('clover.xml')) problems.push(`sonar.php.coverage.reportPaths="${cov}" — normally clover.xml`);
  const tst = sonarProp('sonar.php.tests.reportPath');
  if (!tst) problems.push('no sonar.php.tests.reportPath → JUnit results not imported into Sonar');
  else if (!tst.includes('test-results/junit.xml')) problems.push(`sonar.php.tests.reportPath="${tst}" — normally test-results/junit.xml`);
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── 7. compose / Dockerfile ────────────────────────────────────────────────
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
    // PHP has one deploy shape only — APP_PORT override always applies.
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
  // No batch shape in PHP — every project's Dockerfile must poll /api/health.
  return /HEALTHCHECK/.test(dockerfile)
    ? { ok: true }
    : { ok: false, msg: 'No HEALTHCHECK — the Deploy stage cannot poll for healthy' };
});

// [WP] contract: wp-content must always be a mounted volume under /srv/appdata
// when the Dockerfile is WordPress-shaped (SKILL.md §5.3/§2.9) — this is the
// one exception to "delete [VOLUME] block if nothing persists", so it is
// checked unconditionally and FAILs (not warns) when missing.
check('[WP] wp-content volume present when Dockerfile is FROM wordpress', () => {
  if (!isWordPress) return { ok: true };
  const problems = [];
  for (const f of ['docker-compose.yml', 'docker-compose.dev.yml']) {
    if (!has(f)) {
      problems.push(`${f}: file missing`);
      continue;
    }
    const hasUncommentedVolume = read(f)
      .split('\n')
      .some((l) => {
        const t = l.trim();
        return !t.startsWith('#') && /^-\s*\/srv\/appdata\/[^:\s]*\/wp-content:/.test(t);
      });
    if (!hasUncommentedVolume) problems.push(`${f}: no uncommented wp-content volume under /srv/appdata`);
  }
  return problems.length
    ? { ok: false, msg: `Dockerfile is FROM wordpress — ${problems.join(' · ')} (SKILL.md §2.9: wp-content is a mandatory volume for WordPress)` }
    : { ok: true };
});

// ── 8. PHP tooling ──────────────────────────────────────────────────────────
check('phpunit.xml has junit outputFile=test-results/junit.xml', () => {
  if (!has('phpunit.xml')) return { ok: false, msg: 'No phpunit.xml' };
  return /<junit\s+outputFile\s*=\s*"test-results\/junit\.xml"\s*\/?>/.test(read('phpunit.xml'))
    ? { ok: true }
    : { ok: false, msg: 'No <junit outputFile="test-results/junit.xml"/> — Unit Tests stage cannot publish JUnit results' };
});

check('tests/ has at least one *Test.php file', () => {
  if (!has('tests')) return { ok: false, msg: 'No tests/ directory — phpunit has nothing to run' };
  const files = readdirSync(p('tests')).filter((f) => /Test\.php$/.test(f));
  return files.length ? { ok: true } : { ok: false, msg: 'tests/ has no *Test.php files — phpunit collects 0 tests' };
});

// ── 9. .env / .gitignore / .dockerignore ───────────────────────────────────
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
    return { ok: false, msg: 'No .dockerignore — vendor/coverage/dc-report/test-results will bloat or leak into the image' };
  }
  const lines = read('.dockerignore').split('\n').map((l) => l.trim());
  const required = ['vendor', 'coverage', 'dc-report', 'test-results'];
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
console.log('\nugt-php-cicd-setup — verify (repo side)\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Still needs admin confirmation: Jenkins tools (SonarQube-Scanner, Dependency-Check — no PHP/composer/NodeJS ' +
    'Global Tool needed, toolchain runs in docker per มติ M8) · Jenkins user in the docker group · ' +
    'credentials (nvd, env-<project>, env-<project>-dev) + global env (NOTIFY_EMAIL, SMTP_FROM) · SonarQube projects + Quality Gate · ' +
    'both webhooks · Lightweight checkout disabled · /srv/appdata writable\n'
);
process.exit(failed > 0 ? 1 : 0);
