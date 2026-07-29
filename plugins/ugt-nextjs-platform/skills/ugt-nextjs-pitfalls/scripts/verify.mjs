#!/usr/bin/env node
// Runnable greppable subset of the ugt-nextjs-pitfalls rules
//
//   node <path-to-skill>/scripts/verify.mjs          ← checks only files changed vs HEAD
//   node <path-to-skill>/scripts/verify.mjs --all    ← scans the whole project
//
// Errors exit 1; warnings (anchor-dependent patterns that need a human eye)
// never fail the run. Everything not greppable stays in the references.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ALL = process.argv.includes('--all');
const isSource = (f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f);
const isAppSource = (rel) => /^(app|components|lib)\//.test(rel);

function walkAll() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', 'generated', '.claude']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (isSource(entry)) out.push(full);
    }
  };
  walk(ROOT);
  return out;
}

function changedFiles() {
  try {
    const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    const tracked = git('diff', '--name-only', 'HEAD').split('\n');
    const untracked = git('ls-files', '--others', '--exclude-standard').split('\n');
    return [...new Set([...tracked, ...untracked])]
      .map((f) => f.trim())
      .filter((f) => f && isSource(f))
      .map((f) => join(ROOT, f))
      .filter((f) => existsSync(f));
  } catch {
    return null;
  }
}

let files;
let scope;
if (ALL) {
  files = walkAll();
  scope = `whole project (${files.length} files)`;
} else {
  const changed = changedFiles();
  if (changed === null) {
    files = walkAll();
    scope = `whole project (${files.length} files) — not a git repo, cannot diff against HEAD`;
  } else {
    files = changed;
    scope = `files changed vs HEAD (${files.length} files) — use --all to scan the whole project`;
  }
}

const stripComments = (line) => line.replace(/\/\/.*$/, '');

// Line-level rules. severity: 'error' | 'warn'
const RULES = [
  {
    id: 'BASEPATH',
    severity: 'error',
    name: "bare fetch('/api/…') — 404s in every deployed env (basePath)",
    test: (l) => /fetch\s*\(\s*[`'"]\/api\//.test(l),
    fix: 'fetch(`${env.NEXT_PUBLIC_BASE_PATH}/api/...`) — import { env } from "@/lib/env"',
  },
  {
    id: 'SELECT-EMPTY',
    severity: 'error',
    name: '<SelectItem value=""> — Radix throws at runtime',
    test: (l) => /<SelectItem\b[^>]*value=(""|''|\{\s*(''|"")\s*\})/.test(l),
    fix: 'use the "__none__" sentinel and map it back to undefined in onValueChange',
  },
  {
    id: 'BE-YEAR',
    severity: 'error',
    name: 'inline ±543 Buddhist-era math — allowed only inside the central displayYear/inputToCEYear helper',
    test: (l) => /[+-]\s*543\b/.test(l),
    fix: 'store CE, convert at the UI edge via displayYear()/inputToCEYear() (BE_OFFSET defined once)',
    exempt: (rel) => /format-date|utils/.test(rel),
  },
  {
    id: 'DATE-ANCHOR',
    severity: 'warn',
    name: '.toISOString().slice(0, 10) — correct ONLY for UTC-anchored Dates (SQL DATE); shifts −1 day on local-midnight Dates',
    test: (l) => /\.toISOString\(\)\.slice\(\s*0\s*,\s*10\s*\)/.test(l),
    fix: 'local-parsed Date → toLocalYmd() (local getters); SQL-DATE-sourced Date → this is fine',
  },
  {
    id: 'DATE-BIND',
    severity: 'warn',
    name: 'startOfDay(...) near $queryRaw/EXEC — a Date param binds as UTC and reads the previous day on UTC+7',
    test: (l) => /\$(queryRaw|executeRaw)[^`]*`[^`]*\$\{\s*startOfDay\(/.test(l) || /EXEC\s+\w+[^`]*\$\{\s*startOfDay\(/.test(l),
    fix: 'bind toLocalYmd(date) — a YYYY-MM-DD string, never a Date object',
  },
];

const findings = new Map();
const swallowCatches = [];
const missingGetRowId = [];

for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/');
  if (ALL && !isAppSource(rel)) continue; // paths scope of the skill
  const body = readFileSync(file, 'utf8');
  const lines = body.split('\n');

  lines.forEach((raw, i) => {
    const line = stripComments(raw);
    for (const rule of RULES) {
      if (rule.exempt?.(rel)) continue;
      if (rule.test(line)) {
        const key = `${rule.id} — ${rule.name}`;
        if (!findings.has(key)) findings.set(key, { severity: rule.severity, fix: rule.fix, hits: [] });
        findings.get(key).hits.push(`${rel}:${i + 1}`);
      }
    }
  });

  // catch that swallows into an empty/default result (multi-line, error)
  for (const m of body.matchAll(/catch\s*(\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*)?return\s+(\[\]|null|undefined|\{\}|'')\s*;?\s*\}/g)) {
    const lineNo = body.slice(0, m.index).split('\n').length;
    swallowCatches.push(`${rel}:${lineNo}`);
  }

  // selectable DataTable without getRowId (multi-line, warn)
  for (const m of body.matchAll(/<DataTable\b[\s\S]{0,800}?\/?>/g)) {
    if (/onSelectionChange/.test(m[0]) && !/getRowId/.test(m[0])) {
      const lineNo = body.slice(0, m.index).split('\n').length;
      missingGetRowId.push(`${rel}:${lineNo}`);
    }
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`\nugt-nextjs-pitfalls — verify\nScope: ${scope}\n`);

let errors = 0;
let warns = 0;
const report = (label, severity, hits, fix) => {
  if (!hits.length) return;
  if (severity === 'error') errors++;
  else warns++;
  console.log(`  ${severity === 'error' ? '✘' : '!'} ${label} — ${hits.length} hit(s)`);
  for (const h of hits.slice(0, 8)) console.log(`      ${h}`);
  if (hits.length > 8) console.log(`      … and ${hits.length - 8} more`);
  console.log(`      fix: ${fix}`);
};

if (files.length === 0) {
  console.log('  (no .ts/.tsx files to check)\n');
} else {
  for (const [name, { severity, fix, hits }] of findings) report(name, severity, hits, fix);
  report(
    'SWALLOW — catch {} returning an empty/default value masks DB/schema errors as "no data"',
    'error',
    swallowCatches,
    'log and rethrow; let the route/caller decide the HTTP status',
  );
  report(
    'GETROWID — selectable <DataTable> without getRowId (selection rides on row index)',
    'warn',
    missingGetRowId,
    'pass getRowId={(row) => row.id} so selection survives data swaps',
  );
  if (!errors && !warns) console.log('  ✔ no greppable pitfalls found in the checked scope');
}

console.log(
  `\n${errors} error group(s), ${warns} warning group(s)\n` +
    'Not machine-checkable here: Date params bound into $queryRaw (assert bound params in tests) ·\n' +
    'React Query invalidation after mutations · dataset filters re-fetching server-side ·\n' +
    'useMemo on data props · fail-closed gates · scope overrides — see the references.\n',
);
process.exit(errors > 0 ? 1 : 0);
