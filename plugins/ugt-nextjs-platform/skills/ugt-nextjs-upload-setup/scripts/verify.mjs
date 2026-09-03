#!/usr/bin/env node
// Runnable version of the ugt-nextjs-upload-setup checklist.
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd(). A file that should exist but can't be found is a
// FAIL, never a pass.
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

const UPLOAD = 'app/api/files/route.ts';
const DOWNLOAD = join('app', 'api', 'files', '[id]', 'route.ts');

// [SCAN] opt-out (SKILL.md §3 Q5): ไม่มี lib/virus-scan.ts + upload route ตั้ง
// scanStatus 'unscanned' = ตั้งใจถอด scan ครบชุด — ข้ามเช็คฝั่ง scanner แล้ว
// เช็คความสม่ำเสมอของโหมดแทน. เข้าเงื่อนไขครึ่งเดียว (แค่ไฟล์หาย) ยังนับเป็น
// การติดตั้งพัง ไม่ใช่ opt-out
const SCAN_OFF =
  !has('lib/virus-scan.ts') && has(UPLOAD) && /scanStatus:\s*'unscanned'/.test(read(UPLOAD));

// messages/ catalogs are REQUIRED, not optional: file-upload.tsx calls
// useTranslations('upload') unconditionally and translates the codes the
// route handlers return — without the catalog the widget renders raw key paths.
const REQUIRED = [
  'lib/storage.ts',
  ...(SCAN_OFF ? [] : ['lib/virus-scan.ts']),
  'lib/attachment-access.ts',
  // the widget is WHY the catalogs are required — so it is required too
  'components/file-upload.tsx',
  'messages/upload.th.ts',
  'messages/upload.en.ts',
  UPLOAD,
  DOWNLOAD,
];

check('Core files present', () => {
  const missing = REQUIRED.filter((f) => !has(f));
  return missing.length ? { ok: false, msg: `Missing: ${missing.join(', ')}` } : { ok: true };
});

if (SCAN_OFF) {
  check('[SCAN off] opt-out is consistent, deliberate, and recorded', () => {
    const problems = [];
    if (/\bscanBuffer\s*\(/.test(read(UPLOAD)))
      problems.push('upload route still calls scanBuffer but lib/virus-scan.ts is gone');
    if (has(DOWNLOAD) && /scanStatus\s*!==\s*'clean'/.test(read(DOWNLOAD)))
      problems.push("download guard still requires 'clean' — every 'unscanned' row answers 409; use === 'infected' (SKILL.md §3 Q5)");
    const arch = 'docs/project-context/architecture.md';
    if (!has(arch) || !/deviation[^\n]*(scan|สแกน)/i.test(read(arch)))
      problems.push(`no ⚠ deviation line about the missing virus scan in ${arch}`);
    return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
  });
} else {
  check('Scan happens BEFORE the file is written', () => {
    if (!has(UPLOAD)) return { ok: false, msg: `No ${UPLOAD}` };
    const body = read(UPLOAD);
    const scanAt = body.search(/\bscanBuffer\s*\(/);
    const writeAt = body.search(/\bwriteStoredFile\s*\(/);
    if (scanAt < 0) return { ok: false, msg: 'no scanBuffer call — uploads are not scanned at all' };
    if (writeAt < 0) return { ok: false, msg: 'no writeStoredFile call' };
    return scanAt < writeAt
      ? { ok: true }
      : { ok: false, msg: 'writeStoredFile runs before scanBuffer — an infected file reaches the volume before it is checked' };
  });

  check('Scanner failure fails closed', () => {
    if (!has(UPLOAD)) return { ok: false, msg: `No ${UPLOAD}` };
    const body = read(UPLOAD);
    const handlesError = /status\s*===\s*'error'/.test(body) || /scan\.status\s*!==\s*'clean'/.test(body);
    return handlesError
      ? { ok: true }
      : { ok: false, msg: "no branch for scan.status === 'error' — a scanner that is down would let files through unscanned" };
  });
}

check('Storage root is not public/', () => {
  const envFiles = ['.env.example', '.env.local'].filter((f) => has(f));
  if (!envFiles.length) return { ok: 'warn', msg: 'no .env.example / .env.local to inspect' };
  const bad = envFiles.filter((f) => /STORAGE_ROOT\s*=.*public/i.test(read(f)));
  return bad.length
    ? { ok: false, msg: `${bad.join(', ')}: STORAGE_ROOT points inside public/ — those files are served with no auth check` }
    : { ok: true };
});

check('Paths never come from the uploaded filename', () => {
  if (!has(UPLOAD)) return { ok: false, msg: `No ${UPLOAD}` };
  const body = read(UPLOAD);
  const usesGenerated = /newStorageKey\s*\(/.test(body);
  const suspicious = /(writeStoredFile|resolveStoragePath)\s*\([^)]*file\.name/.test(body);
  if (!usesGenerated) return { ok: false, msg: 'no newStorageKey() — the storage path is not generated' };
  return suspicious
    ? { ok: false, msg: 'a storage path is built from file.name — path traversal risk; keep the original name for display only' }
    : { ok: true };
});

check('Download route guards session + permission + record scope', () => {
  if (!has(DOWNLOAD)) return { ok: false, msg: `No ${DOWNLOAD}` };
  const body = read(DOWNLOAD);
  const problems = [];
  if (!/getSession/.test(body)) problems.push('no session check');
  if (!/getUserPermissions|PERMISSIONS\./.test(body)) problems.push('no permission check');
  if (!/canReadAttachment/.test(body)) problems.push('no per-record scope check');
  if (!/scanStatus/.test(body)) problems.push('does not require a clean scan status');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Download serves as an attachment, never inline', () => {
  if (!has(DOWNLOAD)) return { ok: false, msg: `No ${DOWNLOAD}` };
  const body = read(DOWNLOAD);
  const problems = [];
  if (!/Content-Disposition['"]?\s*:\s*[`'"]attachment/.test(body)) problems.push('Content-Disposition is not `attachment`');
  if (!/application\/octet-stream/.test(body)) problems.push('Content-Type is not application/octet-stream');
  if (!/nosniff/.test(body)) problems.push('missing X-Content-Type-Options: nosniff');
  return problems.length
    ? { ok: false, msg: `${problems.join(' · ')} — an uploaded .svg/.html would run as script on this domain` }
    : { ok: true };
});

check('Forbidden and missing both answer 404', () => {
  if (!has(DOWNLOAD)) return { ok: false, msg: `No ${DOWNLOAD}` };
  const body = read(DOWNLOAD);
  return /canReadAttachment[\s\S]{0,400}status:\s*404/.test(body)
    ? { ok: true }
    : { ok: 'warn', msg: 'could not confirm the scope failure returns 404 — a 403 confirms the id exists to someone who may not see it' };
});

check('canReadAttachment is implemented, not left denying everything', () => {
  if (!has('lib/attachment-access.ts')) return { ok: false, msg: 'No lib/attachment-access.ts' };
  const body = read('lib/attachment-access.ts');
  const live = body
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join('\n');
  // The skeleton's only statement is `return false` — an implementation is any
  // return of something else (switch/case, if/else, or a one-line boolean
  // expression all qualify; requiring a `case` literal false-failed valid rules).
  return /return\s+(?!false\b)\S/.test(live)
    ? { ok: true }
    : { ok: false, msg: 'still the deny-all skeleton (every return is `return false`) — every download 404s until the project rule is written' };
});

check('Upload is a Route Handler, not a Server Action', () => {
  // Sweep every action file, not a hardcoded pair — a file-accepting Server
  // Action under any name (or a src/ layout, or colocated app/**/actions.ts)
  // has the same 1 MB bodySizeLimit trap. `formData` alone is NOT the signal
  // (ordinary form actions use it legitimately) — the signal is the File TYPE
  // appearing in code. Strip comments AND string literals first: an error
  // message like 'File not found' must never trip a type detector.
  const stripNoise = (s) =>
    s
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
      .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
      .replace(/`(?:\\.|[^`\\])*`/g, '``');
  const offenders = [];
  const inspect = (full) => {
    const raw = readFileSync(full, 'utf8');
    // the directive itself lives in a string — test it on the RAW text, either quote style
    if (!/['"]use server['"]/.test(raw)) return;
    const body = stripNoise(raw);
    if (/\bFile\b|instanceof\s+File|\.arrayBuffer\s*\(/.test(body)) {
      offenders.push(relative(ROOT, full).split('\\').join('/'));
    }
  };
  for (const dir of ['lib/actions', 'src/lib/actions'].filter((d) => has(d))) {
    const walk = (abs) => {
      for (const entry of readdirSync(abs)) {
        const full = join(abs, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry)) inspect(full);
      }
    };
    walk(p(dir));
  }
  // colocated Server Actions (legal Next.js): app/**/actions.ts(x)
  for (const dir of ['app', 'src/app'].filter((d) => has(d))) {
    const walk = (abs) => {
      for (const entry of readdirSync(abs)) {
        const full = join(abs, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (/^actions\.tsx?$/.test(entry)) inspect(full);
      }
    };
    walk(p(dir));
  }
  return offenders.length
    ? { ok: false, msg: `${offenders.join(', ')} takes a file in a Server Action — bodySizeLimit caps it at 1 MB with an opaque error; use the Route Handler` }
    : { ok: true };
});

check('Attachments model exists with soft-delete columns', () => {
  if (!has('prisma/schema.prisma')) return { ok: false, msg: 'No prisma/schema.prisma' };
  const schema = read('prisma/schema.prisma');
  if (!/@@map\("Attachments"\)/.test(schema)) {
    return { ok: false, msg: 'no Attachments model — paste assets/prisma/schema-attachment.prisma' };
  }
  const missing = ['IsDeleted', 'StorageKey', 'ScanStatus'].filter((c) => !schema.includes(c));
  return missing.length ? { ok: false, msg: `Attachments missing: ${missing.join(', ')}` } : { ok: true };
});

check('Upload/download permissions declared', () => {
  if (!has('lib/permissions.ts')) return { ok: 'warn', msg: 'No lib/permissions.ts — install ugt-nextjs-auth-setup first' };
  const body = read('lib/permissions.ts');
  const missing = ['files:create', 'files:read'].filter((k) => !body.includes(k));
  return missing.length ? { ok: false, msg: `lib/permissions.ts missing: ${missing.join(', ')}` } : { ok: true };
});

check('Compose mounts a storage volume and runs the scanner', () => {
  const files = ['docker-compose.yml', 'docker-compose.dev.yml'].filter((f) => has(f));
  if (!files.length) return { ok: 'warn', msg: 'no compose files — install ugt-nextjs-cicd-setup first' };
  const problems = [];
  for (const f of files) {
    const body = read(f);
    if (!/\/app\/storage/.test(body)) problems.push(`${f}: no volume mounted at /app/storage — uploads vanish on redeploy`);
    if (!SCAN_OFF && !/clamav/.test(body)) problems.push(`${f}: no clamav service — uploads will fail closed`);
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Storage binds under /home/docker02/appdata (no named volume) + no __*__ left', () => {
  // cicd contract §2.8: persistent data = bind mounts under /home/docker02/appdata —
  // named volume มองไม่เห็นจาก host และ backup ขององค์กรกวาดไม่ถึง
  const files = ['docker-compose.yml', 'docker-compose.dev.yml'].filter((f) => has(f));
  if (!files.length) return { ok: 'warn', msg: 'no compose files yet — apply the snippet after cicd-setup' };
  const problems = [];
  for (const f of files) {
    const body = read(f);
    if (/^\s*-\s*[\w-]+:\/app\/storage/m.test(body)) {
      problems.push(`${f}: /app/storage mounts a NAMED volume — must be a /home/docker02/appdata bind (cicd §2.8)`);
    }
    const hits = [...new Set(body.match(/__[A-Z][A-Z0-9_]*__/g) ?? [])];
    if (hits.length) problems.push(`${f}: placeholders left: ${hits.join(', ')}`);
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Admin handoff covers the storage-dir backup', () => {
  if (!has('docs/admin-handoff.md')) {
    return { ok: false, msg: 'docs/admin-handoff.md missing the upload section — §4.5 appends it; the storage dir will have no backup job' };
  }
  const body = read('docs/admin-handoff.md');
  return /storage|ไฟล์แนบ/.test(body) && /backup|สำรอง/i.test(body)
    ? { ok: true }
    : { ok: false, msg: 'docs/admin-handoff.md never mentions backing up the storage dir — the only copy of every attachment' };
});

check('Attachment linking pattern recorded in decisions.md', () => {
  if (!has('docs/project-context/decisions.md')) {
    return { ok: 'warn', msg: 'no docs/project-context/decisions.md — run ugt-context, then record the §3 Q2 linking choice' };
  }
  return /attachment|entityType|Attachments|ไฟล์แนบ/i.test(read('docs/project-context/decisions.md'))
    ? { ok: true }
    : { ok: false, msg: 'the attachment→record linking choice (§3 Q2) is not recorded in decisions.md' };
});

const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-upload-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Then run the EICAR upload and the scanner-down test by hand — those are the ones that prove it\n'
);
process.exit(failed > 0 ? 1 : 0);
