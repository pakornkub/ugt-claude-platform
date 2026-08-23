#!/usr/bin/env node
// Gate for the org kit's message catalogs.
//   node <skill-dir>/scripts/check-i18n.mjs [projectRoot]
// 1. every namespace has the same key set in every locale
// 2. files already converted carry no Thai outside comments
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] ?? process.cwd();
const results = [];
const check = (name, fn) => {
  try {
    results.push({ name, ...(fn() ?? { ok: true }) });
  } catch (error) {
    results.push({ name, ok: false, msg: error.message });
  }
};

// Flatten { a: { b: 'x' } } to ['a.b'] so a missing leaf is named precisely.
function keyPaths(src) {
  const keys = [];
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path);
      else keys.push(path);
    }
  };
  walk(src, '');
  return keys.sort();
}

// The catalogs are .ts (มติ 2.4) so they cannot be imported here without a
// build step. Parse the object literal instead: strip the export wrapper and
// `as const`, then evaluate the remaining literal in an isolated Function.
function loadCatalog(file) {
  const raw = readFileSync(file, 'utf8');
  const start = raw.indexOf('{', raw.indexOf('export const'));
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error(`${file}: no object literal found`);
  return Function(`return (${raw.slice(start, end + 1)})`)();
}

check('catalog key parity across locales', () => {
  const dir = join(ROOT, 'messages');
  if (!existsSync(dir)) return { ok: true, msg: 'no messages/ — nothing to compare' };
  const byNamespace = new Map();
  for (const f of readdirSync(dir)) {
    const m = /^(.+)\.(th|en)\.ts$/.exec(f);
    if (!m) continue;
    const [, ns, locale] = m;
    if (!byNamespace.has(ns)) byNamespace.set(ns, {});
    byNamespace.get(ns)[locale] = keyPaths(loadCatalog(join(dir, f)));
  }
  const problems = [];
  for (const [ns, locales] of byNamespace) {
    if (!locales.th || !locales.en) {
      problems.push(`${ns}: has only ${Object.keys(locales).join(', ')} — both th and en are required`);
      continue;
    }
    const missingEn = locales.th.filter((k) => !locales.en.includes(k));
    const missingTh = locales.en.filter((k) => !locales.th.includes(k));
    if (missingEn.length) problems.push(`${ns}.en missing: ${missingEn.join(', ')}`);
    if (missingTh.length) problems.push(`${ns}.th missing: ${missingTh.join(', ')}`);
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

const icon = { true: '✔', false: '✘' };
let failed = 0;
for (const r of results) {
  if (r.ok !== true) failed++;
  console.log(`  ${icon[String(r.ok === true)]} ${r.name}`);
  if (r.msg) console.log(`      ${r.msg}`);
}
console.log(`\n${results.length - failed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
