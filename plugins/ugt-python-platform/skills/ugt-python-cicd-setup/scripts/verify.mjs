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

// The header legend (top-of-file comment block) permanently documents every
// placeholder/tag as literal text ("[WEB]", "[DB]", "__APP_MODULE__", ...) —
// a plain substring/regex test for a tag like [WEB] or [DB] against the
// WHOLE file is therefore always true regardless of which shape the project
// actually is. Anchor at the real pipeline body and drop `//`-led comment
// lines before testing which tags are actually IN USE.
const PIPELINE_START = jf.indexOf('pipeline {');
const jfBody = PIPELINE_START >= 0 ? jf.slice(PIPELINE_START) : jf;
const jfActive = jfBody
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

// Shape is decided in three places at once (SKILL.md §5.3) and all three must
// agree — each is read from ACTIVE content only, never from the comment
// legends that document the other shape's alternative:
//   Dockerfile  web = EXPOSE + HEALTHCHECK · batch = neither (cut, not commented)
//   Jenkinsfile web = the health-poll loop (`State.Health.Status`) in Deploy ·
//                     batch = the two `[BATCH]` lines that replace it
//   compose     web = `ports:` + `healthcheck:` · batch = neither, service `job`
const dockerfile = has('Dockerfile') ? read('Dockerfile') : '';
const dockerfileActive = dockerfile
  .split('\n')
  .filter((l) => !l.trim().startsWith('#'))
  .join('\n');
const dockerShape = /EXPOSE|HEALTHCHECK/.test(dockerfileActive) ? 'web' : 'batch';
const jenkinsShape = jfActive.includes('State.Health.Status') ? 'web' : 'batch';
// Dockerfile is the authority (it decides whether the container can ever be
// polled at all); with no Dockerfile at all fall back to the Jenkinsfile.
const isWebShape = dockerfile ? dockerShape === 'web' : jenkinsShape === 'web';

// compose helpers — `volumes:`/`ports:` etc. ship commented-out in the
// template, so every structural test must ignore `#`-led lines.
const COMPOSE_FILES = ['docker-compose.yml', 'docker-compose.dev.yml'];
const composeActive = (f) =>
  has(f)
    ? read(f)
        .split('\n')
        .filter((l) => !l.trim().startsWith('#'))
        .join('\n')
    : '';

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
  // Only web shapes carry a health-poll block in the Deploy stage — batch
  // shape has no long-running process to poll (SKILL.md §2.8).
  if (!isWebShape) return { ok: true };
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
// tests/test_smoke.py carries its own __APP_MODULE__ placeholder (SKILL.md
// §5.2) and is copied into every project — scan it too, skipping silently if
// somehow absent (that absence is already caught by its own check below).
const PLACEHOLDER_FILES = [...CI_FILES, 'tests/test_smoke.py', 'docs/admin-handoff.md'];
check('No __*__ placeholders left', () => {
  const found = [];
  for (const f of PLACEHOLDER_FILES) {
    if (!has(f)) continue;
    const hits = [...new Set([...read(f).matchAll(/__[A-Z][A-Z0-9_]*__/g)].map((m) => m[0]))];
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

check('Every compose /srv/appdata bind has its mkdir -p in the Jenkinsfile', () => {
  // ขั้นที่ "ห้ามลืม" ของ §5.3: bind mount ที่ Deploy stage ไม่ได้ mkdir/chown
  // → docker สร้างเป็น root:root แล้วแอปเขียนไม่ได้ตั้งแต่ deploy แรก
  // composeActive, never read(f): the shipped compose keeps the whole
  // `[VOLUME]` block commented out with a literal `<name>` placeholder, so
  // scanning raw text reports a bind that does not exist.
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
  // jfActive, never jf — a stage that was commented out instead of fixed must
  // not count as present (same rule as every other Jenkinsfile check here).
  const names = [...jfActive.matchAll(/stage\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);
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
  if (!/waitForQualityGate/.test(jfActive)) return { ok: false, msg: 'No waitForQualityGate — the gate blocks nothing' };
  return /abortPipeline\s*:\s*true/.test(jfActive)
    ? { ok: true }
    : { ok: false, msg: 'waitForQualityGate without abortPipeline: true → gate goes red while the pipeline stays green' };
});

check('post block complete (emailext ×4 + cleanWs)', () => {
  if (!jf) return { ok: false, msg: 'No Jenkinsfile' };
  const problems = [];
  // §7 declares emailext ×4 — one per outcome. A pipeline missing `failure`
  // is the expensive one: it goes red and nobody is told.
  const missingOutcome = ['success', 'unstable', 'failure', 'aborted'].filter(
    (o) => !new RegExp(String.raw`\b${o}\s*\{[\s\S]{0,200}?emailext`).test(jfActive)
  );
  if (missingOutcome.length) problems.push(`post block has no emailext for: ${missingOutcome.join(', ')}`);
  if (!/cleanWs/.test(jfActive)) problems.push('no cleanWs (workspace grows every build)');
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
  // correct shell expansion, not Groovy interpolation leaking into the log.
  // jfActive: a ${SECRET} shown inside a `//` comment leaks nothing.
  const groovyInterpolated = jfActive.replace(/'''[\s\S]*?'''/g, '').replace(/'[^'\n]*'/g, '');
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
  // The "[DB]" tag itself only ever appears inside comment lines (both in
  // the header legend and as the label on the migrate block) — the real
  // functional signal that the Deploy stage performs a migration is the
  // active (non-comment) alembic/manage.py migrate command.
  const marked = /\[DB\]/.test(jfActive) || /alembic\s+upgrade|manage\.py\s+migrate/.test(jfActive);
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
for (const f of COMPOSE_FILES) {
  check(`${f} configured correctly`, () => {
    if (!has(f)) return { ok: false, msg: `No ${f}` };
    // active content only — the template's header comment names `healthcheck`
    // and `ports` while describing the OTHER shape, so raw text would demand
    // a healthcheck from a batch compose that correctly has none
    const body = composeActive(f);
    const problems = [];
    if (/healthcheck/i.test(body) && !body.includes('127.0.0.1')) {
      problems.push('healthcheck not using 127.0.0.1 (localhost on slim resolves IPv6 and fails)');
    }
    if (!/pull_policy\s*:\s*never/.test(body)) {
      problems.push('no pull_policy: never (compose will try to pull a locally-built image)');
    }
    // Batch shape has no `ports:` at all (SKILL.md §5.3 — cut ports/healthcheck/
    // networks entirely), so APP_PORT only applies to web shape.
    if (isWebShape && !/APP_PORT/.test(body)) problems.push('no APP_PORT override');
    // volumes must live under /srv/appdata (org contract — Persistent data)
    const vols = [...body.matchAll(/^\s*-\s*(\/[^:\s]+):/gm)].map((m) => m[1]);
    const stray = vols.filter((v) => !v.startsWith('/srv/appdata/'));
    if (stray.length) problems.push(`bind mount นอก /srv/appdata: ${stray.join(', ')}`);
    return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
  });
}

check('Dockerfile matches its shape (web = EXPOSE 8000 + HEALTHCHECK · batch = neither)', () => {
  if (!dockerfile) return { ok: false, msg: 'No Dockerfile' };
  const problems = [];
  if (dockerShape === 'web') {
    if (!/HEALTHCHECK/.test(dockerfileActive)) {
      problems.push('no HEALTHCHECK — the Deploy stage cannot poll for healthy');
    }
    if (!/^EXPOSE\s+8000\b/m.test(dockerfileActive)) {
      problems.push('no `EXPOSE 8000` — container-internal port is fixed at 8000 (compose/healthcheck both assume it)');
    }
  } else if (/EXPOSE|HEALTHCHECK/.test(dockerfile)) {
    // batch shape must CUT them, not comment them out (SKILL.md §5.3) — a
    // commented HEALTHCHECK is dead weight that reads as "still web shape"
    problems.push('batch shape still carries EXPOSE/HEALTHCHECK lines (commented out) — §5.3 says cut them');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Dockerfile CMD is a JSON array (exec form)', () => {
  if (!dockerfile) return { ok: false, msg: 'No Dockerfile' };
  const cmd = [...dockerfileActive.matchAll(/^CMD\s+(.*)$/gm)].map((m) => m[1].trim()).pop();
  if (!cmd) return { ok: false, msg: 'No CMD — the image has no entry point to run' };
  return cmd.startsWith('[')
    ? { ok: true }
    : {
        ok: false,
        msg: `CMD ${cmd} — must be a JSON array (exec form) per §5.2 __START_CMD_JSON__; shell form makes PID 1 a shell and swallows SIGTERM`,
      };
});

check('the server in Dockerfile CMD is listed in requirements.txt', () => {
  // §5.4 — the Dockerfile only pip-installs requirements.txt, so a CMD that
  // starts gunicorn/uvicorn while the package is missing produces
  // `exec: "gunicorn": not found` at RUNTIME: the image builds, the Docker
  // Build stage is green, and it only shows up as a container that never
  // reaches healthy. Most Flask/Django projects never had gunicorn as a
  // dependency because `flask run` / `runserver` is what they used locally.
  if (!isWebShape || !dockerfileActive) return { ok: true };
  const cmd = [...dockerfileActive.matchAll(/^CMD\s+(.*)$/gm)].map((m) => m[1].trim()).pop();
  if (!cmd) return { ok: true }; // covered by the CMD check above
  const server = ['gunicorn', 'uvicorn', 'hypercorn', 'waitress'].find((s) =>
    new RegExp(`["'\\s\\[]${s}\\b`).test(cmd)
  );
  if (!server) return { ok: true };
  if (!has('requirements.txt')) return { ok: true }; // covered by the check above
  // requirements lines look like `gunicorn==22.0.0` / `uvicorn[standard]>=0.30`
  const listed = read('requirements.txt')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .some((l) => new RegExp(`^${server}\\b`, 'i').test(l));
  return listed
    ? { ok: true }
    : {
        ok: false,
        msg: `Dockerfile CMD runs ${server} but requirements.txt does not list it — the image builds fine and then dies at runtime with 'exec: "${server}": not found', so the container never reports healthy (§5.4)`,
      };
});

check('[WEB]/[BATCH] shape agrees across Dockerfile / Jenkinsfile / compose', () => {
  if (!dockerfile) return { ok: false, msg: 'No Dockerfile' };
  const problems = [];
  if (jf && jenkinsShape !== dockerShape) {
    problems.push(
      jenkinsShape === 'web'
        ? 'Dockerfile is batch shape but the Deploy stage still runs the [WEB] health poll — docker inspect finds no container and the stage always fails'
        : 'Dockerfile is web shape but the Deploy stage has no [WEB] health poll — a broken container deploys green'
    );
  }
  for (const f of COMPOSE_FILES) {
    const body = composeActive(f);
    if (!body) continue;
    const composeShape = /^\s*ports\s*:/m.test(body) || /^\s*healthcheck\s*:/m.test(body) ? 'web' : 'batch';
    if (composeShape !== dockerShape) {
      problems.push(
        `${f} is ${composeShape} shape but the Dockerfile is ${dockerShape} shape (§5.3: batch cuts ports/healthcheck/networks)`
      );
    }
    if (dockerShape === 'batch' && !/restart\s*:\s*(["']no["']|no\b)/.test(body)) {
      problems.push(`${f}: batch shape needs restart: "no" — restart: unless-stopped re-runs the job forever`);
    }
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('[SUBPATH] root_path/SCRIPT_NAME/FORCE_SCRIPT_NAME set in both compose files or neither', () => {
  // §5.3: the subpath answer must become real config in BOTH compose files.
  // Setting it in prod only (the common slip) leaves dev 404-ing behind the
  // proxy with nothing to point at. Projects not behind a subpath set none —
  // that is a pass, so this never fires on a plain deployment.
  const SUBPATH_VARS = /\b(ROOT_PATH|SCRIPT_NAME|FORCE_SCRIPT_NAME)\b/;
  const present = COMPOSE_FILES.filter((f) => has(f)).filter((f) => SUBPATH_VARS.test(composeActive(f)));
  if (present.length === 0 || present.length === COMPOSE_FILES.filter((f) => has(f)).length) return { ok: true };
  return {
    ok: false,
    msg: `subpath env var set only in ${present.join(', ')} — the other environment will 404 behind the reverse proxy (§5.3)`,
  };
});

// ── 7. Python tooling ───────────────────────────────────────────────────────
check('pyproject.toml has [tool.ruff] and [tool.pytest.ini_options] wired for CI', () => {
  if (!pyproject) return { ok: false, msg: 'No pyproject.toml — run ugt-python-cicd-setup first' };
  const problems = [];
  if (!/\[tool\.ruff\]/.test(pyproject)) problems.push('no [tool.ruff] section');
  const pytestSection = pyproject.match(/\[tool\.pytest\.ini_options\]([\s\S]*?)(\n\[|$)/);
  if (!pytestSection) {
    problems.push('no [tool.pytest.ini_options] section');
  } else {
    if (!/test-results\/junit\.xml/.test(pytestSection[1])) {
      problems.push('[tool.pytest.ini_options] does not point at test-results/junit.xml — Unit Tests stage cannot publish JUnit results');
    }
    // §5.3: pytest must emit coverage.xml too — sonar.python.coverage.reportPaths
    // reads it, and without it new_coverage is 0% and the gate blocks with no
    // error saying why.
    if (!/--cov-report[= ]xml/.test(pytestSection[1])) {
      problems.push('[tool.pytest.ini_options] has no --cov-report=xml → no coverage.xml → new_coverage = 0% → gate blocks silently');
    }
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('tests/ has test_smoke.py plus at least one test_*.py file', () => {
  if (!has('tests')) return { ok: false, msg: 'No tests/ directory — pytest has nothing to run' };
  const files = readdirSync(p('tests')).filter((f) => /^test_.*\.py$/.test(f));
  if (!files.length) return { ok: false, msg: 'tests/ has no test_*.py files — pytest collects 0 tests' };
  // §5.1 copies tests/test_smoke.py into EVERY project — its absence means the
  // copy step was skipped, so the placeholder scan above had nothing to check.
  return has('tests/test_smoke.py')
    ? { ok: true }
    : { ok: false, msg: 'No tests/test_smoke.py — §5.1 copies it into every project (the __APP_MODULE__ import check)' };
});

check('.claude/rules/ugt-python-ci.md in place', () => {
  return has('.claude/rules/ugt-python-ci.md')
    ? { ok: true }
    : { ok: false, msg: 'No .claude/rules/ugt-python-ci.md — §5.1 copies it; without it the next session has no CI contract to read' };
});

check('docs/admin-handoff.md rendered', () => {
  // Content (leftover __*__) is covered by the placeholder scan above; this is
  // the existence half of the same §7 line.
  return has('docs/admin-handoff.md')
    ? { ok: true }
    : { ok: 'warn', msg: 'docs/admin-handoff.md missing — §5.7 renders it; the admin gets a chat snippet instead of a file' };
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

check('.env / .env.dev exist locally with APP_PORT set', () => {
  // §5.5 — warn, not fail: both files are gitignored on purpose, so a fresh
  // clone legitimately has neither. It still catches the machine that is
  // about to run `docker compose up` and get the template default port.
  const problems = [];
  for (const f of ['.env', '.env.dev']) {
    if (!has(f)) problems.push(`${f} missing`);
    else if (!/^\s*APP_PORT\s*=\s*\S/m.test(read(f))) problems.push(`${f} has no APP_PORT value`);
  }
  return problems.length
    ? { ok: 'warn', msg: `${problems.join(' · ')} — compose falls back to the template's default port (§5.5)` }
    : { ok: true };
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

check('.dockerignore blocks real .env from the build context', () => {
  if (!has('.dockerignore')) return { ok: false, msg: 'No .dockerignore — a real .env left in the workspace could get COPYed into an image layer permanently' };
  const lines = read('.dockerignore').split('\n').map((l) => l.trim());
  const blocksEnv = lines.some((l) => l === '.env') || lines.some((l) => /^\.env\.?\*$/.test(l));
  return blocksEnv
    ? { ok: true }
    : { ok: false, msg: 'Missing .env / .env.* in .dockerignore — COPY . . can bake real secrets into an image layer (Docker layers are append-only, deleting the file later does not remove it from history)' };
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
    'Still needs admin confirmation: the Docker Pipeline plugin (docker-workflow — without it every stage dies at ' +
    'Install with "No such property: docker"; not the same as having the Docker CLI) · Jenkins tools ' +
    '(SonarQube-Scanner, Dependency-Check) · Jenkins user in the docker group · the proxy-network docker network · ' +
    'credentials (nvd, env-<project>, env-<project>-dev) + global env (NOTIFY_EMAIL, SMTP_FROM) · SonarQube projects + Quality Gate · ' +
    'both webhooks · Lightweight checkout disabled · /srv/appdata writable\n'
);
process.exit(failed > 0 ? 1 : 0);
