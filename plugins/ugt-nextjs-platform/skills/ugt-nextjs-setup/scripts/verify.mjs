#!/usr/bin/env node
// Runnable check for the harness layer that ugt-nextjs-setup installs (CLAUDE.md / rules / state / settings)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
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

// ── CLAUDE.md ──────────────────────────────────────────────────────────────
const claudeMd = has('CLAUDE.md') ? read('CLAUDE.md') : has('.claude/CLAUDE.md') ? read('.claude/CLAUDE.md') : null;

check('CLAUDE.md carries the ugt block', () => {
  if (claudeMd === null) return { ok: false, msg: 'No CLAUDE.md — knowledge dies with every session' };
  const start = claudeMd.includes('<!-- ugt:start');
  const end = claudeMd.includes('<!-- ugt:end');
  if (!start || !end) {
    return { ok: false, msg: 'ugt:start/ugt:end markers missing or unpaired — /plugin update cannot maintain the block' };
  }
  return { ok: true };
});

check('CLAUDE.md within 200 lines', () => {
  if (claudeMd === null) return { ok: false, msg: 'No CLAUDE.md' };
  const lines = claudeMd.split('\n').length;
  if (lines > 200) {
    return { ok: false, msg: `${lines} lines — over the 200-line target hurts adherence; move path-bound rules to .claude/rules/` };
  }
  return lines > 160 ? { ok: 'warn', msg: `${lines} lines — approaching the 200 cap` } : { ok: true };
});

check('CLAUDE.md imports team state', () => {
  if (claudeMd === null) return { ok: false, msg: 'No CLAUDE.md' };
  return /@\.claude\/state\/checkpoint\.md/.test(claudeMd)
    ? { ok: true }
    : { ok: false, msg: 'No `@.claude/state/checkpoint.md` import — next session will not see team state' };
});

check('No <...> placeholders left in CLAUDE.md', () => {
  if (claudeMd === null) return { ok: false, msg: 'No CLAUDE.md' };
  const hits = [...new Set([...claudeMd.matchAll(/<(project-name|base-path-prod|base-path-dev|org)>/g)].map((m) => m[0]))];
  return hits.length ? { ok: false, msg: `Unsubstituted: ${hits.join(', ')}` } : { ok: true };
});

// ── .claude/rules ──────────────────────────────────────────────────────────
check('Existing rules declare paths frontmatter', () => {
  if (!has('.claude/rules')) return { ok: 'warn', msg: 'No .claude/rules/ (no module installed yet?)' };
  const files = readdirSync(p('.claude/rules')).filter((f) => f.endsWith('.md'));
  if (!files.length) return { ok: 'warn', msg: '.claude/rules/ is empty' };
  const bad = [];
  for (const f of files) {
    const body = read('.claude/rules', f);
    if (!body.startsWith('---')) {
      bad.push(`${f} (no frontmatter → loads every session instead of per-path)`);
      continue;
    }
    const fm = body.slice(3, body.indexOf('---', 3));
    if (!/paths\s*:/.test(fm)) bad.push(`${f} (frontmatter has no paths)`);
  }
  return bad.length ? { ok: false, msg: bad.join(' · ') } : { ok: true, msg: `${files.length} file(s) found` };
});

check('Rules exist for every installed module', () => {
  const pkg = has('package.json') ? JSON.parse(read('package.json')) : null;
  if (!pkg) return { ok: false, msg: 'No package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const expected = [];
  if (deps.prisma || deps['@prisma/client']) expected.push('ugt-nextjs-database.md');
  if (deps['better-auth']) expected.push('ugt-nextjs-auth.md');
  if (has('Jenkinsfile')) expected.push('ugt-nextjs-ci.md');
  const missing = expected.filter((f) => !has('.claude/rules', f));
  return missing.length
    ? { ok: false, msg: `Module installed but rules missing: ${missing.join(', ')} — its rules will never load while editing` }
    : { ok: true };
});

// ── .claude/state ──────────────────────────────────────────────────────────
check('Both team-state files exist', () => {
  const missing = ['checkpoint.md', 'project-notes.md'].filter((f) => !has('.claude/state', f));
  return missing.length
    ? { ok: false, msg: `Missing .claude/state/${missing.join(', ')}` }
    : { ok: true };
});

check('checkpoint.md has all sections and was actually updated', () => {
  if (!has('.claude/state/checkpoint.md')) return { ok: false, msg: 'No checkpoint.md' };
  const body = read('.claude/state/checkpoint.md');
  const needed = ['## In progress', '## Done', '## Next', '## Decisions'];
  const missing = needed.filter((h) => !body.includes(h));
  if (missing.length) return { ok: false, msg: `Missing sections: ${missing.join(', ')}` };
  return /<YYYY-MM-DD>/.test(body)
    ? { ok: false, msg: 'Still contains <YYYY-MM-DD> — the file has never been really updated' }
    : { ok: true };
});

check('mode.md declares a valid model mode', () => {
  if (!has('.claude/state/mode.md')) {
    return { ok: 'warn', msg: 'No .claude/state/mode.md — subagent dispatches inherit the session model; run /ugt-mode default to create it' };
  }
  return /Current mode:\s*\*\*(easy|default|god|auto)\*\*/.test(read('.claude/state/mode.md'))
    ? { ok: true }
    : { ok: false, msg: 'mode.md has no `Current mode: **easy|default|god|auto**` line — rewrite it with /ugt-mode' };
});

check('project-notes.md has the 3 fixed sections', () => {
  if (!has('.claude/state/project-notes.md')) return { ok: false, msg: 'No project-notes.md' };
  const body = read('.claude/state/project-notes.md');
  const needed = ['## Error Patterns', '## Deviations', '## Open Questions'];
  const missing = needed.filter((h) => !body.includes(h));
  return missing.length ? { ok: false, msg: `Missing sections: ${missing.join(', ')}` } : { ok: true };
});

check('No secrets leaked into state files', () => {
  const suspicious = /(password|secret|client_secret|api[_-]?key|bearer)\s*[=:]\s*\S{8,}/i;
  const bad = [];
  for (const f of ['checkpoint.md', 'project-notes.md']) {
    if (!has('.claude/state', f)) continue;
    if (suspicious.test(read('.claude/state', f))) bad.push(f);
  }
  return bad.length
    ? { ok: false, msg: `${bad.join(', ')} may contain a secret — these files are committed` }
    : { ok: true };
});

// ── settings / gitignore ───────────────────────────────────────────────────
check('.claude/settings.json declares marketplace + plugin', () => {
  if (!has('.claude/settings.json')) {
    return { ok: false, msg: 'No .claude/settings.json — people cloning the repo will not be prompted to install the plugin' };
  }
  let s;
  try {
    s = JSON.parse(read('.claude/settings.json'));
  } catch (error) {
    return { ok: false, msg: `Broken JSON: ${error.message}` };
  }
  const problems = [];
  if (!s.extraKnownMarketplaces) problems.push('no extraKnownMarketplaces');
  if (!s.enabledPlugins) problems.push('no enabledPlugins');
  const raw = JSON.stringify(s);
  if (raw.includes('<org>')) problems.push('<org> not replaced with the real GitHub org');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('.gitignore: logs ignored, state committed', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'No .gitignore' };
  const ig = read('.gitignore');
  const problems = [];
  if (!/\.claude\/logs/.test(ig)) problems.push('.claude/logs/ not ignored (audit logs would be committed)');
  if (/^\.claude\/?\s*$/m.test(ig)) {
    problems.push('.claude/ ignored wholesale → team state and rules will never be committed');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── report ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-setup — verify (harness layer)\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    "Also run each installed module's own verify.mjs (database / quality / auth / cicd)\n"
);
process.exit(failed > 0 ? 1 : 0);
