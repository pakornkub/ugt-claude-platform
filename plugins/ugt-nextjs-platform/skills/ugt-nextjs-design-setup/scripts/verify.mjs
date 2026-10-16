#!/usr/bin/env node
// Runnable check for what ugt-nextjs-design-setup installs
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const results = [];
const p = (...s) => join(ROOT, ...s);
const has = (...s) => existsSync(p(...s));
const read = (...s) => readFileSync(p(...s), 'utf8');
// src/ layouts move app/components/lib/i18n/messages wholesale under src/ —
// the same support check-i18n.mjs's resolveConverted() gained in 4.47.5.
// Root-only lookups here would false-fail exactly those projects.
const hasIn = (...s) => has(...s) || has('src', ...s);
const readIn = (...s) => (has(...s) ? read(...s) : read('src', ...s));

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
    if (!deps['@base-ui/react']) problems.push('@base-ui/react is missing — the base-mira primitives are not installed (no shell? add it to package.json by hand — ugt-nextjs-full-setup SKILL.md §3 No shell)');
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
// §10 is append-only, so the LAST matching row is the one in force — a
// re-aligned project still carries its old preserve rows (Re-align mode, 4.63.3).
// Scoped to §10 because the template body itself says "ยึดของเดิม" (§4).
const decisionLog = () => {
  if (!has('docs', 'DESIGN.md')) return '';
  const md = read('docs', 'DESIGN.md');
  const i = md.search(/^## 10\./m);
  return i < 0 ? '' : md.slice(i);
};

// Preserve mode ข้อ 10 (มติ 2026-09-09): DESIGN.md §10 may record
// "ฟ้อนต์: คงของเดิม (<name>)" — then the project's own font stays and the
// Inter/Noto demands below are replaced by "some next/font is wired".
const keptFont = () => {
  const last = [...decisionLog().matchAll(/ฟ้อนต์\s*:\s*([^|\n]+)/g)].at(-1)?.[1] ?? '';
  const m = /^คงของเดิม\s*\(([^)\n]+)\)/.exec(last.trim());
  return m ? m[1].trim() : null;
};

// Mode rows ignore font rows: re-aligning tokens while keeping the font writes
// a later "ฟ้อนต์: คงของเดิม" row that must not flip the mode back.
const PRESERVE_ROW = /ยึดของเดิม|คงของเดิม|design เดิม|preserve mode/i;
const REALIGN_ROW = /ยึด org \(re-align\)/;
const isPreserveMode = () => {
  const rows = decisionLog().split('\n').filter((l) => !/ฟ้อนต์\s*:/.test(l));
  const lastPreserve = rows.findLastIndex((l) => PRESERVE_ROW.test(l));
  return lastPreserve >= 0 && lastPreserve > rows.findLastIndex((l) => REALIGN_ROW.test(l));
};

check('globals.css carries the org token set', () => {
  if (!hasIn('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  const css = readIn('app', 'globals.css');
  const problems = [];
  const leftover = [...new Set(css.match(/__(PRIMARY|PRIMARY_DARK|RING_DARK)__/g) ?? [])];
  if (leftover.length) problems.push(`placeholder not substituted: ${leftover.join(' ')} (globals.tokens.css header has the defaults)`);
  for (const t of ['amber', 'emerald', 'red', 'coral', 'sky', 'gray']) {
    if (!css.includes(`--status-${t}:`)) problems.push(`--status-${t} missing`);
  }
  if (keptFont()) {
    if (!/--font-sans:\s*var\(--font-/.test(css)) problems.push('--font-sans does not point at a next/font variable (ข้อ 10 = คงฟ้อนต์เดิม)');
  } else if (!/--font-sans:.*noto/i.test(css)) {
    problems.push('--font-sans does not include the Thai font variable');
  }
  if (!css.includes('.dark')) problems.push('no .dark token block (tokens must exist even without a toggle)');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// มติ 2026-10-16 (backlog §14 release 1) added three token pieces. Warn, not
// fail: a project installed before it only gets them through "sync ข้อตกลง
// design", where each change is accepted or rejected as a มติ — verify must not
// turn a recorded rejection into a red build.
check('Tokens from มติ 2026-10-16 present (status-violet · cat-1..8 · reduced-motion)', () => {
  if (!hasIn('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  const css = readIn('app', 'globals.css');
  const missing = [];
  if (!css.includes('--status-violet:')) missing.push('--status-violet (+ -foreground)');
  const cats = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => !css.includes(`--cat-${n}:`));
  if (cats.length) missing.push(`--cat-${cats.join('/')}`);
  if (!/prefers-reduced-motion:\s*reduce/.test(css)) missing.push('@media (prefers-reduced-motion: reduce) block');
  return missing.length
    ? { ok: 'warn', msg: `missing ${missing.join(' · ')} — copy from assets/globals.tokens.css (fresh install) or run "sync ข้อตกลง design" (existing project)` }
    : { ok: true };
});

check('layout.tsx wires the agreed font via next/font', () => {
  if (!hasIn('app', 'layout.tsx')) return { ok: false, msg: 'No app/layout.tsx' };
  const l = readIn('app', 'layout.tsx');
  const kept = keptFont();
  if (kept) {
    return /from ['"]next\/font\/(google|local)['"]/.test(l)
      ? { ok: true, msg: `ข้อ 10 = คงฟ้อนต์เดิม (${kept}) — Inter/Noto not required` }
      : { ok: false, msg: `DESIGN.md keeps the project font (${kept}) but app/layout.tsx imports nothing from next/font` };
  }
  const problems = [];
  if (!/Noto_Sans_Thai/.test(l)) problems.push('Noto_Sans_Thai not imported');
  if (!/Inter/.test(l)) problems.push('Inter not imported');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── kit ───────────────────────────────────────────────────────────────────
// `empty` is a shadcn primitive (Step 3's `npx shadcn@latest add` list), not a
// file this skill copies from assets/ like the rest of this list — a project
// that hasn't run that add command yet gets a message pointing at the actual
// install command instead of the misleading "Kit file missing" (eval 2026-09-13).
const SHADCN_ADD_FILES = new Set(['empty']);
for (const f of ['status-badge', 'icon-action', 'confirm-action-dialog', 'form-dialog', 'data-table', 'date-picker', 'empty']) {
  check(`components/ui/${f}.tsx installed`, () => {
    if (hasIn('components', 'ui', `${f}.tsx`)) return { ok: true };
    return SHADCN_ADD_FILES.has(f)
      ? { ok: false, msg: `not installed — run npx shadcn@latest add ${f} (SKILL.md Step 3.4 primitive list; no shell → list it under ยังไม่ได้รัน, ugt-nextjs-full-setup §3)` }
      : { ok: false, msg: 'Kit file missing' };
  });
}

// Release-3 kit pieces import each other — copying one without its companions
// is a build break that only shows on the page that first uses it.
const KIT_COMPANIONS = {
  'filter-popover': ['ui/responsive-popover'],
  'period-navigator': ['ui/responsive-popover', 'ui/year-select', 'ui/month-select', 'ui/date-picker', 'ui/icon-action'],
  'responsive-popover': ['hooks/use-mobile'],
  'settings-sheet': ['ui/sheet', 'ui/field', 'ui/input-group', 'ui/switch', 'ui/label'],
};
check('Kit pieces ship with their companions (period-navigator · filter-popover · settings-sheet)', () => {
  const present = (rel) => {
    const [dir, name] = rel.split('/');
    const base = dir === 'hooks' ? ['hooks'] : ['components', 'ui'];
    return ['.ts', '.tsx'].some((ext) => hasIn(...base, `${name}${ext}`));
  };
  const missing = [];
  for (const [file, needs] of Object.entries(KIT_COMPANIONS)) {
    if (!hasIn('components', 'ui', `${file}.tsx`)) continue;
    for (const need of needs) if (!present(need)) missing.push(`${file} → ${need}`);
  }
  return missing.length
    ? { ok: false, msg: `${missing.join(' · ')} — copy the companion (kit-inventory.md) · hooks/use-mobile: npx shadcn@latest add use-mobile` }
    : { ok: true };
});

// มติ 2026-10-16 B7: the native time picker follows the OS locale (AM/PM on en-US) and can show
// a seconds segment — testers read it as a wrong time. components/ui/ is the kit itself: skip it.
check('Time fields use ui/time-input (no native type="time")', () => {
  // Blank comments out but keep their newlines (reported line numbers stay right); a `//` only
  // starts a comment at line start / after whitespace, so a URL inside a string survives.
  const blank = (m) => m.replace(/[^\n]/g, '');
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|\s)\/\/[^\n]*/gm, blank);
  const hits = [];
  for (const file of sourceTsx()) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (/(?:^|\/)components\/ui\//.test(rel)) continue;
    const body = strip(readFileSync(file, 'utf8'));
    // JSX attribute only (whitespace before, no spaces around `=`) — not `const type = 'time'` / `data-type`
    for (const m of body.matchAll(/(?<=\s)type=(?:"time"|'time'|\{\s*['"]time['"]\s*\})/g)) {
      hits.push(`${rel}:${body.slice(0, m.index).split('\n').length}`);
    }
  }
  return hits.length
    ? { ok: 'warn', msg: `native time input → <TimeInput>: ${hits.slice(0, 5).join(' · ')}${hits.length > 5 ? ` …+${hits.length - 5}` : ''}` }
    : { ok: true };
});

// A bare `w-full` / `sm:max-w-*` (md: lg: …) on a left/right SheetContent never applies — the
// primitive's data-[side=right]:w-3/4 / data-[side=right]:sm:max-w-sm win on specificity, so the
// sheet silently stays 75% wide on phones and 384px above. top/bottom sheets have no such cap.
check('SheetContent widths actually apply (data-[side=…]: prefix / SettingsSheetContent)', () => {
  const bare = /(?<![\w:\]-])(?:w-full|(?:sm|md|lg|xl|2xl):max-w-\S+)/;
  const hits = [];
  for (const file of sourceTsx()) {
    const rel = relative(ROOT, file).split('\\').join('/');
    if (/(?:^|\/)components\/ui\//.test(rel)) continue;
    const body = readFileSync(file, 'utf8');
    // the opening tag up to its className string (props before it may hold `=>`)
    for (const m of body.matchAll(/<SheetContent\b((?:(?!<|\/>)[\s\S]){0,600}?)className=\{?\s*(?:cn\(\s*)?["'`]([^"'`]*)/g)) {
      if (/side=["'{]*\s*["']?(?:top|bottom)/.test(m[1]) || !bare.test(m[2])) continue;
      hits.push(`${rel}:${body.slice(0, m.index).split('\n').length}`);
    }
  }
  return hits.length
    ? { ok: 'warn', msg: `${hits.slice(0, 5).join(' · ')} — bare w-full / sm:max-w-* on SheetContent is overridden by the primitive; settings → SettingsSheetContent size="xl" | "5xl", other panels → data-[side=right]:w-full data-[side=right]:sm:max-w-* (form-pages.md)` }
    : { ok: true };
});

check('lib/format.ts installed (the only formatter)', () =>
  hasIn('lib', 'format.ts') ? { ok: true } : { ok: false, msg: 'Central formatter missing' }
);

// ── cross-page consistency ────────────────────────────────────────────────
// Same component used on every page, but per-page config is where drift shows
// up: a table without `id` silently forgets column prefs that every other
// table remembers, and duplicate ids make two tables share one set of prefs.
check('Every <DataTable> passes a unique id (column prefs persist)', () => {
  // components/ui/ is the kit itself — its files only MENTION <DataTable> in
  // JSDoc usage examples (bulk-action-bar.tsx), never mount one. Scanning them
  // raw produced a false ✘ on every project with the full kit (eval run
  // 2026-09-09). Skip the kit dir and strip comments before matching.
  const files = sourceTsx().filter((f) => !/[\\/]components[\\/]ui[\\/]/.test(f));
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  const missing = [];
  const ids = new Map();
  for (const file of files) {
    const body = stripComments(readFileSync(file, 'utf8'));
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

check('Radius scale merged as agreed (fixed roles, card = 0.45rem)', () => {
  // มติ 2026-10-16 (TK-RAD) replaced มติ 2026-08-09: the token file now owns a
  // FIXED scale (sm 4 · md 6 · lg 7.2 card · xl 14) plus `--radius: 0.75rem`.
  // The merge failure this catches: the preset's own `calc(var(--radius) × …)`
  // scale left in @theme next to our 0.75rem — every corner grows ×1.67 and
  // cards hit 12px. A project on the pre-2026-10-16 scale (preset calc +
  // 0.45rem) is still coherent, so it passes with a note; preserve mode
  // rebases radius onto measured values (§Scale bridge), so no value is pinned
  // there.
  if (!hasIn('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  // comments mention "--radius: 0.45rem …" in prose (the old token file did) — read declarations only
  const css = readIn('app', 'globals.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const base = /--radius\s*:\s*([^;]+);/.exec(css)?.[1]?.trim();
  const lg = [...css.matchAll(/--radius-lg\s*:\s*([^;]+);/g)].at(-1)?.[1]?.trim();
  if (!base && !lg) {
    return { ok: false, msg: 'globals.css defines no radius at all — the :root/@theme blocks were replaced without the radius lines; copy them from assets/globals.tokens.css (every card/button is square right now)' };
  }
  const lgIsCalc = /calc\(\s*var\(--radius\)/.test(lg ?? '');
  if (lgIsCalc && base === '0.75rem') {
    return { ok: false, msg: 'the preset\'s calc(var(--radius) × …) scale is still in @theme next to --radius: 0.75rem — every corner is ×1.67 (cards 12px). Replace the preset scale with the fixed one from assets/globals.tokens.css (--radius-lg: 0.45rem = card)' };
  }
  if (isPreserveMode()) return { ok: true, msg: 'preserve mode — radius follows the measured scale' };
  if (lg === '0.45rem') return { ok: true };
  return lgIsCalc
    ? { ok: true, msg: `pre-2026-10-16 radius (preset calc of --radius ${base ?? '?'}) — "sync ข้อตกลง design" offers the fixed scale` }
    : { ok: 'warn', msg: `--radius-lg is ${lg ?? 'undefined'} — the card role is 0.45rem (มติ 2026-10-16 TK-RAD); a different value needs its own มติ in DESIGN.md §10` };
});

// ── preserve mode + Tailwind major ────────────────────────────────────────
// 2026-09-09 field report: "ใช้ design เดิม" was read as "skip design", the
// scan/rebase never ran, and the auth admin pages (kit-built) shipped as a
// second template on org indigo. DESIGN.md records the mode; globals.css shows
// whether the rebase actually happened.
const ORG_PRIMARY = 'oklch(0.488 0.243 264.4)';
check('Preserve mode honored: kit tokens rebased, not left at org defaults', () => {
  if (!has('docs', 'DESIGN.md') || !hasIn('app', 'globals.css')) return { ok: true, msg: 'nothing to compare yet' };
  const md = read('docs', 'DESIGN.md');
  if (!isPreserveMode()) return { ok: true, msg: 'not a preserve-mode project (or re-aligned to org)' };
  const css = readIn('app', 'globals.css');
  const primary = /--primary\s*:\s*([^;]+);/.exec(css)?.[1]?.trim();
  if (primary === ORG_PRIMARY && !md.includes(ORG_PRIMARY)) {
    return {
      ok: false,
      msg: 'DESIGN.md says ยึดของเดิม but --primary is still the org indigo and DESIGN.md never records indigo as the MEASURED value — the §Scan + §Scale bridge was skipped, so every kit page (auth /admin/*) renders as a second template. Measure the existing primary/radius/scale and substitute them (interview.md §Scan, §Scale bridge)',
    };
  }
  return { ok: true };
});

function sourceCss() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', '.claude', 'public']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(css|scss)$/.test(entry)) out.push(full);
    }
  };
  for (const d of ['app', 'styles', 'src']) if (has(d)) walk(p(d));
  return out;
}

check('Tailwind is v4 (the kit token file is v4-only)', () => {
  const problems = [];
  if (has('package.json')) {
    const pkg = JSON.parse(read('package.json'));
    const tw = { ...pkg.dependencies, ...pkg.devDependencies }.tailwindcss;
    const major = Number(/(\d+)/.exec(String(tw ?? ''))?.[1] ?? NaN);
    if (tw && major < 4) problems.push(`package.json tailwindcss ${tw}`);
  }
  for (const file of sourceCss()) {
    if (/@tailwind\s+(base|components|utilities)\b/.test(readFileSync(file, 'utf8'))) {
      problems.push(`${relative(ROOT, file).split('\\').join('/')} uses @tailwind directives (v3)`);
    }
  }
  return problems.length
    ? {
        ok: false,
        msg: `${problems.join(' · ')} — @theme inline / @custom-variant / @utility in globals.css are ignored on v3, so no token reaches a utility and every kit component renders unstyled; run npx @tailwindcss/upgrade first (references/shadcn-init.md §Tailwind first)`,
      }
    : { ok: true };
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
    // SidebarInset without min-w-0 lets a wide table stretch the whole page sideways
    const inset = /function SidebarInset[\s\S]*?className=\{cn\(([\s\S]*?)\)\}/.exec(body)?.[1];
    if (inset && !/min-w-0/.test(inset)) {
      return { ok: 'warn', msg: 'SidebarInset has no `min-w-0` — a wide table will make the whole page scroll sideways instead of the table' };
    }
  }
  return { ok: true };
});

// ── shell (มติ 2026-10-16 D7) ─────────────────────────────────────────────
// Sanctioned edit to components/ui/sidebar.tsx (layout-shells.md §Org shell
// rules → Sidebar active state): the preset ships the "Subtle" active row
// (bg-sidebar-accent — a faint gray on the white sidebar, barely different
// from hover). Warn only: projects installed before this release keep the
// subtle row until "sync ข้อตกลง design".
check('Sidebar active item is solid (มติ D7 sanctioned edit)', () => {
  const sidebar = sourceTsx().find((f) => /[\\/]components[\\/]ui[\\/]sidebar\.tsx$/.test(f));
  if (!sidebar) return { ok: true, msg: 'no components/ui/sidebar.tsx — nothing to check' };
  const body = readFileSync(sidebar, 'utf8');
  const base = /sidebarMenuButtonVariants\s*=\s*cva\(\s*(["'`])([\s\S]*?)\1/.exec(body)?.[2] ?? '';
  const gaps = [];
  if (!/data-active:bg-sidebar-primary\b/.test(base)) {
    gaps.push('SidebarMenuButton active row = data-active:bg-sidebar-primary + data-active:text-sidebar-primary-foreground');
  }
  if (/peer-data-active\/menu-button:text-sidebar-accent-foreground/.test(body)) {
    gaps.push('SidebarMenuBadge/SidebarMenuAction on the active row = peer-data-active/menu-button:text-sidebar-primary-foreground');
  }
  return gaps.length
    ? { ok: 'warn', msg: `${gaps.join(' · ')} — layout-shells.md §Sidebar active state (or "sync ข้อตกลง design")` }
    : { ok: true };
});

// `sortable` sorts the rows in hand. With serverPagination those rows are ONE
// page, so ui/data-table ignores the prop — writing both means the author
// expected a sort that never happens. Server tables sort through serverQuery.
// Depth-aware tag scan: serverPagination's object usually holds an arrow
// (`onChange: (n) => …`) whose `>` would end a naive /<DataTable[^>]*>/ match.
check('No <DataTable> passes `sortable` together with `serverPagination`', () => {
  const files = sourceTsx().filter((f) => !/[\\/]components[\\/]ui[\\/]/.test(f));
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const tagsOf = (src) => {
    const tags = [];
    const re = /<DataTable(?![A-Za-z0-9])/g;
    let m;
    while ((m = re.exec(src))) {
      let depth = 0;
      let quote = null;
      let i = m.index + m[0].length;
      for (; i < src.length; i++) {
        const c = src[i];
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{' || c === '(') depth++;
        else if (c === '}' || c === ')') depth--;
        else if (c === '>' && depth === 0) break;
      }
      tags.push({ at: m.index, text: src.slice(m.index, i) });
    }
    return tags;
  };
  const hits = [];
  for (const file of files) {
    const body = strip(readFileSync(file, 'utf8'));
    const rel = relative(ROOT, file).split('\\').join('/');
    for (const { at, text } of tagsOf(body)) {
      // bare `sortable` or sortable={true} — never `sortable:` inside serverQuery.fields,
      // never a dynamic value (can't tell statically)
      const sortableOn = /\ssortable(?:\s*=\s*\{\s*true\s*\})?(?=[\s/]|$)/.test(text);
      if (sortableOn && /\sserverPagination\s*=/.test(text)) {
        hits.push(`${rel}:${body.slice(0, at).split('\n').length}`);
      }
    }
  }
  return hits.length
    ? { ok: false, msg: `${hits.join(' · ')} — sortable is ignored on a server-paginated table (it would sort one page only); sort through serverQuery instead (datatable.md §sortable)` }
    : { ok: true };
});

check('scroll-thin utility is installed', () => {
  if (!hasIn('app', 'globals.css')) return { ok: false, msg: 'No app/globals.css' };
  return /@utility\s+scroll-thin/.test(readIn('app', 'globals.css'))
    ? { ok: true }
    : { ok: false, msg: 'globals.css has no `@utility scroll-thin` — scrollable surfaces (sidebar, wide tables) fall back to the OS scrollbar; copy it from assets/globals.tokens.css' };
});

// ── shell header ──────────────────────────────────────────────────────────
// 4.58.0 field report: installs shipped the sidebar block with an empty top
// bar (trigger only — no breadcrumb, no toggles, no divider) because the
// site-header existed only as a pointer at HRMS code. These checks make that
// install state visible.
// A shadcn sidebar SHELL is in use only when a layout mounts the block's own
// pieces — <Sidebar> / <SidebarInset>. Neither the file components/ui/sidebar.tsx
// nor a bare <SidebarProvider> is that signal: auth-setup's NavUser calls
// useSidebar(), so preserve-mode projects that keep their own <aside> still wrap
// it in SidebarProvider (context only, renders nothing) and have no SidebarInset
// to mount a site-header into. Both weaker gates produced a false ✘ on exactly
// those projects (eval run 2026-09-09, full-setup #4). Look only at layout.tsx
// files with comments stripped: the org shell lives in app/(app)/layout.tsx
// (layout-shells.md step 1), while auth's unrendered <AdminNav> fallback and
// site-header's own JSDoc both mention <Sidebar>/SidebarInset without mounting
// anything — scanning every component tripped on exactly those two files.
const usesSidebarShell = () =>
  sourceTsx().some((f) => {
    if (!/layout\.tsx$/.test(f) || /[\\/]components[\\/]ui[\\/]/.test(f)) return false;
    const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    return /\bSidebarInset\b|<Sidebar[\s>\/]/.test(code);
  });

check('Sidebar shell has the site-header (breadcrumb + toggle mount point)', () => {
  if (!usesSidebarShell()) {
    return { ok: true, msg: 'no shadcn sidebar shell mounted in this project — nothing to check' };
  }
  if (!hasIn('components', 'site-header.tsx')) {
    return {
      ok: false,
      msg: 'components/site-header.tsx missing — copy assets/components/site-header.tsx and mount it as the first child of SidebarInset (nav-config.md §Site header); an empty top bar is the install bug this gate exists for',
    };
  }
  const used = sourceTsx().some(
    (f) => !/[\\/]site-header\.tsx$/.test(f) && /from ['"]@\/components\/site-header['"]/.test(readFileSync(f, 'utf8'))
  );
  if (!used) {
    return { ok: false, msg: 'site-header.tsx is copied but nothing imports it — mount it in app/(app)/layout.tsx inside SidebarInset' };
  }
  return hasIn('components', 'site-header.test.ts')
    ? { ok: true }
    : { ok: 'warn', msg: 'site-header.test.ts missing — the pair ships together (it locks deriveCrumbs: first crumb = group heading, longest-prefix, decoded segments)' };
});

check('Copied toggles are actually rendered (theme-toggle / language-switcher)', () => {
  const orphans = [];
  for (const [file, name] of [
    ['theme-toggle', 'ThemeToggle'],
    ['language-switcher', 'LanguageSwitcher'],
  ]) {
    if (!hasIn('components', `${file}.tsx`)) continue;
    const used = sourceTsx().some(
      (f) => !f.endsWith(`${file}.tsx`) && new RegExp(`\\b${name}\\b`).test(readFileSync(f, 'utf8'))
    );
    if (!used) orphans.push(`${file}.tsx (mount <${name} /> in site-header's actions slot)`);
  }
  return orphans.length
    ? { ok: false, msg: `copied but never rendered: ${orphans.join(' · ')} — the user sees no switcher at all` }
    : { ok: true };
});

check('SelectTrigger fills its grid cell (w-full)', () => {
  if (!hasIn('components', 'ui', 'select.tsx')) {
    return { ok: true, msg: 'no select.tsx installed yet — nothing to check' };
  }
  return /SelectTrigger[\s\S]*?w-full/.test(readIn('components', 'ui', 'select.tsx'))
    ? { ok: true }
    : {
        ok: false,
        msg: "base-mira's SelectTrigger defaults to w-fit — a form Select shrinks to its chosen value (field bug). Add `w-full` to the trigger's base classes (sanctioned edit, DESIGN.md §4); toolbar callsites keep overriding with w-44/w-20 via cn",
      };
});

// ── sanctioned primitive edits (assets/ui/button-variants.md + primitive-edits.md) ──
// success/field have been mandatory for a long time: the kit's date-picker uses
// `field`, ConfirmActionDialog types `confirmVariant` against `success` — either
// missing is a type error, so those two FAIL. Everything from มติ 2026-10-16
// (backlog §14 release 2) WARNS: an older project gets it through "sync ข้อตกลง
// design", and a recorded rejection there must not turn the build red.
check('button.tsx carries the sanctioned variants (button-variants.md)', () => {
  if (!hasIn('components', 'ui', 'button.tsx')) return { ok: false, msg: 'components/ui/button.tsx missing — npx shadcn@latest add button' };
  const code = readIn('components', 'ui', 'button.tsx');
  const key = (name) => new RegExp(`(?:^|[\\s{,])["']?${name}["']?\\s*:`, 'm').test(code);
  const missing = ['success', 'field'].filter((k) => !key(k));
  if (missing.length) {
    return { ok: false, msg: `variant ${missing.join(' + ')} missing — ui/date-picker uses \`field\`, ConfirmActionDialog types against \`success\`; apply assets/ui/button-variants.md` };
  }
  const later = [];
  if (!key('soft')) later.push('variant `soft`');
  if (!key('cta')) later.push('size `cta`');
  const destructive = /destructive\s*:\s*(["'`])([\s\S]*?)\1/.exec(code)?.[2] ?? '';
  if (!/(?:^|\s)bg-destructive(?=\s|$)/.test(destructive)) later.push('solid `destructive` (still the preset tint bg-destructive/10)');
  return later.length
    ? { ok: 'warn', msg: `มติ 2026-10-16 D6/A7 not applied: ${later.join(' · ')} — copy from assets/ui/button-variants.md (fresh install) or "sync ข้อตกลง design" (existing project)` }
    : { ok: true };
});

check('Card · table · dialog zones carry the มติ 2026-10-16 edits (primitive-edits.md)', () => {
  const wants = [
    ['card', [[/shadow-xs/, 'shadow-xs'], [/ring-border/, 'ring-border'], [/data-slot=card-heading\]\]:pt-0/, 'has-[>[data-slot=card-heading]]:pt-0']]],
    ['table', [[/2xl:text-sm/, '2xl:text-sm on <table>']]],
    ['dialog', [[/bg-muted\/40/, 'DialogFooter border-t bg-muted/40'], [/\[&_button\]:h-11/, 'footer buttons at cta']]],
    ['sheet', [[/bg-muted\/40/, 'SheetFooter border-t bg-muted/40']]],
    ['alert-dialog', [[/bg-muted\/40/, 'AlertDialogFooter border-t bg-muted/40'], [/size\s*=\s*["']cta["']/, 'Action/Cancel default size cta']]],
  ];
  const missing = [];
  for (const [file, rules] of wants) {
    if (!hasIn('components', 'ui', `${file}.tsx`)) continue; // not installed → nothing to edit yet
    const code = readIn('components', 'ui', `${file}.tsx`);
    const gaps = rules.filter(([re]) => !re.test(code)).map(([, what]) => what);
    if (gaps.length) missing.push(`${file}.tsx: ${gaps.join(', ')}`);
  }
  const kit = ['card-heading', 'view-toggle'].filter((f) => !hasIn('components', 'ui', `${f}.tsx`));
  if (kit.length) missing.push(`kit file(s) not copied: ${kit.map((f) => `ui/${f}.tsx`).join(', ')}`);
  return missing.length
    ? { ok: 'warn', msg: `${missing.join(' · ')} — apply assets/ui/primitive-edits.md / copy from assets/ui/ (or "sync ข้อตกลง design")` }
    : { ok: true };
});

check('Shell header shows the brand logo, not the block demo icon', () => {
  if (!usesSidebarShell()) {
    return { ok: true, msg: 'no shadcn sidebar shell mounted — nothing to check' };
  }
  const referenced = sourceTsx().some((f) => /\/brand\/|ube-logo/.test(readFileSync(f, 'utf8')));
  return referenced
    ? { ok: true }
    : {
        ok: 'warn',
        msg: 'nothing references public/brand/ — the sidebar header is likely still the block demo logo; DESIGN.md §3: ube-logo-short.svg in the shell header (a recorded มติ may deviate)',
      };
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
    if (rel === 'lib/export.ts' || rel === 'src/lib/export.ts') continue;
    const body = readFileSync(file, 'utf8');
    const rolled = /from\s+['"]exceljs['"]/.test(body) || /['"]text\/csv/.test(body);
    if (rolled) offenders.push(rel);
    if (rolled || /from\s+['"]@\/lib\/export['"]/.test(body)) exports = true;
  }

  if (!exports) return { ok: true, msg: 'no export route in this project — nothing to check' };
  if (!hasIn('lib', 'export.ts')) {
    return { ok: false, msg: `Project exports files but lib/export.ts was never installed: ${offenders.join(' · ')}` };
  }
  return offenders.length
    ? { ok: false, msg: `Hand-rolled export (missing BOM + formula guard + row cap): ${offenders.join(' · ')}` }
    : { ok: true };
});

// ── dev environment indicator ─────────────────────────────────────────────
// dev and prod share one host and look identical — the basePath (`-dev`) is the
// only difference. Two signals, both driven by isDevEnvironment(): the amber bar
// on every page (the root layout, NOT the shell: the login page has no shell)
// and the `[DEV] ` tab-title prefix. Reads the code, not a deployment — whether
// a real dev deploy shows them is the by-eye line in the SKILL checklist.
check('Root layout shows the DEV bar + "[DEV] " title on the dev deployment', () => {
  if (!hasIn('app', 'layout.tsx')) return { ok: false, msg: 'No app/layout.tsx' };
  const problems = [];
  if (!hasIn('lib', 'environment.ts')) problems.push('lib/environment.ts missing (copy assets/lib/environment.ts)');
  if (!hasIn('components', 'dev-environment-bar.tsx')) {
    problems.push('components/dev-environment-bar.tsx missing (copy assets/components/dev-environment-bar.tsx)');
  }
  if (!hasIn('lib', 'env.ts')) problems.push('lib/env.ts missing — lib/environment.ts imports env from @/lib/env (database-setup ships it)');
  else {
    // isDevEnvironment() reads env.NEXT_PUBLIC_BASE_PATH — declared in the client block AND runtimeEnv
    const envCode = readIn('lib', 'env.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const n = (envCode.match(/NEXT_PUBLIC_BASE_PATH/g) ?? []).length;
    if (n < 2) problems.push('lib/env.ts must declare NEXT_PUBLIC_BASE_PATH in both the client block and runtimeEnv');
  }
  const code = readIn('app', 'layout.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  if (!/from ['"]@\/lib\/environment['"]/.test(code)) problems.push('app/layout.tsx does not import isDevEnvironment from @/lib/environment');
  if (!/isDevEnvironment\(\)\s*(&&|\?)\s*<DevEnvironmentBar\b/.test(code)) {
    problems.push('app/layout.tsx does not render {isDevEnvironment() && <DevEnvironmentBar />} — mount it in the ROOT layout, above the shell, so the login page gets it too');
  }
  if (!/\[DEV\] /.test(code)) {
    problems.push('metadata title has no "[DEV] " prefix (an old " (DEV)" suffix does not count — references/root-layout.md §DEV environment indicator)');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── harness ───────────────────────────────────────────────────────────────
check('.claude/rules/ugt-nextjs-design.md installed', () => {
  if (!has('.claude', 'rules', 'ugt-nextjs-design.md')) {
    return { ok: false, msg: 'Harness rule missing — the agreement dies with this session' };
  }
  const r = read('.claude', 'rules', 'ugt-nextjs-design.md');
  return /paths:/.test(r) ? { ok: true } : { ok: false, msg: 'Rule file has no paths frontmatter — it will never load' };
});

// ── i18n ──────────────────────────────────────────────────────────────────
// Four pieces, all load-bearing: miss any one and `t()` / `getLocale()` throw at
// render — the app does not boot, it is not a degraded experience. The plugin
// registration is the one that reads as optional and is not: without it Next
// never aliases next-intl's request config and `i18n/request.ts` is dead code.
check('next-intl wired end to end (plugin · request config · provider · catalog)', () => {
  if (!has('package.json')) return { ok: false, msg: 'No package.json — cannot tell whether next-intl is installed' };
  const pkg = JSON.parse(read('package.json'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (!deps['next-intl']) {
    return {
      // fail, not warn — SKILL/มติ 2.2: since 4.46.0 every kit component calls
      // useTranslations() unconditionally; without next-intl the app does not
      // boot. A warn here contradicted the doc's own severity.
      ok: false,
      msg: 'next-intl is not a dependency — since 4.46.0 the whole kit reads its strings through the catalog; every t() throws at render (มติ 2.2) (no shell? add it to package.json by hand — ugt-nextjs-full-setup SKILL.md §3 No shell)',
    };
  }

  const problems = [];

  if (!hasIn('i18n', 'request.ts')) problems.push('i18n/request.ts missing — copy assets/i18n/');

  // Registration lives in next.config, in whatever extension the project uses.
  const configFile = ['next.config.ts', 'next.config.mjs', 'next.config.js', 'next.config.cjs'].find((f) => has(f));
  if (!configFile) {
    problems.push('no next.config.* — the next-intl plugin has nowhere to be registered');
  } else {
    const cfg = read(configFile);
    if (!/next-intl\/plugin/.test(cfg)) {
      problems.push(
        `${configFile} never imports next-intl/plugin — i18n/request.ts is then never loaded and every t()/getLocale() throws at render (references/root-layout.md §next-intl plugin)`
      );
    } else if (!/withNextIntl\s*\(/.test(cfg)) {
      problems.push(`${configFile} creates the plugin but never wraps the config with it (export default withNextIntl(nextConfig))`);
    }
  }

  if (!hasIn('messages')) {
    problems.push('messages/ missing — copy assets/messages/ (every project, not just th+en)');
  } else if (!readdirSync(has('messages') ? p('messages') : p('src', 'messages')).some((f) => f.endsWith('.th.ts'))) {
    problems.push('messages/ holds no *.th.ts catalog');
  }

  if (!hasIn('app', 'layout.tsx')) {
    problems.push('No app/layout.tsx');
  } else if (!/NextIntlClientProvider/.test(readIn('app', 'layout.tsx'))) {
    problems.push('app/layout.tsx has no NextIntlClientProvider — useTranslations throws in every Client Component');
  }

  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('i18n catalogs consistent (delegates to check-i18n.mjs)', () => {
  const script = join(import.meta.dirname, 'check-i18n.mjs');
  const r = spawnSync(process.execPath, [script, ROOT], { encoding: 'utf8' });
  return r.status === 0
    ? { ok: true }
    : { ok: false, msg: (r.stdout + r.stderr).trim().split('\n').slice(-3).join(' · ') };
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
