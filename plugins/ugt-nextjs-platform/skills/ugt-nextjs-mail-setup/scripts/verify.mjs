#!/usr/bin/env node
// Runnable version of the ugt-nextjs-mail-setup verification checklist.
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root. A file that should exist but
// can't be found is a FAIL, never a pass.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const results = [];
const p = (...s) => join(ROOT, ...s);
const has = (...s) => existsSync(p(...s));
const read = (...s) => readFileSync(p(...s), 'utf8');

function check(name, fn) {
  try {
    results.push({ name, ...(fn() ?? { ok: true }) });
  } catch (error) {
    results.push({ name, ok: false, msg: error.message });
  }
}

function sourceFiles() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', '.claude']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
  };
  for (const d of ['app', 'components', 'lib', 'src']) if (has(d)) walk(p(d));
  return out;
}

// ── files ──────────────────────────────────────────────────────────────────
// messages/ catalogs are REQUIRED, not optional: mail-templates-manager.tsx
// calls useTranslations('mail') unconditionally — without the catalog the
// admin page renders raw key paths (and only design-setup's check-i18n.mjs
// would have caught it, a separate manual step).
const REQUIRED = [
  'lib/email.ts',
  'lib/mail-templates.ts',
  'lib/types/mail-templates.ts',
  'messages/mail.th.ts',
  'messages/mail.en.ts',
];
check('Core files present', () => {
  const missing = REQUIRED.filter((f) => !has(f));
  return missing.length ? { ok: false, msg: `Missing: ${missing.join(', ')}` } : { ok: true };
});

// ── placeholders ───────────────────────────────────────────────────────────
check('No __*__ placeholders left', () => {
  const found = [];
  for (const f of [...REQUIRED, '.env.example']) {
    if (!has(f)) continue;
    const hits = [...new Set([...read(f).matchAll(/__[A-Z][A-Z0-9_]*__/g)].map((m) => m[0]))];
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

// ── the localhost:25 trap ──────────────────────────────────────────────────
check('sendMail fails fast without SMTP_HOST', () => {
  if (!has('lib/email.ts')) return { ok: false, msg: 'No lib/email.ts' };
  const body = read('lib/email.ts');
  return /if\s*\(!env\.SMTP_HOST\)[\s\S]{0,120}throw/.test(body)
    ? { ok: true }
    : { ok: false, msg: 'no guard throwing when SMTP_HOST is unset — nodemailer would fall back to localhost:25 and mail would vanish silently' };
});

check('env schema declares the SMTP vars', () => {
  if (!has('lib/env.ts')) return { ok: false, msg: 'No lib/env.ts' };
  const body = read('lib/env.ts');
  const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_FROM'].filter((v) => !body.includes(v));
  return missing.length ? { ok: false, msg: `lib/env.ts missing: ${missing.join(', ')}` } : { ok: true };
});

// ── dev mode ───────────────────────────────────────────────────────────────
check('Dev mode is wired (redirect + banner + [DEV] subject)', () => {
  if (!has('lib/email.ts')) return { ok: false, msg: 'No lib/email.ts' };
  const body = read('lib/email.ts');
  const problems = [];
  if (!/hasDevMode/.test(body)) problems.push('no hasDevMode branch');
  if (!/\[DEV\]/.test(body)) problems.push('subject is not prefixed with [DEV]');
  if (!/buildDevBanner/.test(body)) problems.push('no disclosure banner');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('dev-mode:enable exists in the permission list', () => {
  if (!has('lib/permissions.ts')) return { ok: 'warn', msg: 'No lib/permissions.ts — install ugt-nextjs-auth-setup first' };
  return /dev-mode:enable/.test(read('lib/permissions.ts'))
    ? { ok: true }
    : { ok: false, msg: "lib/permissions.ts has no 'dev-mode:enable' — dev mode can never be granted, so testers will mail real recipients" };
});

check('Every sendTemplatedMail call passes an actor', () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file).split('\\').join('/');
    for (const m of body.matchAll(/sendTemplatedMail\s*\(\s*\{/g)) {
      // scan the object literal that follows, roughly to its closing brace
      const chunk = body.slice(m.index, m.index + 1200);
      if (!/\bactor\s*:/.test(chunk)) {
        offenders.push(`${rel}:${body.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  return offenders.length
    ? { ok: false, msg: `no \`actor\`: ${offenders.slice(0, 5).join(' · ')} — dev mode silently off, testers mail real people` }
    : { ok: true };
});

// ── escaping ───────────────────────────────────────────────────────────────
check('Body substitution escapes by default', () => {
  if (!has('lib/mail-templates.ts')) return { ok: false, msg: 'No lib/mail-templates.ts' };
  const body = read('lib/mail-templates.ts');
  return /escapeHtml/.test(body) && /substitute\([^)]*true/.test(body.replace(/\s+/g, ' '))
    ? { ok: true }
    : { ok: 'warn', msg: 'could not confirm the HTML body is escaped — check substitute() is called with escape=true for html' };
});

check('htmlVariables holds no obviously user-typed token', () => {
  if (!has('lib/types/mail-templates.ts')) return { ok: false, msg: 'No lib/types/mail-templates.ts' };
  const body = read('lib/types/mail-templates.ts');
  const suspicious = /htmlVariables:\s*\[[^\]]*\b(reason|rejectReason|comment|note|remark|message|description)\b/i.exec(body);
  return suspicious
    ? { ok: false, msg: `htmlVariables contains a user-controlled token (${suspicious[1]}) — that value skips escaping and reaches the inbox as markup` }
    : { ok: true };
});

// ── template wiring ────────────────────────────────────────────────────────
check('Every key has a definition and a default', () => {
  if (!has('lib/types/mail-templates.ts')) return { ok: false, msg: 'No lib/types/mail-templates.ts' };
  const body = read('lib/types/mail-templates.ts');
  // anchor the end on `] as const`, not the first `]` — a comment inside the
  // array (e.g. a "[METHOD: …]" marker) would otherwise close the match early
  // and every key after it would vanish from this check without a word
  const keys = [...(body.match(/MAIL_TEMPLATE_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (!keys.length) return { ok: false, msg: 'MAIL_TEMPLATE_KEYS is empty or unreadable' };
  // anchor on the export statements — both names also appear in the header
  // comment, and slicing from the comment gives an empty range
  const defsAt = body.search(/export const MAIL_TEMPLATE_DEFINITIONS\b/);
  const defaultsAt = body.search(/export const DEFAULT_MAIL_TEMPLATES\b/);
  if (defsAt < 0 || defaultsAt < 0) {
    return { ok: false, msg: 'cannot find `export const MAIL_TEMPLATE_DEFINITIONS` / `DEFAULT_MAIL_TEMPLATES`' };
  }
  const defsBlock = body.slice(defsAt, defaultsAt);
  const defaultsBlock = body.slice(defaultsAt);
  const noDef = keys.filter((k) => !defsBlock.includes(`'${k}'`));
  const noDefault = keys.filter((k) => !defaultsBlock.includes(`'${k}'`));
  const problems = [];
  if (noDef.length) problems.push(`no definition: ${noDef.join(', ')}`);
  if (noDefault.length) problems.push(`no default template: ${noDefault.join(', ')}`);
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true, msg: `${keys.length} template key(s) wired` };
});

check('AppSettings model exists for template overrides', () => {
  if (!has('prisma/schema.prisma')) return { ok: false, msg: 'No prisma/schema.prisma' };
  const schema = read('prisma/schema.prisma');
  return /@@map\("AppSettings"\)/.test(schema)
    ? { ok: true }
    : { ok: false, msg: 'no AppSettings model — admin template overrides have nowhere to live; paste assets/prisma/schema-mail.prisma' };
});

// ── report ─────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-mail-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Then send one real email as a dev-mode user and one as a normal user — the rest of the checklist is by hand\n'
);
process.exit(failed > 0 ? 1 : 0);
