#!/usr/bin/env node
// ตรวจชั้น harness ที่ ugt-setup ติดตั้ง (CLAUDE.md / rules / state / settings)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// ยึด process.cwd() เป็น root ของโปรเจค — ไฟล์ที่ควรมีแต่หาไม่เจอ = FAIL ไม่ใช่ผ่าน
import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

// ── CLAUDE.md ──────────────────────────────────────────────────────────────
const claudeMd = has('CLAUDE.md') ? read('CLAUDE.md') : has('.claude/CLAUDE.md') ? read('.claude/CLAUDE.md') : null;

check('CLAUDE.md มีบล็อกของ ugt', () => {
  if (claudeMd === null) return { ok: false, msg: 'ไม่มี CLAUDE.md — ความรู้จะหายทุกครั้งที่จบ session' };
  const start = claudeMd.includes('<!-- ugt:start');
  const end = claudeMd.includes('<!-- ugt:end');
  if (!start || !end) {
    return { ok: false, msg: 'ไม่มี marker ugt:start/ugt:end ครบคู่ — `/plugin update` จะอัปเดตบล็อกนี้ไม่ได้' };
  }
  return { ok: true };
});

check('CLAUDE.md ไม่ยาวเกิน 200 บรรทัด', () => {
  if (claudeMd === null) return { ok: false, msg: 'ไม่มี CLAUDE.md' };
  const lines = claudeMd.split('\n').length;
  if (lines > 200) {
    return { ok: false, msg: `${lines} บรรทัด — ยาวเกินเป้า 200 ทำให้ Claude ทำตามน้อยลง ย้ายกฎที่ผูกกับ path ไป .claude/rules/` };
  }
  return lines > 160 ? { ok: 'warn', msg: `${lines} บรรทัด — ใกล้เพดาน 200` } : { ok: true };
});

check('CLAUDE.md import state ของทีม', () => {
  if (claudeMd === null) return { ok: false, msg: 'ไม่มี CLAUDE.md' };
  return /@\.claude\/state\/checkpoint\.md/.test(claudeMd)
    ? { ok: true }
    : { ok: false, msg: 'ไม่มี `@.claude/state/checkpoint.md` — session หน้าจะไม่เห็น state ของทีม' };
});

check('ไม่เหลือ placeholder <...> ใน CLAUDE.md', () => {
  if (claudeMd === null) return { ok: false, msg: 'ไม่มี CLAUDE.md' };
  const hits = [...new Set([...claudeMd.matchAll(/<(project-name|base-path-prod|base-path-dev|org)>/g)].map((m) => m[0]))];
  return hits.length ? { ok: false, msg: `ยังไม่แทนค่า: ${hits.join(', ')}` } : { ok: true };
});

// ── .claude/rules ──────────────────────────────────────────────────────────
check('rules ที่มีอยู่ประกาศ paths frontmatter ถูก', () => {
  if (!has('.claude/rules')) return { ok: 'warn', msg: 'ไม่มี .claude/rules/ (ไม่ได้ติดตั้ง module ใดเลย?)' };
  const files = readdirSync(p('.claude/rules')).filter((f) => f.endsWith('.md'));
  if (!files.length) return { ok: 'warn', msg: '.claude/rules/ ว่าง' };
  const bad = [];
  for (const f of files) {
    const body = read('.claude/rules', f);
    if (!body.startsWith('---')) {
      bad.push(`${f} (ไม่มี frontmatter → โหลดทุก session แทนที่จะโหลดตาม path)`);
      continue;
    }
    const fm = body.slice(3, body.indexOf('---', 3));
    if (!/paths\s*:/.test(fm)) bad.push(`${f} (frontmatter ไม่มี paths)`);
  }
  return bad.length ? { ok: false, msg: bad.join(' · ') } : { ok: true, msg: `พบ ${files.length} ไฟล์` };
});

check('rules ของ module ที่ติดตั้งมีครบ', () => {
  const pkg = has('package.json') ? JSON.parse(read('package.json')) : null;
  if (!pkg) return { ok: false, msg: 'ไม่มี package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const expected = [];
  if (deps.prisma || deps['@prisma/client']) expected.push('ugt-database.md');
  if (deps['better-auth']) expected.push('ugt-auth.md');
  if (has('Jenkinsfile')) expected.push('ugt-ci.md');
  const missing = expected.filter((f) => !has('.claude/rules', f));
  return missing.length
    ? { ok: false, msg: `ติดตั้ง module แล้วแต่ไม่มี rules: ${missing.join(', ')} — กฎจะไม่ถูกโหลดตอนแก้ไฟล์` }
    : { ok: true };
});

// ── .claude/state ──────────────────────────────────────────────────────────
check('state ของทีมมีครบ 2 ไฟล์', () => {
  const missing = ['checkpoint.md', 'project-notes.md'].filter((f) => !has('.claude/state', f));
  return missing.length
    ? { ok: false, msg: `ไม่มี .claude/state/${missing.join(', ')}` }
    : { ok: true };
});

check('checkpoint.md มีหัวข้อครบและอัปเดตแล้ว', () => {
  if (!has('.claude/state/checkpoint.md')) return { ok: false, msg: 'ไม่มี checkpoint.md' };
  const body = read('.claude/state/checkpoint.md');
  const needed = ['## กำลังทำ', '## เสร็จแล้ว', '## ต้องทำต่อ', '## Decision'];
  const missing = needed.filter((h) => !body.includes(h));
  if (missing.length) return { ok: false, msg: `ขาดหัวข้อ: ${missing.join(', ')}` };
  return /<YYYY-MM-DD>/.test(body)
    ? { ok: false, msg: 'ยังมี <YYYY-MM-DD> ที่ไม่ได้แทนค่า — แปลว่ายังไม่เคยอัปเดตจริง' }
    : { ok: true };
});

check('project-notes.md มี 3 หัวข้อตายตัว', () => {
  if (!has('.claude/state/project-notes.md')) return { ok: false, msg: 'ไม่มี project-notes.md' };
  const body = read('.claude/state/project-notes.md');
  const needed = ['## Error Patterns', '## Deviations', '## Open Questions'];
  const missing = needed.filter((h) => !body.includes(h));
  return missing.length ? { ok: false, msg: `ขาดหัวข้อ: ${missing.join(', ')}` } : { ok: true };
});

check('state ไม่มี secret หลุด', () => {
  const suspicious = /(password|secret|client_secret|api[_-]?key|bearer)\s*[=:]\s*\S{8,}/i;
  const bad = [];
  for (const f of ['checkpoint.md', 'project-notes.md']) {
    if (!has('.claude/state', f)) continue;
    if (suspicious.test(read('.claude/state', f))) bad.push(f);
  }
  return bad.length
    ? { ok: false, msg: `${bad.join(', ')} อาจมี secret — ไฟล์เหล่านี้ถูก commit` }
    : { ok: true };
});

// ── settings / gitignore ───────────────────────────────────────────────────
check('.claude/settings.json ประกาศ marketplace + plugin', () => {
  if (!has('.claude/settings.json')) {
    return { ok: false, msg: 'ไม่มี .claude/settings.json — คน clone repo จะไม่ถูกชวนติดตั้ง plugin' };
  }
  let s;
  try {
    s = JSON.parse(read('.claude/settings.json'));
  } catch (error) {
    return { ok: false, msg: `JSON พัง: ${error.message}` };
  }
  const problems = [];
  if (!s.extraKnownMarketplaces) problems.push('ไม่มี extraKnownMarketplaces');
  if (!s.enabledPlugins) problems.push('ไม่มี enabledPlugins');
  const raw = JSON.stringify(s);
  if (raw.includes('<org>')) problems.push('ยังไม่แทน <org> ด้วย GitHub org จริง');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('.gitignore: ignore logs แต่ commit state', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'ไม่มี .gitignore' };
  const ig = read('.gitignore');
  const problems = [];
  if (!/\.claude\/logs/.test(ig)) problems.push('ไม่ ignore .claude/logs/ (audit log จะถูก commit)');
  if (/^\.claude\/?\s*$/m.test(ig)) {
    problems.push('ignore .claude/ ทั้งโฟลเดอร์ → state และ rules ของทีมจะไม่ถูก commit');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── รายงาน ────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-setup — verify (ชั้น harness)\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} ผ่าน · ${warned} เตือน · ${failed} ไม่ผ่าน\n` +
    'อย่าลืมรัน verify.mjs ของทุก module ที่ติดตั้งด้วย (database / quality / auth / cicd)\n'
);
process.exit(failed > 0 ? 1 : 0);
