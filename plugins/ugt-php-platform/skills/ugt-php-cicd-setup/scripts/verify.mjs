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
// Same rule as jfActive: the `[LARAVEL]`/`[DB]` blocks ship COMMENTED OUT in
// Dockerfile.web, so "is this configured?" must only ever look at live lines.
const dockerfileActive = dockerfile
  .split('\n')
  .filter((l) => !l.trim().startsWith('#'))
  .join('\n');
const isWordPress = /^FROM\s+wordpress/im.test(dockerfileActive);

// compose helpers — `volumes:` and the whole `[WP]` block ship commented out,
// so every structural test must ignore `#`-led lines (a raw scan reports
// `<name>` binds and healthchecks that do not exist).
const COMPOSE_FILES = ['docker-compose.yml', 'docker-compose.dev.yml'];
const composeActive = (f) =>
  has(f)
    ? read(f)
        .split('\n')
        .filter((l) => !l.trim().startsWith('#'))
        .join('\n')
    : '';

// Framework shape, from files that only that framework has (§3/§5.3).
// DocumentRoot = public/ is what actually decides where /api/health may live.
const isLaravel = has('artisan');
const isCI4 = has('spark') || has('public/index.php');
const publicDocroot = /sed -ri.*\/var\/www\/html\/public/.test(dockerfileActive);

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

check('/api/health sits where this shape actually serves it', () => {
  // §5.3 — "the file exists" is not enough: apache only serves what is under
  // the active DocumentRoot, and Dockerfile.wordpress COPYs one hardcoded path.
  if (isWordPress) {
    return has('api/health/index.php')
      ? { ok: true }
      : {
          ok: false,
          msg: 'shape = wordpress: Dockerfile.wordpress hardcodes `COPY api/health/index.php` — anywhere else and docker build fails (§5.3)',
        };
  }
  if (publicDocroot) {
    // DocumentRoot = public/ — a root-level api/health/index.php is never served
    const servedByRoute =
      isLaravel &&
      has('routes') &&
      readdirSync(p('routes')).some((n) => n.endsWith('.php') && read('routes', n).includes('/api/health'));
    if (servedByRoute || has('public/api/health/index.php')) return { ok: true };
    return {
      ok: false,
      msg: 'DocumentRoot is public/ ([LARAVEL] block active) but /api/health is only a root-level file — apache never serves it → container never healthy (§5.3: Laravel = route · CI4 = public/api/health/index.php)',
    };
  }
  return has('api/health/index.php')
    ? { ok: true }
    : {
        ok: false,
        msg: 'DocumentRoot is the repo root (CI3/legacy) — /api/health must be api/health/index.php (§5.3)',
      };
});

check('[LARAVEL] DocumentRoot block matches the framework', () => {
  if (!dockerfile) return { ok: false, msg: 'No Dockerfile' };
  if (isWordPress) return { ok: true }; // Dockerfile.wordpress has no such block
  if (isLaravel || isCI4) {
    return publicDocroot
      ? { ok: true }
      : {
          ok: false,
          msg: 'Laravel/CI4 project but the [LARAVEL] sed lines are still commented out — apache serves the repo root, so the front controller in public/ is never reached (§5.3)',
        };
  }
  if (publicDocroot && !has('public')) {
    return {
      ok: false,
      msg: '[LARAVEL] sed lines are active but there is no public/ directory — apache starts with a DocumentRoot that does not exist',
    };
  }
  // A legacy project may legitimately serve out of public/ — §5.3 allows it
  // ("เว้นแต่โปรเจคใช้ public/ เป็น webroot จริง ๆ"). isCI4 keys off
  // public/index.php, so a front-end whose entry is public/index.html (a JS app
  // on a PHP API) reads as "not CI4" and used to get told to delete a block it
  // is correctly using. An active sed + a real public/ IS a configured state.
  if (publicDocroot) return { ok: true };
  return /\[LARAVEL\]/.test(dockerfile)
    ? { ok: 'warn', msg: 'shape is not Laravel/CI4 and DocumentRoot is the repo root — §5.3 says delete the commented [LARAVEL] block instead of leaving it in the Dockerfile' }
    : { ok: true };
});

// §5.4 — `composer install` necessarily runs before `COPY . .` (it must, to keep
// the dependency layer cacheable), so any composer script firing at that point
// runs without app code. Laravel's post-autoload-dump hook is
// `php artisan package:discover`, which needs `artisan` — hence --no-scripts
// --no-autoloader on install, and a real `composer dump-autoload` after COPY.
check('Dockerfile composer ordering (--no-scripts → COPY → dump-autoload → chown)', () => {
  if (!dockerfile || isWordPress) return { ok: true }; // Dockerfile.wordpress runs no composer
  const lines = dockerfileActive.split('\n');
  const lineOf = (re) => lines.findIndex((l) => re.test(l));
  const install = lineOf(/composer install/);
  if (install < 0) return { ok: true }; // no composer step at all — not this check's concern

  // Accumulate BOTH severities to the end — an early return on the warn path
  // would throw away a `|| true` finding already collected above (caught by the
  // ugt-mscpl-ana pilot, whose legacy Dockerfile has `|| true` and no --no-scripts:
  // it reported only the warning and stayed silent about the swallowed errors).
  const problems = [];
  const warnings = [];
  if (/\|\|\s*true/.test(lines[install])) {
    problems.push(
      '`composer install ... || true` swallows every install failure (dependency resolve, missing ext-*), not just the post-autoload-dump one it was added for — drop it and use --no-scripts',
    );
  }
  if (!/--no-scripts/.test(lines[install])) {
    // Only Laravel/CI4 ship a hook that actually needs app code; for other
    // shapes a plain install is harmless today, so warn rather than fail.
    const msg =
      'composer install runs before `COPY . .` without --no-scripts — a post-autoload-dump hook fires with no app code present';
    if (isLaravel || isCI4) {
      problems.push(`${msg} (Laravel/CI4: \`php artisan package:discover\` needs artisan → fails every build)`);
    } else {
      warnings.push(`${msg} — harmless for this shape today, but any hook added later will break the build`);
    }
  }

  if (/--no-autoloader/.test(lines[install])) {
    const copy = lineOf(/^COPY\s+\.\s+\./);
    const dump = lineOf(/composer dump-autoload/);
    const chown = lineOf(/chown -R www-data/);
    if (dump < 0) {
      problems.push('install uses --no-autoloader but nothing runs `composer dump-autoload` afterwards — the image ships without an autoloader');
    } else if (copy >= 0 && dump < copy) {
      problems.push('`composer dump-autoload` runs BEFORE `COPY . .` — that is the ordering the --no-autoloader flag exists to avoid');
    } else if (chown >= 0 && chown < dump) {
      problems.push(
        '`chown -R www-data` runs BEFORE `composer dump-autoload` — the regenerated autoload_*.php and Laravel bootstrap/cache/*.php stay root-owned and www-data cannot write bootstrap/cache at runtime',
      );
    }
  }
  if (problems.length) return { ok: false, msg: [...problems, ...warnings].join(' · ') };
  return warnings.length ? { ok: 'warn', msg: warnings.join(' · ') } : { ok: true };
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
const PLACEHOLDER_FILES = [...CI_FILES, 'tests/SmokeTest.php', '.claude/rules/ugt-php-ci.md', 'docs/admin-handoff.md'];
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

check('Every compose /srv/appdata bind has its mkdir -p in the Jenkinsfile', () => {
  // ขั้นที่ "ห้ามลืม": bind mount ที่ Deploy stage ไม่ได้ mkdir/chown → docker
  // สร้างเป็น root:root — เคส WordPress (`wp-content`) คือข้อมูลหายตั้งแต่
  // deploy แรกถ้าพลาดข้อนี้
  // composeActive, never read(f): the shipped compose keeps both the [VOLUME]
  // and the [WP] block commented out with a literal `<name>` placeholder, so
  // scanning raw text reports binds that do not exist.
  const names = new Set();
  for (const f of COMPOSE_FILES) {
    for (const m of composeActive(f).matchAll(/\/srv\/appdata\/[^/\s:]+\/([^\s:]+):/g)) names.add(m[1]);
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
  // jfActive, never jf — a stage commented out instead of fixed must not count
  const names = [...jfActive.matchAll(/stage\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
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
  if (!/waitForQualityGate/.test(jfActive)) return { ok: false, msg: 'No waitForQualityGate — the gate blocks nothing' };
  return /abortPipeline\s*:\s*true/.test(jfActive)
    ? { ok: true }
    : { ok: false, msg: 'waitForQualityGate without abortPipeline: true → gate goes red while the pipeline stays green' };
});

check('post block complete (emailext ×4 + cleanWs)', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const problems = [];
  // §7 declares emailext ×4 — one per outcome. Missing `failure` is the
  // expensive one: the pipeline goes red and nobody is told.
  const missingOutcome = ['success', 'unstable', 'failure', 'aborted'].filter(
    (o) => !new RegExp(String.raw`\b${o}\s*\{[\s\S]{0,200}?emailext`).test(jfActive)
  );
  if (missingOutcome.length) problems.push(`post block has no emailext for: ${missingOutcome.join(', ')}`);
  if (!/cleanWs/.test(jfActive)) problems.push('no cleanWs (workspace grows every build)');
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
  // jfActive: a ${SECRET} shown inside a `//` comment leaks nothing
  const groovyInterpolated = jfActive.replace(/'''[\s\S]*?'''/g, '').replace(/'[^'\n]*'/g, '');
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
for (const f of COMPOSE_FILES) {
  check(`${f} configured correctly`, () => {
    if (!has(f)) return { ok: false, msg: `No ${f}` };
    // active content only — the template's comments name `healthcheck`/`volumes`
    // while describing blocks that are still switched off
    const body = composeActive(f);
    const problems = [];
    // YAML allows ONE `volumes:` key per service: the template ships a [VOLUME]
    // block AND a [WP] block, and uncommenting both makes the second silently
    // overwrite the first (§5.3 — merge them into one list instead).
    const volumeKeys = (body.match(/^\s{4}volumes\s*:/gm) ?? []).length;
    if (volumeKeys > 1) {
      problems.push(`${volumeKeys} × \`volumes:\` keys on one service — YAML keeps only the last one; merge [VOLUME] + [WP] into a single list`);
    }
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

// §2.8 — the two ways a healthcheck reports green while the app is down.
// Both were found on the pilot project, both are invisible in a build log.
check('healthcheck survives redirects and PHP hardening', () => {
  const spots = [
    ['Dockerfile', dockerfileActive],
    ...COMPOSE_FILES.filter((f) => has(f)).map((f) => [f, composeActive(f)]),
  ];
  const problems = [];
  for (const [name, body] of spots) {
    const line = body.split('\n').find((l) => /HEALTHCHECK|healthcheck|127\.0\.0\.1/.test(l) && /curl|file_get_contents|wget/.test(l))
      ?? body.split('\n').find((l) => /curl|file_get_contents|wget/.test(l) && /api\/health/.test(l));
    if (!line) continue;
    if (/file_get_contents/.test(line)) {
      problems.push(
        `${name}: healthcheck uses php file_get_contents — returns false whenever the project sets allow_url_fopen=Off (standard OWASP RFI hardening), so the container never reports healthy and nothing logs why (§2.8: use curl -fsS -L)`,
      );
      continue;
    }
    // curl -f scores a 3xx as success, and /api/health is redirected in
    // opposite directions per shape (Laravel strips the trailing slash, file
    // shapes add one) — without -L that is a green healthcheck over a 503.
    if (/\bcurl\b/.test(line) && !/-[a-zA-Z]*L\b|--location/.test(line) && !/api\/health\/["'\s]|api\/health\/$/.test(line)) {
      problems.push(
        `${name}: curl healthcheck has neither -L nor a trailing slash on /api/health/ — curl -f treats Apache's 301 as success, so it reports healthy even when the endpoint underneath returns 503 (§2.8)`,
      );
    }
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
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

check('[WP] wp-config.php disables core auto-update', () => {
  // §5.3: WordPress auto-updating its own core inside a container rewrites
  // files that the next deploy replaces — the site silently drifts from the
  // image. wp-config.php often lives on the host, not in the repo.
  if (!isWordPress) return { ok: true };
  if (!has('wp-config.php')) {
    return { ok: 'warn', msg: 'wp-config.php is not in the repo — confirm WP_AUTO_UPDATE_CORE is false in the copy on the host (§5.3)' };
  }
  return /define\s*\(\s*['"]WP_AUTO_UPDATE_CORE['"]\s*,\s*false\s*\)/.test(read('wp-config.php'))
    ? { ok: true }
    : { ok: false, msg: 'wp-config.php has no WP_AUTO_UPDATE_CORE = false — core updates itself inside the container and drifts from the image (§5.3)' };
});

// ── 8. PHP tooling ──────────────────────────────────────────────────────────
check('phpunit.xml emits junit.xml + clover.xml', () => {
  if (!has('phpunit.xml')) return { ok: false, msg: 'No phpunit.xml' };
  const body = read('phpunit.xml');
  const problems = [];
  if (!/<junit\s+outputFile\s*=\s*"test-results\/junit\.xml"\s*\/?>/.test(body)) {
    problems.push('No <junit outputFile="test-results/junit.xml"/> — Unit Tests stage cannot publish JUnit results');
  }
  // clover comes either from phpunit.xml itself or from the Jenkinsfile's
  // --coverage-clover flag (the asset uses the flag) — one of the two must be
  // there, or sonar reads no coverage at all and the gate blocks silently.
  if (!/clover/i.test(body) && !/--coverage-clover\s+clover\.xml/.test(jfActive)) {
    problems.push('nothing produces clover.xml (neither phpunit.xml nor `--coverage-clover clover.xml` in the Unit Tests stage) → new_coverage = 0% → gate blocks');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('phpunit.xml schema matches the PHPUnit version composer resolved', () => {
  // §5.4: PHPUnit 9 cannot read the <source> element of the schema-10 asset →
  // coverage is never configured, clover.xml comes out empty, new_coverage
  // reads 0% and the gate blocks with no error pointing at the cause.
  if (!has('phpunit.xml') || !has('composer.lock')) return { ok: true };
  const lock = JSON.parse(read('composer.lock'));
  const pkg = [...(lock.packages ?? []), ...(lock['packages-dev'] ?? [])].find((x) => x.name === 'phpunit/phpunit');
  if (!pkg) return { ok: false, msg: 'phpunit/phpunit is not in composer.lock — the Unit Tests stage has no vendor/bin/phpunit to run' };
  const major = Number.parseInt(String(pkg.version).replace(/^v/, ''), 10);
  const body = read('phpunit.xml');
  const schema10 = /<source\b/.test(body);
  if (Number.isNaN(major)) return { ok: true };
  if (major <= 9 && schema10) {
    return { ok: false, msg: `composer resolved phpunit ${pkg.version} but phpunit.xml uses the schema-10 <source> element — PHPUnit 9 ignores it, clover.xml comes out empty and the gate blocks (§5.4: bump PHPUnit, or convert phpunit.xml to <coverage><include>)` };
  }
  if (major >= 10 && !schema10 && /<coverage\b[\s\S]*?<include\b/.test(body)) {
    return { ok: false, msg: `composer resolved phpunit ${pkg.version} but phpunit.xml still uses the schema-9 <coverage><include> shape — PHPUnit 10 removed it (§5.4)` };
  }
  return { ok: true };
});

check('composer.json + composer.lock committed with the 3 dev tools in require-dev', () => {
  // §5.4 — no exceptions by shape: Install runs `composer install` and Code
  // Quality/Unit Tests call vendor/bin/* for all four shapes alike.
  if (!has('composer.json')) {
    return { ok: false, msg: 'No composer.json — the Install stage dies at `composer install` before anything else runs (§5.4)' };
  }
  const problems = [];
  if (!has('composer.lock')) problems.push('no composer.lock — CI and the image resolve different dependency trees');
  const json = JSON.parse(read('composer.json'));
  const dev = json['require-dev'] ?? {};
  const runtime = json.require ?? {};
  const TOOLS = ['friendsofphp/php-cs-fixer', 'phpstan/phpstan', 'phpunit/phpunit'];
  const missing = TOOLS.filter((t) => !dev[t] && !runtime[t]);
  if (missing.length) problems.push(`missing from require-dev: ${missing.join(', ')} — the pipeline calls vendor/bin for each of them`);
  const misplaced = TOOLS.filter((t) => runtime[t]);
  if (misplaced.length) problems.push(`in require (not require-dev): ${misplaced.join(', ')} — dev tooling would ship inside the production image`);
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('tests/ has SmokeTest.php pointing at an entry file that exists', () => {
  if (!has('tests')) return { ok: false, msg: 'No tests/ directory — phpunit has nothing to run' };
  const files = readdirSync(p('tests')).filter((f) => /Test\.php$/.test(f));
  if (!files.length) return { ok: false, msg: 'tests/ has no *Test.php files — phpunit collects 0 tests' };
  if (!has('tests/SmokeTest.php')) {
    return { ok: false, msg: 'No tests/SmokeTest.php — §5.1 copies it into every project (the __ENTRY_FILE__ existence check)' };
  }
  // The placeholder scan proves __ENTRY_FILE__ was replaced; this proves it was
  // replaced with a path that is really there (§7: WordPress must point at
  // api/health/index.php, never the index.php that is not in the repo).
  const m = read('tests/SmokeTest.php').match(/__DIR__\s*\.\s*['"]\/\.\.\/([^'"]+)['"]/);
  if (!m) return { ok: 'warn', msg: 'tests/SmokeTest.php no longer uses the __DIR__ . "/../<entry>" form — cannot verify the entry path automatically' };
  return has(m[1])
    ? { ok: true }
    : { ok: false, msg: `tests/SmokeTest.php asserts ${m[1]} exists, but it does not — the smoke test fails on the first run` };
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

check('.env / .env.dev exist locally with APP_PORT set', () => {
  // §5.5 — warn, not fail: both are gitignored on purpose, so a fresh clone
  // legitimately has neither. It still catches the machine that is about to
  // run `docker compose up` and silently get the template's default port.
  const problems = [];
  for (const f of ['.env', '.env.dev']) {
    if (!has(f)) problems.push(`${f} missing`);
    else if (!/^\s*APP_PORT\s*=\s*\S/m.test(read(f))) problems.push(`${f} has no APP_PORT value`);
  }
  return problems.length
    ? { ok: 'warn', msg: `${problems.join(' · ')} — compose falls back to the template's default port (§5.5)` }
    : { ok: true };
});

check('.claude/rules/ugt-php-ci.md in place', () => {
  return has('.claude/rules/ugt-php-ci.md')
    ? { ok: true }
    : { ok: false, msg: 'No .claude/rules/ugt-php-ci.md — §5.1 copies it; without it the next session has no CI contract to read' };
});

check('docs/admin-handoff.md rendered', () => {
  // Content (leftover __*__) is covered by the placeholder scan above; this is
  // the existence half of the same §7 line.
  return has('docs/admin-handoff.md')
    ? { ok: true }
    : { ok: 'warn', msg: 'docs/admin-handoff.md missing — §5.7 renders it; the admin gets a chat snippet instead of a file' };
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
    'Still needs admin confirmation: the Docker Pipeline plugin (docker-workflow — without it every stage dies at ' +
    'Install with "No such property: docker"; not the same as having the Docker CLI) · Jenkins tools ' +
    '(SonarQube-Scanner, Dependency-Check — no PHP/composer/NodeJS Global Tool needed, toolchain runs in docker ' +
    'per มติ M8) · Jenkins user in the docker group · the proxy-network docker network · ' +
    'credentials (nvd, env-<project>, env-<project>-dev) + global env (NOTIFY_EMAIL, SMTP_FROM) · SonarQube projects + Quality Gate · ' +
    'both webhooks · Lightweight checkout disabled · /srv/appdata writable\n'
);
process.exit(failed > 0 ? 1 : 0);
