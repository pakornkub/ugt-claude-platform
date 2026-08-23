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
  // ไม่ใช่ "ไม่มีอะไรให้เทียบ" แต่คือยังไม่ได้ติดตั้ง: ตั้งแต่ 4.46.0 คิตทั้งชุด
  // อ่านสตริงผ่าน catalog และ SKILL §Step 6 ให้ copy `messages/` ทุกโปรเจค
  // ไม่ใช่เฉพาะ th+en — ไม่มี dir นี้ = `t()` ทุกตัวโยนตอน render
  if (!existsSync(dir)) {
    return { ok: false, msg: 'no messages/ — copy assets/messages/ into the project (required in every project since 4.46.0)' };
  }
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

// Files that have been through an i18n phase. Adding a file here is the commit
// that finishes it — the gate then keeps Thai from creeping back in as the next
// person adds a feature out of habit.
//
// Split in two because "absent" means opposite things: these two ship with every
// install (SKILL §Step 6), so missing = the kit was never copied and the gate
// must say so instead of passing an empty project.
const REQUIRED_CONVERTED_FILES = ['ui/data-table.tsx', 'ui/confirm-action-dialog.tsx'];
// …while these ship only when the project needs them (export-menu needs Excel
// export, tiptap-editor needs rich text, date-picker when dates are picked),
// so absence is a valid state, not a failure.
const OPTIONAL_CONVERTED_FILES = ['ui/export-menu.tsx', 'ui/date-picker.tsx', 'ui/tiptap-editor.tsx'];
const CONVERTED_FILES = [...REQUIRED_CONVERTED_FILES, ...OPTIONAL_CONVERTED_FILES];

// A regex that cuts at the first `//` is wrong here: the kit uses backtick
// template literals spanning lines, and `//` appears inside URLs. Track quote
// and comment state character by character instead.
function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

// `assets/ui/` is copied to `components/ui/` in a consuming project (SKILL §Step 6),
// while a dev-time run against `assets/` sees it at `ui/`. Resolve either shape.
// A file present at neither is not installed — which is a failure for the
// required set and a valid state for the optional one (see the split above).
function resolveConverted(rel) {
  for (const candidate of [join(ROOT, rel), join(ROOT, 'components', rel)]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

check('converted files carry no Thai outside comments', () => {
  const problems = [];
  let scanned = 0;
  for (const rel of CONVERTED_FILES) {
    const file = resolveConverted(rel);
    if (!file) {
      if (REQUIRED_CONVERTED_FILES.includes(rel)) {
        problems.push(`${rel}: not installed — this file ships with every project (SKILL §Step 6)`);
      }
      continue;
    }
    scanned++;
    const code = stripComments(readFileSync(file, 'utf8'));
    const hits = code.split('\n').reduce((n, l) => n + (/[฀-๿]/.test(l) ? 1 : 0), 0);
    if (hits) problems.push(`${rel}: ${hits} line(s) still hold Thai in code — move them into messages/`);
  }
  if (problems.length) return { ok: false, msg: problems.join(' · ') };
  return { ok: true, msg: `${scanned}/${CONVERTED_FILES.length} converted file(s) present and clean` };
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
