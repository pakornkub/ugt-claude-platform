#!/usr/bin/env node
// Preview drift check — docs/design-preview.html shows people what they get
// BEFORE they install, so a stale preview is a promise the plugin doesn't keep.
//
//   node scripts/check-preview-tokens.mjs
//
// It compares the colour tokens the preview renders with against the real
// token file the skill installs. Structure (does the preview still show the
// real header affordances / pagination cluster / dialog rules?) is a HUMAN
// step in the release checklist — prose and markup can't be diffed usefully.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(
  ROOT,
  'plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/globals.tokens.css'
);
const PREVIEW = join(ROOT, 'docs/design-preview.html');

// The preview is plain CSS, so it renames a few vars that would clash with the
// page chrome. Left = name in globals.tokens.css, right = name in the preview.
const ALIAS = {
  accent: 'accent-c',
  border: 'border-c',
  input: 'input-c',
  'status-amber-foreground': 'status-amber-fg',
  'status-emerald-foreground': 'status-emerald-fg',
  'status-red-foreground': 'status-red-fg',
  'status-coral-foreground': 'status-coral-fg',
  'status-sky-foreground': 'status-sky-fg',
  'status-gray-foreground': 'status-gray-fg',
};
// Placeholder defaults documented at the top of globals.tokens.css — the
// preview renders the org default, so substitute the same values.
const PLACEHOLDER = {
  __PRIMARY__: 'oklch(0.488 0.243 264.4)',
  __PRIMARY_DARK__: 'oklch(0.55 0.21 264.4)',
};
// Tokens the preview MUST carry — dropping one silently makes the preview lie.
const REQUIRED = [
  'primary', 'background', 'foreground', 'card', 'muted', 'muted-foreground', 'destructive',
  'status-amber', 'status-emerald', 'status-red', 'status-coral', 'status-sky', 'status-gray',
];

for (const [label, path] of [['globals.tokens.css', SRC], ['design-preview.html', PREVIEW]]) {
  if (!existsSync(path)) {
    console.log(`✘ missing ${label} at ${path}`);
    process.exit(1);
  }
}

const norm = (v) => v.trim().replace(/\s+/g, ' ').replace(/;$/, '');
const sub = (v) => Object.entries(PLACEHOLDER).reduce((acc, [k, real]) => acc.replaceAll(k, real), v);

/** Pull `--name: value;` pairs out of one CSS block */
function vars(text, blockRe) {
  const block = text.match(blockRe)?.[1] ?? '';
  const out = new Map();
  for (const m of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], norm(m[2]));
  return out;
}

const src = readFileSync(SRC, 'utf8');
const prev = readFileSync(PREVIEW, 'utf8');

const MODES = [
  { name: 'light', src: vars(src, /:root\s*\{([\s\S]*?)\n\}/), prev: vars(prev, /\.ui\s*\{([\s\S]*?)\n\s*\}/) },
  { name: 'dark', src: vars(src, /\.dark\s*\{([\s\S]*?)\n\}/), prev: vars(prev, /\.ui\.dark\s*\{([\s\S]*?)\n\s*\}/) },
];

let failed = 0;
for (const mode of MODES) {
  const problems = [];
  if (mode.prev.size === 0) problems.push('no token block found in the preview — did the .ui / .ui.dark selector change?');

  for (const [name, rawValue] of mode.src) {
    const previewName = ALIAS[name] ?? name;
    const want = sub(rawValue);
    const got = mode.prev.get(previewName);
    if (got === undefined) {
      if (REQUIRED.includes(name)) problems.push(`--${name}: required but absent from the preview`);
      continue; // the preview deliberately renders a subset
    }
    if (got !== want) problems.push(`--${name}: preview has "${got}", token file says "${want}"`);
  }

  if (problems.length) {
    failed += problems.length;
    console.log(`✘ ${mode.name}`);
    for (const p of problems) console.log(`    ${p}`);
  } else {
    console.log(`✔ ${mode.name} — ${mode.prev.size} token(s) in the preview agree with the installed set`);
  }
}

if (failed > 0) {
  console.log(`\n${failed} mismatch(es). Update docs/design-preview.html to the current tokens.`);
  process.exit(1);
}
console.log('\nPreview tokens match the installed token set.');
