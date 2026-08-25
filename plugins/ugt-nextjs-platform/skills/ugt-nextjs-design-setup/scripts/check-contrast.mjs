#!/usr/bin/env node
// WCAG AA contrast check over the org token pairs in app/globals.css.
//
//   node <path-to-skill>/scripts/check-contrast.mjs
//
// Run after generating tokens and after ANY color edit (contract rule).
// Checks both :root and .dark. Exit 1 on any pair < 4.5:1.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// src/ layouts move app/ wholesale under src/ — the same support verify.mjs
// and check-i18n.mjs have. Root-only lookup here threw ENOENT on exactly those
// projects, so the close-out gate could never pass on a src/ project.
const ROOT = process.cwd();
const CSS_FILE = [join(ROOT, 'app', 'globals.css'), join(ROOT, 'src', 'app', 'globals.css')].find((f) =>
  existsSync(f),
);
if (!CSS_FILE) {
  console.error(
    '✘ globals.css not found at app/globals.css or src/app/globals.css\n' +
      `      cwd must be the project root (currently: ${ROOT})\n` +
      '      if the file is missing entirely, install the tokens first (assets/globals.tokens.css)',
  );
  process.exit(1);
}
const css = readFileSync(CSS_FILE, 'utf8');

// ── parse token blocks ─────────────────────────────────────────────────────
function block(selector) {
  const re = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 's');
  const m = re.exec(css);
  if (!m) return null;
  const vars = {};
  for (const [, name, value] of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    vars[name] = value.trim();
  }
  return vars;
}

// ── color math ─────────────────────────────────────────────────────────────
// oklch → linear sRGB (standard OKLab matrices)
function oklchToLinearRgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, c)));
}
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const degamma = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

// value string → { rgb: gamma-encoded [r,g,b] 0..1, alpha }
function parse(value) {
  let m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)%?)?\s*\)/.exec(value);
  if (m) {
    const lin = oklchToLinearRgb(+m[1], +m[2], +m[3]);
    const alpha = m[4] === undefined ? 1 : +m[4] / (value.includes('%') ? 100 : 1);
    return { rgb: lin.map(gamma), alpha };
  }
  m = /#([0-9a-f]{6})\b/i.exec(value);
  if (m) {
    const n = parseInt(m[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255), alpha: 1 };
  }
  return null; // var() refs / named colors — caller skips
}

// CSS-style alpha blend in gamma space
const blend = (fg, bg) => fg.rgb.map((c, i) => c * fg.alpha + bg.rgb[i] * (1 - fg.alpha));
const luminance = ([r, g, b]) => 0.2126 * degamma(r) + 0.7152 * degamma(g) + 0.0722 * degamma(b);
function ratio(rgbA, rgbB) {
  const [hi, lo] = [luminance(rgbA), luminance(rgbB)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ── the pairs the org standard guarantees (text on surface) ────────────────
const PAIRS = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['sidebar-foreground', 'sidebar'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
];
const STATUS = ['amber', 'emerald', 'red', 'coral', 'sky', 'gray'];
const AA = 4.5;

let failed = 0;
for (const scope of [':root', '\\.dark']) {
  const vars = block(scope);
  const label = scope === ':root' ? 'light' : 'dark';
  if (!vars) {
    console.log(`✘ [${label}] token block not found`);
    failed++;
    continue;
  }
  console.log(`\n— ${label} —`);
  const get = (name) => (vars[name] ? parse(vars[name]) : null);

  for (const [fg, bg] of PAIRS) {
    const f = get(fg);
    const b = get(bg);
    if (!f || !b) {
      console.log(`  ! ${fg} / ${bg} — unparseable or missing, check manually`);
      continue;
    }
    const r = ratio(f.rgb, b.rgb);
    const ok = r >= AA;
    if (!ok) failed++;
    console.log(`  ${ok ? '✔' : '✘'} ${fg} on ${bg}: ${r.toFixed(2)}:1`);
  }

  // StatusBadge formula: text-status-x-foreground on bg-status-x/10 over card
  const card = get('card');
  for (const s of STATUS) {
    const text = get(`status-${s}-foreground`);
    const tone = get(`status-${s}`);
    if (!text || !tone || !card) {
      console.log(`  ! status-${s} — missing token(s)`);
      failed++;
      continue;
    }
    const badgeBg = blend({ rgb: tone.rgb, alpha: 0.1 }, card);
    const r = ratio(text.rgb, badgeBg);
    const ok = r >= AA;
    if (!ok) failed++;
    console.log(`  ${ok ? '✔' : '✘'} status-${s}-foreground on badge bg (10% over card): ${r.toFixed(2)}:1`);
  }
}

console.log(failed ? `\n${failed} pair(s) below ${AA}:1 — fix before closing\n` : `\nAll pairs pass WCAG AA (≥ ${AA}:1)\n`);
process.exit(failed ? 1 : 0);
