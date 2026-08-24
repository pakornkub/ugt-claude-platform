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
  const files = readdirSync(dir);
  const byNamespace = new Map();
  for (const f of files) {
    const m = /^(.+)\.(th|en)\.ts$/.exec(f);
    if (!m) continue;
    const [, ns, locale] = m;
    if (!byNamespace.has(ns)) byNamespace.set(ns, {});
    byNamespace.get(ns)[locale] = keyPaths(loadCatalog(join(dir, f)));
  }
  // An empty match set is not "nothing to compare" — it means messages/ holds
  // something the gate can't read (e.g. a project ported from th.json/en.json
  // instead of converting to the kit's <namespace>.(th|en).ts shape), which is
  // exactly the drift this gate exists to catch. Silently passing an empty
  // loop here previously gave a green check on a catalog with 0 real keys.
  if (byNamespace.size === 0) {
    return {
      ok: false,
      msg: `messages/ has ${files.length} file(s) but none match <namespace>.(th|en).ts — kit catalogs must be .ts, not .json (found: ${files.join(', ') || '(empty dir)'})`,
    };
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
// …while these ship only when the project needs them — for two different
// reasons, both valid: (1) a design-setup feature wasn't selected (export-menu
// needs Excel export, tiptap-editor needs rich text, date-picker when dates are
// picked), or (2) the whole skill that owns the file isn't installed at all
// (a th+en project may not have ugt-nextjs-auth-setup installed). Either way,
// absence is a valid state, not a failure.
const OPTIONAL_CONVERTED_FILES = [
  'ui/export-menu.tsx', 'ui/date-picker.tsx', 'ui/tiptap-editor.tsx',
  // ugt-nextjs-auth-setup (phase 2, 2026-08-24) — optional because a th+en
  // project may not have auth-setup installed at all.
  'components/login-form.tsx',
  'components/roles-manager.tsx',
  'components/admin-user-actions.tsx',
  'components/audit-logs-table.tsx',
  'components/forgot-password-dialog.tsx',
  'components/change-password-dialog.tsx',
  'components/reset-password-form.tsx',
  'components/role-form.tsx',
  'components/users-table.tsx',
  'components/admin-setup-form.tsx',
  'components/nav-user.tsx',
  'components/admin-nav.tsx',
  'components/user-role-select.tsx',
  'lib/password-policy.ts',
  'lib/actions/auth.ts',
  'lib/actions/admin-setup.ts',
  'lib/actions/admin-users.ts',
  'lib/actions/admin-roles.ts',
  'lib/actions/password.ts',
  'app/(admin)/admin/users/page.tsx',
  'app/(admin)/admin/audit-logs/page.tsx',
  // ugt-nextjs-mail-setup (phase 3, 2026-08-24) — optional, same reason.
  // lib/types/mail-templates.ts is intentionally NOT listed here: it holds
  // email BODY content (GREETING, EMAIL_FOOTER, heading, previewSample,
  // DEFAULT_MAIL_TEMPLATES) that stays Thai until a `locale` column exists
  // on `user` (spec มติ 2.3) — adding it would make this gate permanently red.
  'components/mail-templates-manager.tsx',
  'app/(admin)/admin/mail-templates/page.tsx',
  'lib/actions/admin-mail-templates.ts',
  // ugt-nextjs-upload-setup (phase 3, 2026-08-24) — optional, same reason.
  'components/file-upload.tsx',
  'app/api/files/route.ts',
  'app/api/files/[id]/route.ts',
];
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
// while a dev-time run against `assets/` sees it at `ui/`. Resolve either shape,
// plus the same two shapes again under `src/` — some Next.js scaffolds default
// to a `src/` directory (`src/components/...`, `src/lib/...`, `src/app/...`),
// and a correctly-installed project on that layout must not read as "not
// installed" just because the gate never looked one directory deeper.
// A file present at none of these is not installed — which is a failure for the
// required set and a valid state for the optional one (see the split above).
function resolveConverted(rel) {
  const candidates = [
    join(ROOT, rel),
    join(ROOT, 'components', rel),
    join(ROOT, 'src', rel),
    join(ROOT, 'src', 'components', rel),
  ];
  for (const candidate of candidates) {
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

// Copying a catalog into `messages/` is only half an install — until the
// namespace is spread into `i18n/messages.ts`'s `messages` object, next-intl
// never sees it. That failure is SILENT: with no `getMessageFallback` in
// `i18n/request.ts`, next-intl's default renders the key path itself, so every
// screen the namespace serves shows `auth.login.submit` instead of text while
// the app still boots. The other two checks here pass in that state (the files
// exist and hold no Thai), and design-setup's verify.mjs passes too (it checks
// that `messages/` exists, not that it is wired) — this is the fifth
// load-bearing piece its "four pieces" comment doesn't count.
// Returns the substring from `src[openBraceIdx]` (a `{`) to its matching `}`,
// tracking quote and brace-depth state — NOT a naive `indexOf`/`lastIndexOf`
// pair, which breaks the moment the object holds more than one nested `{}`.
function extractBalanced(src, openBraceIdx) {
  let depth = 0;
  let quote = null;
  for (let i = openBraceIdx; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(openBraceIdx, i + 1);
    }
  }
  return src.slice(openBraceIdx);
}

// Keys sitting directly inside an object literal's outer braces — depth 1,
// never inside a further-nested `{}`. A regex scan of the whole block text
// would count `someOtherNamespace: { auth: '...' }` as `auth` being
// registered; this only counts `auth` when it is a property of the object
// itself, exactly matching how a real `th: { kit: kitTh, auth: authTh }`
// spread is shaped.
function topLevelKeys(objLiteral) {
  const inner = objLiteral.slice(1, -1); // strip the outer { }
  const keys = [];
  let depth = 0;
  let quote = null;
  let i = 0;
  while (i < inner.length) {
    const c = inner[i];
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; i++; continue; }
    if (c === '{' || c === '[' || c === '(') { depth++; i++; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; continue; }
    if (depth === 0) {
      const m = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(inner.slice(i));
      if (m) { keys.push(m[1]); i += m[0].length; continue; }
    }
    i++;
  }
  return keys;
}

check('every catalog in messages/ is registered in i18n/messages.ts', () => {
  const dir = join(ROOT, 'messages');
  // The parity check above already reports a missing/unreadable messages/ dir.
  if (!existsSync(dir)) return { ok: true };
  const onDisk = readdirSync(dir)
    .map((f) => /^(.+)\.th\.ts$/.exec(f)?.[1])
    .filter(Boolean)
    // `messages/app.*.ts` is the project's own namespace (มติ: kit files are
    // overwritten wholesale on update, so project strings live outside them).
    // It is optional by design — never require it to be registered.
    .filter((ns) => ns !== 'app');
  if (onDisk.length === 0) return { ok: true };

  const registry = join(ROOT, 'i18n', 'messages.ts');
  if (!existsSync(registry)) {
    return { ok: false, msg: 'i18n/messages.ts missing — copy assets/i18n/ (it is what hands the catalogs to next-intl)' };
  }
  const src = readFileSync(registry, 'utf8');
  // Scope the search to the `messages` object literal, NOT the whole file: the
  // shipped header comment names "auth, mail, upload" as examples, so a
  // whole-file grep reports every namespace as registered and this check would
  // pass on exactly the tree it exists to fail.
  const declIdx = src.search(/export\s+const\s+messages\b/);
  if (declIdx < 0) {
    return { ok: false, msg: 'i18n/messages.ts has no `export const messages` — next-intl gets no catalog at all' };
  }
  // `export const messages: Record<AppLocale, {...}> = {...}` — the type
  // annotation carries its own `{` before the real value does, so the first
  // `{` after the identifier is the WRONG one (it belongs to the generic's
  // second type param, not the object being registered into). Anchor on the
  // `=` that starts the assignment instead, then take the first `{` after it.
  const eqIdx = src.indexOf('=', declIdx);
  const objStart = eqIdx < 0 ? -1 : src.indexOf('{', eqIdx);
  if (objStart < 0) {
    return { ok: false, msg: 'i18n/messages.ts: `messages` has no object literal — next-intl gets no catalog at all' };
  }
  // A namespace only counts as registered when it is a direct property of a
  // locale's own object (`th: { auth: authTh }`), never merely present
  // somewhere in the file text — a nested, unrelated `{ auth: '...' }` deeper
  // inside the object must not read as registration.
  const messagesObj = extractBalanced(src, objStart);
  const registered = new Set();
  for (const localeKey of topLevelKeys(messagesObj)) {
    const localeDecl = new RegExp(`(^|[{,])\\s*${localeKey}\\s*:\\s*\\{`).exec(messagesObj);
    if (!localeDecl) continue;
    const localeBraceIdx = localeDecl.index + localeDecl[0].length - 1;
    for (const ns of topLevelKeys(extractBalanced(messagesObj, localeBraceIdx))) registered.add(ns);
  }
  const missing = onDisk.filter((ns) => !registered.has(ns));
  return missing.length
    ? {
        ok: false,
        msg: `${missing
          .map((ns) => `messages/${ns}.{th,en}.ts`)
          .join(' · ')} copied but never registered in i18n/messages.ts — add the import + spread (one per namespace); until then every t() in ${
          missing.length > 1 ? 'those namespaces' : `the \`${missing[0]}\` namespace`
        } renders its raw key path on screen`,
      }
    : { ok: true, msg: `${onDisk.length} namespace(s) registered: ${onDisk.join(', ')}` };
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
