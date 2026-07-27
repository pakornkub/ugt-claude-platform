#!/usr/bin/env node
// Runnable version of the ugt-nextjs-clean-code pre-commit checklist
//
//   node <path-to-skill>/scripts/verify.mjs          ← checks only changed files (matches what the gate measures)
//   node <path-to-skill>/scripts/verify.mjs --all    ← scans the whole project
//
// The Quality Gate measures **new code** only, so the default checks files
// changed vs HEAD (staged + unstaged + untracked) — scanning the whole project
// would produce a wall of violations in old code the gate doesn't count.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ALL = process.argv.includes('--all');
const isSource = (f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f);

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

/** Strip line comments before scanning (but keep lines so reported line numbers stay right) */
const stripComments = (line) => line.replace(/\/\/.*$/, '');

const RULES = [
  {
    id: 'S7773',
    name: 'parseInt / parseFloat must go through Number.',
    test: (l) => /(?<!Number\.)\bparse(Int|Float)\s*\(/.test(l),
    fix: 'Number.parseInt(v, 10) / Number.parseFloat(v)',
  },
  {
    id: 'S7781',
    name: '.replace() with a /g regex must be .replaceAll()',
    test: (l) => /\.replace\s*\(\s*\/[^/\n]+\/[a-z]*g/.test(l),
    fix: "str.replaceAll('x', 'y')",
  },
  {
    id: 'S7741/S7764',
    name: "typeof … 'undefined'",
    test: (l) => /typeof\s+[\w.]+\s*[!=]==?\s*['"]undefined['"]/.test(l),
    fix: "x === undefined · globalThis.window !== undefined (instead of typeof window !== 'undefined')",
  },
  {
    id: 'S7755',
    name: 'arr[arr.length - 1] must be arr.at(-1)',
    test: (l) => /(\w+)\s*\[\s*\1\s*\.length\s*-\s*1\s*\]/.test(l),
    fix: 'arr.at(-1)',
  },
  {
    id: 'S7718',
    name: 'catch (e) / catch (err) — must be error or error_',
    test: (l) => /catch\s*\(\s*(e|err)\s*\)/.test(l),
    fix: 'catch (error) or catch (error_)',
  },
  {
    id: 'NOSONAR',
    name: 'NOSONAR inside a JSX block comment (suppresses nothing)',
    test: (l) => /\{\s*\/\*[^*]*NOSONAR/.test(l),
    fix: 'move it to // NOSONAR on the same line as the flagged code',
    noStrip: true,
  },
  {
    id: 'NOSONAR',
    name: 'NOSONAR on its own line (must share the line with the code)',
    test: (l) => /^\s*\/\/\s*NOSONAR/.test(l),
    fix: 'append it to the end of the line SonarQube reports',
    noStrip: true,
  },
];

const findings = new Map();
const dupImports = [];
let readonlyWarn = 0;

for (const file of files) {
  const body = readFileSync(file, 'utf8');
  const lines = body.split('\n');
  const rel = relative(ROOT, file).split('\\').join('/');

  lines.forEach((raw, i) => {
    for (const rule of RULES) {
      const line = rule.noStrip ? raw : stripComments(raw);
      if (rule.test(line)) {
        const key = `${rule.id} — ${rule.name}`;
        if (!findings.has(key)) findings.set(key, { fix: rule.fix, hits: [] });
        findings.get(key).hits.push(`${rel}:${i + 1}`);
      }
    }
  });

  // S3863 — duplicate imports from the same module
  const modules = [...body.matchAll(/^\s*import\s[^'"]*from\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const seen = new Set();
  for (const m of modules) {
    if (seen.has(m)) dupImports.push(`${rel} (${m})`);
    seen.add(m);
  }

  // S6759 — component prop types should be wrapped in Readonly<> (heuristic → warn)
  if (file.endsWith('.tsx')) {
    const propTypes = [...body.matchAll(/\}\s*:\s*(?!Readonly<)([A-Z]\w*Props)\b/g)];
    readonlyWarn += propTypes.length;
  }
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`\nugt-nextjs-clean-code — verify\nScope: ${scope}\n`);

let failed = 0;
if (files.length === 0) {
  console.log('  (no .ts/.tsx files to check)\n');
} else {
  for (const [name, { fix, hits }] of findings) {
    failed++;
    console.log(`  ✘ ${name} — ${hits.length} hit(s)`);
    for (const h of hits.slice(0, 8)) console.log(`      ${h}`);
    if (hits.length > 8) console.log(`      … and ${hits.length - 8} more`);
    console.log(`      fix: ${fix}`);
  }
  if (dupImports.length) {
    failed++;
    console.log(`  ✘ S3863 — duplicate imports from one module (${dupImports.length} hit(s))`);
    for (const d of dupImports.slice(0, 8)) console.log(`      ${d}`);
    console.log('      fix: merge into a single import statement');
  }
  if (readonlyWarn) {
    console.log(`  ! S6759 — roughly ${readonlyWarn} prop type(s) not wrapped in Readonly<>`);
    console.log('      eyeball check: every function-component prop type must be Readonly<…>');
  }
  if (!failed) console.log('  ✔ no SonarQube-flagged idioms found in the checked scope');
}

console.log(
  `\n${failed} problem group(s)\n` +
    'Not machine-checkable here: duplication >= 10 lines (let the real scanner say) · cognitive complexity <= 15 ·\n' +
    'coverage of new code >= 60% · every suppression carries a rationale comment\n'
);
process.exit(failed > 0 ? 1 : 0);
