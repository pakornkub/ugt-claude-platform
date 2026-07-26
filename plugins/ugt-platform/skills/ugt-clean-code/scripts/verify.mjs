#!/usr/bin/env node
// Pre-commit checklist ของ ugt-clean-code ในรูปแบบที่รันได้
//
//   node <path-to-skill>/scripts/verify.mjs          ← ตรวจเฉพาะไฟล์ที่แก้ (ตรงกับที่ gate วัด)
//   node <path-to-skill>/scripts/verify.mjs --all    ← ตรวจทั้งโปรเจค
//
// Quality Gate วัดบน **new code** เท่านั้น ดังนั้น default จึงตรวจเฉพาะไฟล์ที่เปลี่ยน
// เทียบกับ HEAD (staged + unstaged + untracked) — สแกนทั้งโปรเจคจะได้กำแพง violation
// ของโค้ดเก่าที่ gate ไม่นับ
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ALL = process.argv.includes('--all');
const isSource = (f) => /\.(ts|tsx)$/.test(f) && !/\.d\.ts$/.test(f);

function walkAll() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', 'generated', '.claude']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (isSource(entry)) out.push(full);
    }
  };
  walk(ROOT);
  return out;
}

function changedFiles() {
  try {
    const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    const tracked = git('diff', '--name-only', 'HEAD').split('\n');
    const untracked = git('ls-files', '--others', '--exclude-standard').split('\n');
    return [...new Set([...tracked, ...untracked])]
      .map((f) => f.trim())
      .filter((f) => f && isSource(f))
      .map((f) => join(ROOT, f))
      .filter((f) => existsSync(f));
  } catch {
    return null;
  }
}

let files;
let scope;
if (ALL) {
  files = walkAll();
  scope = `ทั้งโปรเจค (${files.length} ไฟล์)`;
} else {
  const changed = changedFiles();
  if (changed === null) {
    files = walkAll();
    scope = `ทั้งโปรเจค (${files.length} ไฟล์) — ไม่ใช่ git repo จึงเทียบ HEAD ไม่ได้`;
  } else {
    files = changed;
    scope = `ไฟล์ที่แก้เทียบ HEAD (${files.length} ไฟล์) — ใช้ --all เพื่อสแกนทั้งโปรเจค`;
  }
}

/** ตัดคอมเมนต์ออกก่อน scan (แต่เก็บบรรทัดไว้เพื่อรายงานเลขบรรทัดถูก) */
const stripComments = (line) => line.replace(/\/\/.*$/, '');

const RULES = [
  {
    id: 'S7773',
    name: 'parseInt / parseFloat ต้องเรียกผ่าน Number.',
    test: (l) => /(?<!Number\.)\bparse(Int|Float)\s*\(/.test(l),
    fix: 'Number.parseInt(v, 10) / Number.parseFloat(v)',
  },
  {
    id: 'S7781',
    name: '.replace() ที่ใช้ regex /g ต้องเป็น .replaceAll()',
    test: (l) => /\.replace\s*\(\s*\/[^/\n]+\/[a-z]*g/.test(l),
    fix: "str.replaceAll('x', 'y')",
  },
  {
    id: 'S7741/S7764',
    name: "typeof … 'undefined'",
    test: (l) => /typeof\s+[\w.]+\s*[!=]==?\s*['"]undefined['"]/.test(l),
    fix: "x === undefined · globalThis.window !== undefined (แทน typeof window !== 'undefined')",
  },
  {
    id: 'S7755',
    name: 'arr[arr.length - 1] ต้องเป็น arr.at(-1)',
    test: (l) => /(\w+)\s*\[\s*\1\s*\.length\s*-\s*1\s*\]/.test(l),
    fix: 'arr.at(-1)',
  },
  {
    id: 'S7718',
    name: "catch (e) / catch (err) — ต้องเป็น error หรือ error_",
    test: (l) => /catch\s*\(\s*(e|err)\s*\)/.test(l),
    fix: 'catch (error) หรือ catch (error_)',
  },
  {
    id: 'NOSONAR',
    name: 'NOSONAR ใน JSX block comment (ไม่ suppress อะไรเลย)',
    test: (l) => /\{\s*\/\*[^*]*NOSONAR/.test(l),
    fix: 'ย้ายไปเป็น // NOSONAR บนบรรทัดเดียวกับโค้ดที่ถูก flag',
    noStrip: true,
  },
  {
    id: 'NOSONAR',
    name: 'NOSONAR อยู่บรรทัดเดียวลอย ๆ (ต้องอยู่บรรทัดเดียวกับโค้ด)',
    test: (l) => /^\s*\/\/\s*NOSONAR/.test(l),
    fix: 'ย้ายไปต่อท้ายบรรทัดของโค้ดที่ SonarQube รายงาน',
    noStrip: true,
  },
];

const findings = new Map();
const dupImports = [];
let readonlyWarn = 0;

for (const file of files) {
  const body = readFileSync(file, 'utf8');
  const lines = body.split('\n');
  const rel = relative(ROOT, file).split('\\').join('/');

  lines.forEach((raw, i) => {
    for (const rule of RULES) {
      const line = rule.noStrip ? raw : stripComments(raw);
      if (rule.test(line)) {
        const key = `${rule.id} — ${rule.name}`;
        if (!findings.has(key)) findings.set(key, { fix: rule.fix, hits: [] });
        findings.get(key).hits.push(`${rel}:${i + 1}`);
      }
    }
  });

  // S3863 — import ซ้ำจาก module เดียวกัน
  const modules = [...body.matchAll(/^\s*import\s[^'"]*from\s*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  const seen = new Set();
  for (const m of modules) {
    if (seen.has(m)) dupImports.push(`${rel} (${m})`);
    seen.add(m);
  }

  // S6759 — prop type ของ component ควรครอบ Readonly<> (heuristic → warn)
  if (file.endsWith('.tsx')) {
    const propTypes = [...body.matchAll(/\}\s*:\s*(?!Readonly<)([A-Z]\w*Props)\b/g)];
    readonlyWarn += propTypes.length;
  }
}

// ── รายงาน ────────────────────────────────────────────────────────────────
console.log(`\nugt-clean-code — verify\nขอบเขต: ${scope}\n`);

let failed = 0;
if (files.length === 0) {
  console.log('  (ไม่มีไฟล์ .ts/.tsx ที่ต้องตรวจ)\n');
} else {
  for (const [name, { fix, hits }] of findings) {
    failed++;
    console.log(`  ✘ ${name} — ${hits.length} จุด`);
    for (const h of hits.slice(0, 8)) console.log(`      ${h}`);
    if (hits.length > 8) console.log(`      … อีก ${hits.length - 8} จุด`);
    console.log(`      แก้เป็น: ${fix}`);
  }
  if (dupImports.length) {
    failed++;
    console.log(`  ✘ S3863 — import ซ้ำจาก module เดียวกัน (${dupImports.length} จุด)`);
    for (const d of dupImports.slice(0, 8)) console.log(`      ${d}`);
    console.log('      แก้เป็น: รวมเป็น import statement เดียว');
  }
  if (readonlyWarn) {
    console.log(`  ! S6759 — พบ prop type ที่ยังไม่ครอบ Readonly<> ประมาณ ${readonlyWarn} จุด`);
    console.log('      ตรวจด้วยตา: prop type ของ function component ทุกตัวต้องเป็น Readonly<…>');
  }
  if (!failed) console.log('  ✔ ไม่พบ idiom ที่ SonarQube flag ในขอบเขตที่ตรวจ');
}

console.log(
  `\n${failed} กลุ่มปัญหา\n` +
    'ตรวจด้วยเครื่องไม่ได้: duplication ≥ 10 บรรทัด (ให้ scanner จริงบอก) · cognitive complexity ≤ 15 ·\n' +
    'coverage ของโค้ดใหม่ ≥ 60% · ทุก suppression ต้องมี rationale comment\n'
);
process.exit(failed > 0 ? 1 : 0);
