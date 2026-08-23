#!/usr/bin/env node
// Runnable check for what ugt-nextjs-design-setup installs
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const results = [];
const p = (...s) => join(ROOT, ...s);
const has = (...s) => existsSync(p(...s));
const read = (...s) => readFileSync(p(...s), 'utf8');

/** All .tsx under the app's own source dirs (skips build output and deps) */
function sourceTsx() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', '.claude']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.tsx')) out.push(full);
    }
  };
  for (const d of ['app', 'components', 'features', 'src']) {
    if (has(d)) walk(p(d));
  }
  return out;
}

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
  const left = md.match(/__[A-Z][A-Z0-9_]*__/g);
  if (left) return { ok: false, msg: `Unsubstituted: ${[...new Set(left)].join(' ')}` };
  if (!/ugt-core/.test(md)) return { ok: false, msg: 'Header does not record the ugt-core contract version (sync mode needs it)' };
  if (!/##\s*10\.\s*มติ/.test(md)) return { ok: false, msg: 'No มติ (decision log) section' };
  return { ok: true };
});

check('docs/design-questions.md exists', () =>
  has('docs', 'design-questions.md') ? { ok: true } : { ok: false, msg: 'Pending-questions doc missing' }
);

check('No leftover placeholders in MOTION.md / design-questions.md', () => {
  // ไฟล์รองสองตัวถูก gen จาก template เดียวกัน — สแกนเฉพาะเมื่อมีไฟล์
  // (MOTION.md มีเฉพาะโปรเจคที่ตอบ custom motion = มี)
  const found = [];
  for (const f of ['MOTION.md', 'design-questions.md']) {
    if (!has('docs', f)) continue;
    const hits = [...new Set(read('docs', f).match(/__[A-Z][A-Z0-9_]*__/g) ?? [])];
    if (hits.length) found.push(`docs/${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

// ── shadcn config ──────────────────────────────────────────────────────────
// ── the preset (มติ 2026-08-04: b1ZzrZbs0 = base-mira / Base UI / neutral) ──
check('components.json matches the org preset', () => {
  if (!has('components.json')) return { ok: false, msg: 'No components.json — shadcn not initialized' };
  const cj = JSON.parse(read('components.json'));
  const problems = [];
  if (cj.style !== 'base-mira') {
    problems.push(
      "style is '" +
        cj.style +
        "' — a plain 'shadcn init' was run. Re-init with " +
        'npx shadcn@latest init --preset b1ZzrZbs0 --pointer --yes ' +
        '(มติ 2026-08-04: base-mira supersedes radix-mira)'
    );
  }
  if (cj.iconLibrary && cj.iconLibrary !== 'lucide') problems.push("iconLibrary is '" + cj.iconLibrary + "' (preset: lucide)");
  if (cj.rtl === true) problems.push('rtl is true (preset: false)');
  const baseColor = cj.tailwind?.baseColor ?? cj.baseColor;
  if (baseColor && baseColor !== 'neutral') problems.push("baseColor is '" + baseColor + "' (preset: neutral)");
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// The check above reads intent; this one reads what is actually on disk — a
// wrong init, a copy off any shadcn source that serves the default (Radix)
// style, or a hand-port from a radix-mira project all land here.
check('No Radix anywhere in the project (the kit is Base UI)', () => {
  const problems = [];

  if (has('package.json')) {
    const pkg = JSON.parse(read('package.json'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const radix = Object.keys(deps).filter((d) => d === 'radix-ui' || d.startsWith('@radix-ui/'));
    if (radix.length) problems.push('package.json depends on ' + radix.join(', ') + ' — uninstall');
    if (!deps['@base-ui/react']) problems.push('@base-ui/react is missing — the base-mira primitives are not installed');
  }

  // Base UI ignores Radix idioms silently: the component renders and the
  // control just does nothing, so only a scan catches them.
  const idioms = [
    [/\basChild\b/, 'asChild (Base UI: render={<X />})'],
    [/from ['"](radix-ui|@radix-ui\/[^'"]+)['"]/, 'imports radix-ui'],
    [/<\w*(Menu|Dropdown\w*)Item[^>]*\sonSelect=/s, 'onSelect on a menu item (Base UI: onClick)'],
    [/checked=["']indeterminate["']/, 'checked="indeterminate" (Base UI: checked + indeterminate booleans)'],
    [/\bdelayDuration=/, 'delayDuration (Base UI Tooltip: delay)'],
    // มติ 2026-08-23: `data-[state=…]` อยู่นอกรายการนี้โดยตั้งใจ. It is a Radix
    // idiom AND a perfectly ordinary attribute a plain element can set for
    // itself — the kit's own data-table.tsx marks its mobile card with
    // data-state={selected}. grep cannot tell the two apart, and a gate that
    // fails on correct shipped code is worse than one that misses a case the
    // repo-side lint-kit-assets already covers.
  ];
  for (const file of sourceTsx()) {
    const code = readFileSync(file, 'utf8');
    if (/\/\/ lint-ok:radix/.test(code)) continue;
    for (const [re, why] of idioms) {
      if (re.test(code)) problems.push(relative(ROOT, file) + ': ' + why);
    }
  }

  const shown = problems.slice(0, 8).join('\n      ');
  return problems.length
    ? { ok: false, msg: shown + (problems.length > 8 ? '\n      …+' + (problems.length - 8) + ' more' : '') }
    : { ok: true };
});

// ── tokens ────────────────────────────────────────────────────────────────
check('globals.css carries the org token set', () => {
  if (!has('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  const css = read('app', 'globals.css');
  const problems = [];
  if (/__PRIMARY(_DARK)?__/.test(css)) problems.push('__PRIMARY__ placeholder not substituted');
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

// ── cross-page consistency ────────────────────────────────────────────────
// Same component used on every page, but per-page config is where drift shows
// up: a table without `id` silently forgets column prefs that every other
// table remembers, and duplicate ids make two tables share one set of prefs.
check('Every <DataTable> passes a unique id (column prefs persist)', () => {
  const files = sourceTsx().filter((f) => !/[\\/]components[\\/]ui[\\/]data-table\.tsx$/.test(f));
  const missing = [];
  const ids = new Map();
  for (const file of files) {
    const body = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).split('\\').join('/');
    // each JSX opening tag for DataTable, up to the end of its attribute list
    for (const m of body.matchAll(/<DataTable\b([\s\S]*?)(?:\/>|>)/g)) {
      const attrs = m[1];
      const idMatch = attrs.match(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/);
      const line = body.slice(0, m.index).split('\n').length;
      if (!idMatch) {
        missing.push(`${rel}:${line}`);
        continue;
      }
      const id = idMatch[1] ?? idMatch[2] ?? idMatch[3];
      if (!id) {
        missing.push(`${rel}:${line} (empty id)`);
        continue;
      }
      if (ids.has(id)) ids.set(id, [...ids.get(id), `${rel}:${line}`]);
      else ids.set(id, [`${rel}:${line}`]);
    }
  }
  const dupes = [...ids.entries()].filter(([, where]) => where.length > 1);
  const problems = [];
  if (missing.length) problems.push(`no id: ${missing.slice(0, 5).join(' · ')}${missing.length > 5 ? ` …+${missing.length - 5}` : ''}`);
  for (const [id, where] of dupes) problems.push(`id "${id}" reused: ${where.join(' · ')}`);
  if (problems.length) return { ok: false, msg: problems.join(' | ') };
  return ids.size
    ? { ok: true, msg: `${ids.size} table(s), all with a unique id` }
    : { ok: 'warn', msg: 'No <DataTable> in the project yet — nothing to check' };
});

check('--radius survived the token merge', () => {
  // Radius belongs to the preset (มติ 2026-08-09): our token file declares
  // none, so if the merge dropped the preset's `--radius` line while replacing
  // :root, nothing defines it and every card/button silently goes square.
  if (!has('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  const css = read('app', 'globals.css');
  if (!/--radius\s*:/.test(css)) {
    return { ok: false, msg: 'globals.css defines no `--radius` — the preset line was lost when the :root block was replaced; restore it (base-mira ships 0.45rem)' };
  }
  return /--radius-lg\s*:/.test(css)
    ? { ok: true }
    : { ok: 'warn', msg: 'no `--radius-lg` in globals.css — the preset @theme radius scale may have been overwritten' };
});

check('Nothing clips content silently (table scrollX · sidebar scrollbar)', () => {
  const problems = [];
  for (const file of sourceTsx()) {
    const body = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).split('\\').join('/');
    // scrollX={false} clips columns away — allowed, but the reason must be written down
    for (const m of body.matchAll(/scrollX=\{false\}/g)) {
      const upto = body.slice(0, m.index);
      const line = upto.split('\n').length;
      const near = body.slice(Math.max(0, m.index - 400), m.index);
      if (!/\/\/|\/\*|\{\/\*/.test(near)) {
        problems.push(`${rel}:${line} scrollX={false} with no comment saying why clipping is safe here`);
      }
    }
    // the sidebar block ships `no-scrollbar`, which hides the only hint that more menu exists
    if (/SidebarContent/.test(body) && /no-scrollbar/.test(body)) {
      problems.push(`${rel}: SidebarContent still has \`no-scrollbar\` — swap it for \`scroll-thin\` so a long menu shows its scrollbar`);
    }
  }
  if (problems.length) return { ok: false, msg: problems.slice(0, 5).join(' · ') };

  // soft check: the sidebar should carry the org scrollbar style, not the OS default
  const sidebar = sourceTsx().find((f) => /[\\/]sidebar\.tsx$/.test(f));
  if (sidebar) {
    const body = readFileSync(sidebar, 'utf8');
    if (/SidebarContent/.test(body) && !/scroll-thin/.test(body)) {
      return { ok: 'warn', msg: 'SidebarContent has no `scroll-thin` — the menu will use the OS scrollbar, which differs per machine' };
    }
  }
  return { ok: true };
});

check('scroll-thin utility is installed', () => {
  if (!has('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  return /@utility\s+scroll-thin/.test(read('app', 'globals.css'))
    ? { ok: true }
    : { ok: false, msg: 'globals.css has no `@utility scroll-thin` — scrollable surfaces (sidebar, wide tables) fall back to the OS scrollbar; copy it from assets/globals.tokens.css' };
});

check('Only the four agreed radius roles are used', () => {
  // The preset defines 2xl/3xl/4xl too, but the agreement uses four roles:
  // chip (sm) · control (md) · card (lg) · overlay (xl).
  const offenders = [];
  for (const file of sourceTsx()) {
    const body = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).split('\\').join('/');
    const hits = [...new Set([...body.matchAll(/\brounded-(2xl|3xl|4xl)\b/g)].map((m) => m[0]))];
    if (hits.length) offenders.push(`${rel}: ${hits.join(', ')}`);
  }
  return offenders.length
    ? { ok: false, msg: `outside the agreed roles (chip/control/card/overlay): ${offenders.slice(0, 5).join(' · ')}` }
    : { ok: true };
});

check('Page-level filters use the control ladder, not bare Inputs', () => {
  // A filter row rendered with raw <Input> is the "dropdown here, textbox there"
  // drift; free-text search belongs to the DataTable toolbar, not a page filter.
  const suspects = [];
  for (const file of sourceTsx()) {
    const body = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).split('\\').join('/');
    // components/ui/ คือ kit เอง — ช่องค้นหาที่ถูกต้องตามข้อตกลง (และช่องกรอง
    // รายคอลัมน์) อยู่ใน data-table.tsx เช็คนี้ถามถึงโค้ดหน้า ไม่ใช่ตัว component
    if (/(?:^|\/)components\/ui\//.test(rel)) continue;
    for (const m of body.matchAll(/<Input\b([\s\S]*?)(?:\/>|>)/g)) {
      const attrs = m[1];
      if (/(?:placeholder|name|id|aria-label)\s*=\s*[^>]*?(?:ค้นหา|กรอง|filter|search)/i.test(attrs)) {
        suspects.push(`${rel}:${body.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  return suspects.length
    ? { ok: 'warn', msg: `Input used as search/filter — should be DataTable's toolbar search or a Select/Combobox: ${suspects.slice(0, 5).join(' · ')}` }
    : { ok: true };
});

// ── export ────────────────────────────────────────────────────────────────
// Only fires once the project actually exports something. Hand-rolled CSV is
// the failure mode: it loses the BOM (Thai turns to garbage in Excel) and the
// `=`-formula guard, and its header list drifts from its row list — HRMS
// shipped a 15-header/13-value route exactly that way.
check('Excel/CSV export goes through lib/export.ts', () => {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', '.claude']);
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) files.push(full);
    }
  };
  for (const d of ['app', 'components', 'features', 'lib', 'src']) if (has(d)) walk(p(d));

  const offenders = [];
  let exports = false;
  for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (rel === 'lib/export.ts') continue;
    const body = readFileSync(file, 'utf8');
    const rolled = /from\s+['"]exceljs['"]/.test(body) || /['"]text\/csv/.test(body);
    if (rolled) offenders.push(rel);
    if (rolled || /from\s+['"]@\/lib\/export['"]/.test(body)) exports = true;
  }

  if (!exports) return { ok: true, msg: 'no export route in this project — nothing to check' };
  if (!has('lib', 'export.ts')) {
    return { ok: false, msg: `Project exports files but lib/export.ts was never installed: ${offenders.join(' · ')}` };
  }
  return offenders.length
    ? { ok: false, msg: `Hand-rolled export (missing BOM + formula guard + row cap): ${offenders.join(' · ')}` }
    : { ok: true };
});

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
