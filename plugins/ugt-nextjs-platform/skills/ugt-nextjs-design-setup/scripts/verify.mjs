#!/usr/bin/env node
// Runnable check for what ugt-nextjs-design-setup installs
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
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

// ── DESIGN.md ──────────────────────────────────────────────────────────────
check('docs/DESIGN.md exists with no leftover placeholders', () => {
  if (!has('docs', 'DESIGN.md')) return { ok: false, msg: 'No docs/DESIGN.md — the agreement was never written' };
  const md = read('docs', 'DESIGN.md');
  const left = md.match(/\{\{[A-Z_]+\}\}/g);
  if (left) return { ok: false, msg: `Unsubstituted: ${[...new Set(left)].join(' ')}` };
  if (!/ugt-core/.test(md)) return { ok: false, msg: 'Header does not record the ugt-core contract version (sync mode needs it)' };
  if (!/##\s*10\.\s*มติ/.test(md)) return { ok: false, msg: 'No มติ (decision log) section' };
  return { ok: true };
});

check('docs/design-questions.md exists', () =>
  has('docs', 'design-questions.md') ? { ok: true } : { ok: false, msg: 'Pending-questions doc missing' }
);

// ── shadcn config ──────────────────────────────────────────────────────────
check("components.json style is 'radix-mira' + lucide", () => {
  if (!has('components.json')) return { ok: false, msg: 'No components.json — shadcn not initialized' };
  const cj = JSON.parse(read('components.json'));
  const problems = [];
  if (cj.style !== 'radix-mira') problems.push(`style is '${cj.style}' (org standard: radix-mira)`);
  if (cj.iconLibrary && cj.iconLibrary !== 'lucide') problems.push(`iconLibrary is '${cj.iconLibrary}'`);
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── tokens ────────────────────────────────────────────────────────────────
check('globals.css carries the org token set', () => {
  if (!has('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  const css = read('app', 'globals.css');
  const problems = [];
  if (/\{\{PRIMARY(_DARK)?\}\}/.test(css)) problems.push('{{PRIMARY}} placeholder not substituted');
  for (const t of ['amber', 'emerald', 'red', 'coral', 'sky', 'gray']) {
    if (!css.includes(`--status-${t}:`)) problems.push(`--status-${t} missing`);
  }
  if (!/--font-sans:.*noto/i.test(css)) problems.push('--font-sans does not include the Thai font variable');
  if (!css.includes('.dark')) problems.push('no .dark token block (tokens must exist even without a toggle)');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('layout.tsx wires Inter + Noto Sans Thai via next/font', () => {
  if (!has('app', 'layout.tsx')) return { ok: false, msg: 'No app/layout.tsx' };
  const l = read('app', 'layout.tsx');
  const problems = [];
  if (!/Noto_Sans_Thai/.test(l)) problems.push('Noto_Sans_Thai not imported');
  if (!/Inter/.test(l)) problems.push('Inter not imported');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── kit ───────────────────────────────────────────────────────────────────
for (const f of ['status-badge', 'icon-action', 'confirm-action-dialog', 'form-dialog', 'data-table', 'date-picker', 'empty']) {
  check(`components/ui/${f}.tsx installed`, () =>
    has('components', 'ui', `${f}.tsx`) ? { ok: true } : { ok: false, msg: 'Kit file missing' }
  );
}

check('lib/format.ts installed (the only formatter)', () =>
  has('lib', 'format.ts') ? { ok: true } : { ok: false, msg: 'Central formatter missing' }
);

// ── harness ───────────────────────────────────────────────────────────────
check('.claude/rules/ugt-nextjs-design.md installed', () => {
  if (!has('.claude', 'rules', 'ugt-nextjs-design.md')) {
    return { ok: false, msg: 'Harness rule missing — the agreement dies with this session' };
  }
  const r = read('.claude', 'rules', 'ugt-nextjs-design.md');
  return /paths:/.test(r) ? { ok: true } : { ok: false, msg: 'Rule file has no paths frontmatter — it will never load' };
});

// ── report ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-design-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Also run scripts/check-contrast.mjs after any color change\n'
);
process.exit(failed > 0 ? 1 : 0);
