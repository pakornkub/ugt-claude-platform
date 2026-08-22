#!/usr/bin/env node
// Report which kit files copied into THIS project (cwd) are behind the
// installed plugin's assets — and, for each, whether the project ever edited
// its copy. Report only: this script never writes a file.
//
//   node <skill-dir>/scripts/check-kit-freshness.mjs           # human table
//   node <skill-dir>/scripts/check-kit-freshness.mjs --json    # for the skill flow
//
// Classification per stamped project file:
//   CURRENT   — content equals the plugin's current asset → nothing to do
//   UPDATE    — outdated AND still byte-identical to what was installed
//               (hash matches its own stamp) → safe to overwrite
//   MERGE     — outdated AND the project changed it (or install-time
//               placeholder substitution changed it — indistinguishable, and
//               both deserve the careful path) → merge, never overwrite
//   REMOVED   — the stamp points at an asset the plugin no longer ships
//               (renamed/retired — see the CHANGELOG between the two versions)

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = process.cwd();
const JSON_MODE = process.argv.includes('--json');

const STAMP_RE = /^\/\/ kit(?:-hash)?: .*\n?/gm;

function contentHash(text) {
  const body = text.replace(/\r\n/g, '\n').replace(STAMP_RE, '');
  return createHash('sha256').update(body).digest('hex').slice(0, 12);
}

function parseStamp(text) {
  const head = text.split('\n', 6).join('\n');
  const kit = /^\/\/ kit: (\S+) (\S+) · (\S+)$/m.exec(head);
  const hash = /^\/\/ kit-hash: ([0-9a-f]{12})$/m.exec(head);
  if (!kit || !hash) return null;
  return { plugin: kit[1], version: kit[2], key: kit[3], installedHash: hash[1] };
}

function* walk(dir, skip) {
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full, skip);
    else yield full;
  }
}

// ── locate the plugin this script ships in ─────────────────────────────────
let pluginRoot = dirname(fileURLToPath(import.meta.url));
while (!existsSync(join(pluginRoot, '.claude-plugin', 'plugin.json'))) {
  const parent = dirname(pluginRoot);
  if (parent === pluginRoot) {
    console.error('✘ cannot locate plugin root above this script');
    process.exit(2);
  }
  pluginRoot = parent;
}
const manifest = JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8'));

// ── index the plugin's current assets by stamp key ──────────────────────────
const assets = new Map();
const skillsDir = join(pluginRoot, 'skills');
for (const skill of readdirSync(skillsDir)) {
  const assetsDir = join(skillsDir, skill, 'assets');
  if (!existsSync(assetsDir)) continue;
  for (const file of walk(assetsDir, new Set())) {
    if (!/\.tsx?$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const key = `${skill}/${relative(assetsDir, file).split(sep).join('/')}`;
    assets.set(key, { hash: contentHash(text), path: file, skill });
  }
}

// ── scan the project for stamped copies ─────────────────────────────────────
const SKIP = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', 'dist', '.claude']);
const rows = [];
// ไฟล์ kit ที่ติดตั้งไว้ที่ root โปรเจคโดยตรง — เดินเฉพาะ dir จะมองไม่เห็นตลอดกาล
// (proxy.ts ของ auth · vitest.config.ts ของ test-lint · prisma.config.ts ของ database)
const ROOT_FILES = ['proxy.ts', 'middleware.ts', 'vitest.config.ts', 'prisma.config.ts']
  .map((f) => join(PROJECT, f))
  .filter((f) => existsSync(f));
const scanTargets = [ROOT_FILES];
for (const dir of ['app', 'components', 'lib', 'features', 'scripts', 'src', 'prisma']) {
  const abs = join(PROJECT, dir);
  if (!existsSync(abs)) continue;
  scanTargets.push(walk(abs, SKIP));
}
for (const target of scanTargets) {
  for (const file of target) {
    if (!/\.tsx?$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    const stamp = parseStamp(text);
    if (!stamp || stamp.plugin !== manifest.name) continue;

    const rel = relative(PROJECT, file).split(sep).join('/');
    const projectHash = contentHash(text);
    const asset = assets.get(stamp.key);

    let state;
    if (!asset) state = 'REMOVED';
    else if (projectHash === asset.hash) state = 'CURRENT';
    else if (projectHash === stamp.installedHash) state = 'UPDATE';
    else state = 'MERGE';

    rows.push({
      file: rel,
      key: stamp.key,
      skill: asset?.skill ?? stamp.key.split('/')[0],
      installedVersion: stamp.version,
      pluginVersion: manifest.version,
      state,
      assetPath: asset ? relative(pluginRoot, asset.path).split(sep).join('/') : null,
    });
  }
}

rows.sort((a, b) => a.state.localeCompare(b.state) || a.file.localeCompare(b.file));

if (JSON_MODE) {
  console.log(JSON.stringify({ plugin: manifest.name, pluginVersion: manifest.version, files: rows }, null, 2));
  process.exit(0);
}

if (rows.length === 0) {
  console.log(`no ${manifest.name} kit stamps found under ${PROJECT}`);
  console.log('(files installed before 4.13.0 carry no stamp — one manual sync adds them)');
  process.exit(0);
}

const label = {
  CURRENT: '✔ ทันรุ่น        ',
  UPDATE: '↑ ตกรุ่น·ไม่เคยแก้',
  MERGE: '⇄ ตกรุ่น·แก้เอง   ',
  REMOVED: '✘ asset ถูกถอด   ',
};
console.log(`\n${manifest.name} ${manifest.version} — kit freshness (${rows.length} stamped file(s))\n`);
for (const r of rows) {
  const ver = r.state === 'CURRENT' ? '' : `  (ติดตั้งที่ ${r.installedVersion})`;
  console.log(`  ${label[r.state]}  ${r.file}${ver}`);
}
const n = (s) => rows.filter((r) => r.state === s).length;
console.log(
  `\n  ทันรุ่น ${n('CURRENT')} · เสนอ update ${n('UPDATE')} · เสนอ merge ${n('MERGE')} · ถูกถอด ${n('REMOVED')}\n` +
    `  MERGE รวมไฟล์ที่มี placeholder ถูกแทนค่าตอนติดตั้งด้วย — แยกจากการแก้จริงไม่ได้ และทางระวังคือทางที่ถูกสำหรับทั้งคู่\n`
);
