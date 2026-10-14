#!/usr/bin/env node
// Runnable version of the ugt-nextjs-auth-setup Verification Checklist (machine-checkable part)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
// Real flow testing (login via every method, logout clearing the cookie,
// /admin/setup) cannot be machine-checked — walk references/verification.md by hand.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const results = [];
// src/ layouts move app/lib/components/proxy.ts wholesale under src/ — every
// lookup probes both roots, so ALL checks (not just the ones that mention it)
// support that layout consistently. Root-anchored files (package.json,
// prisma/, docs/, .env*) never exist under src/, so the fallback is inert
// for them.
const p = (...s) => {
  const root = join(ROOT, ...s);
  if (existsSync(root)) return root;
  const src = join(ROOT, 'src', ...s);
  return existsSync(src) ? src : root;
};
const has = (...s) => existsSync(p(...s));
const read = (...s) => readFileSync(p(...s), 'utf8');

/** Strip comments before scanning — otherwise text WARNING against a pattern matches as usage */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function check(name, fn) {
  try {
    const r = fn();
    results.push({ name, ...(r ?? { ok: true }) });
  } catch (error) {
    results.push({ name, ok: false, msg: error.message });
  }
}

function sourceFiles() {
  const skip = new Set(['node_modules', '.next', '.git', 'coverage', 'test-results', 'generated', '.claude']);
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|prisma)$/.test(entry)) out.push(full);
    }
  };
  walk(ROOT);
  return out;
}

const AUTH_FILES = [
  'lib/auth.ts',
  'lib/auth-client.ts',
  'lib/actions/auth.ts',
  'lib/permissions.ts',
  'lib/permissions-sync.ts',
  'lib/get-user-permissions.ts',
  'lib/actions/admin-users.ts',
  'lib/actions/admin-roles.ts',
  'proxy.ts',
  'app/api/auth/[...all]/route.ts',
];
const pkg = has('package.json') ? JSON.parse(read('package.json')) : null;
const schema = has('prisma/schema.prisma') ? read('prisma/schema.prisma') : '';

// The route-guard file is `proxy.ts` on Next.js >= 16 and `middleware.ts`
// before that (SKILL.md §5.2) — identical content, different filename. Every
// check below reads whichever one the project actually has.
const nextRange = String(pkg?.dependencies?.next ?? pkg?.devDependencies?.next ?? '');
const nextMajor = Number(/(\d+)/.exec(nextRange)?.[1] ?? NaN);
const GUARD_FILE = has('proxy.ts') || !has('middleware.ts') ? 'proxy.ts' : 'middleware.ts';

// ── 1. Required files ──────────────────────────────────────────────────────
check('Core auth files present', () => {
  // proxy.ts counts as present when the project is on Next < 16 and named it
  // middleware.ts instead — same file, the version decides the name.
  const missing = AUTH_FILES.filter((f) => !has(f) && !(f === 'proxy.ts' && has('middleware.ts')));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-nextjs-auth-setup first` }
    : { ok: true };
});

check('Guard file name matches the Next.js major (>=16 proxy.ts, else middleware.ts)', () => {
  // Both mistakes are silent: Next never loads the wrong filename, so the app
  // serves every protected page to anyone and nothing logs a word.
  const wantsProxy = Number.isNaN(nextMajor) || nextMajor >= 16;
  if (wantsProxy) {
    return has('middleware.ts') && !has('proxy.ts')
      ? { ok: false, msg: 'Found middleware.ts — Next.js 16 uses proxy.ts; the guard will never run' }
      : { ok: true };
  }
  return has('proxy.ts') && !has('middleware.ts')
    ? {
        ok: false,
        msg: `next@${nextRange} is below 16 and never loads proxy.ts — no route protection at all; copy the same content to middleware.ts (export the function as \`middleware\`)`,
      }
    : { ok: true };
});

check('Guard file exports `config` (the matcher actually applies)', () => {
  if (!has(GUARD_FILE)) return { ok: false, msg: `No ${GUARD_FILE}` };
  return /export\s+const\s+config\b/.test(read(GUARD_FILE))
    ? { ok: true }
    : {
        ok: false,
        msg: `${GUARD_FILE} has no \`export const config\` — Next.js reads only that exact name, so a renamed export (e.g. proxyConfig) means the matcher is ignored`,
      };
});

check('First-admin bootstrap page exists', () => {
  const candidates = [
    'app/(admin-setup)/admin/setup/page.tsx',
    'app/admin/setup/page.tsx',
    'src/app/(admin-setup)/admin/setup/page.tsx',
    'src/app/admin/setup/page.tsx',
  ];
  return candidates.some((c) => has(c))
    ? { ok: true }
    : { ok: false, msg: 'No /admin/setup page — a fresh deployment has no way to mint an Administrator' };
});

check('Ongoing admin pages exist (users / roles / audit-logs)', () => {
  // Suffix match, not fixed paths — §5.6 lets projects nest the (admin) group
  // under their own shell (e.g. app/(app)/(admin)/admin/users/page.tsx), and
  // route groups don't change the URL.
  const files = sourceFiles().map((f) => relative(ROOT, f).replaceAll('\\', '/'));
  const missing = ['users', 'roles', 'audit-logs'].filter(
    (seg) => !files.some((f) => f.endsWith(`admin/${seg}/page.tsx`)),
  );
  return missing.length
    ? { ok: false, msg: `Missing admin page(s): ${missing.join(', ')} — the RBAC data model exists but nobody can manage it` }
    : { ok: true };
});

check('SSO auth errors land on the login page, not /api/auth/error', () => {
  if (!has('lib/auth.ts')) return { ok: true };
  const body = read('lib/auth.ts');
  if (!/genericOAuth/.test(body)) return { ok: true }; // no SSO in this project
  return /onAPIError/.test(body) && /errorURL/.test(body)
    ? { ok: true }
    : {
        ok: false,
        msg: 'lib/auth.ts has SSO but no onAPIError.errorURL — Better Auth redirects failures to /api/auth/error, computed WITHOUT the basePath, which 404s behind a shared-domain proxy and hides the error code',
      };
});

check('SSO resolves existing users by ldapUsername before create (email drift)', () => {
  if (!has('lib/auth.ts')) return { ok: true };
  const body = read('lib/auth.ts');
  if (!/genericOAuth/.test(body)) return { ok: true };
  return /where:\s*\{\s*ldapUsername/.test(body)
    ? { ok: true }
    : {
        ok: 'warn',
        msg: "mapProfileToUser doesn't look up the existing row by ldapUsername — when the AD email drifts from the stored email, SSO dies with unable_to_create_user (auth-flows.md §SSO)",
      };
});

check('Bootstrap redirects into a page that actually exists', () => {
  for (const f of ['lib/actions/admin-setup.ts', 'app/(admin-setup)/admin/setup/page.tsx']) {
    if (!has(f)) continue;
    if (/redirect\(\s*['"]\/['"]\s*\)/.test(stripComments(read(f)))) {
      return { ok: 'warn', msg: `${f} redirects to '/' — if that's not a real admin landing page, point it at '/admin/users' instead` };
    }
  }
  return { ok: true };
});

// ── 2. Leftover placeholders ────────────────────────────────────────────────
const PLACEHOLDERS = [
  '__PROJECT_NAME__',
  '__BASE_PATH__',
  '__KEYCLOAK_HOST__',
  '__REALM__',
  '__LDAP_HOST__',
  '__AD_BASE_DN__',
  '__COMPANY_DOMAIN__',
  '__APP_HOST__',
  // lib/directory.ts + lib/approval-chain.ts (references/asset-map.md table) — the mid-file
  // ones that survive an install that only edited the obvious env values
  '__LINKED_SERVER__',
  '__HR_DB__',
  '__HR_EMPLOYEE_VIEW__',
  '__HR_AUTHORIZE_VIEW__',
];
check('No __*__ placeholders left', () => {
  const found = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    const hits = PLACEHOLDERS.filter((ph) => body.includes(ph));
    if (hits.length) found.push(`${relative(ROOT, file)}: ${hits.join(', ')}`);
  }
  for (const f of ['.env.local', '.env.example', '.env']) {
    if (!has(f)) continue;
    const hits = PLACEHOLDERS.filter((ph) => read(f).includes(ph));
    if (hits.length) found.push(`${f}: ${hits.join(', ')}`);
  }
  return found.length ? { ok: false, msg: found.join(' · ') } : { ok: true };
});

// SKILL.md §5.2 only ever says to delete sections for methods NOT selected —
// a `[METHOD: SSO]` marker labeling a section that WAS kept is not leftover,
// it's the section header, and stays forever. So "zero markers anywhere" was
// never the real invariant; "zero markers for a method nothing else in the
// project evidences as selected" is. Detect selection from evidence already
// required elsewhere in this file (LDAP needs lib/ldap.ts, LOCAL needs
// localLoginAction, SSO needs the keycloak() plugin) rather than from a
// config file that doesn't exist.
function selectedMethods() {
  const selected = new Set();
  if (has('lib/ldap.ts')) selected.add('LDAP');
  if (has('lib/actions/auth.ts') && /localLoginAction/.test(read('lib/actions/auth.ts'))) selected.add('LOCAL');
  if (has('lib/auth.ts') && /\bkeycloak\(/.test(read('lib/auth.ts'))) selected.add('SSO');
  return selected;
}

// A [METHOD: …] occurrence only counts as a real leftover marker when it
// functions as an annotation, not when it's swept up in flowing prose that
// happens to name a method. Eval 2026-09-13 caught a narrative kit-header
// comment — "ส่วน [METHOD: LDAP] และ [METHOD: LOCAL] ถูกตัดออกทั้งหมด" (prose
// SAYING the sections were already cut) — tripping this check on a correctly
// pruned project. A marker counts when it: trails real code on the line,
// sits inside a JSX `{/* … */}` comment, appears on a decorative divider/
// banner line (3+ dash/box-drawing chars, e.g. `// ─── [METHOD: SSO] …`), or
// opens a plain comment with only whitespace/EOL/a dash following the `]`.
// Everything else (comment-only line, no divider, prose before or after) is
// treated as narrative, not a marker.
function isRealMethodMarker(line, matchIndex, matchEnd) {
  const before = line.slice(0, matchIndex);
  const afterBracket = line.slice(matchEnd);
  const openerRe = /(\{\/\*|\/\/|\/\*|#)/g;
  let opener = null;
  let openerIndex = -1;
  let m;
  while ((m = openerRe.exec(before))) {
    opener = m[1];
    openerIndex = m.index;
  }
  if (opener === null) return false; // no comment opener at all on this line
  if (/\S/.test(before.slice(0, openerIndex))) return true; // trailing annotation after code
  if (opener === '{/*') return true; // JSX comment
  if (/[─-]{3,}/.test(line)) return true; // decorative divider/banner line
  return /^\s*$/.test(afterBracket) || /^\s*[─\-–—]/.test(afterBracket);
}

check('[METHOD: …] markers remain only for methods actually kept', () => {
  const selected = selectedMethods();
  const found = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    const tags = new Set();
    for (const line of body.split('\n')) {
      for (const mm of line.matchAll(/\[METHOD:\s*([^\]]+)\]/g)) {
        if (isRealMethodMarker(line, mm.index, mm.index + mm[0].length)) tags.add(mm[1]);
      }
    }
    // A marker can tag more than one method with `|` (e.g. `[METHOD: LDAP|LOCAL]`
    // on an import both form methods share) — that section is legitimate as
    // long as AT LEAST ONE tagged method survived, so only flag a marker whose
    // ENTIRE tag list is unselected.
    const orphaned = [...tags].filter((tag) => tag.split('|').map((m) => m.trim()).every((m) => !selected.has(m)));
    if (orphaned.length) found.push(`${relative(ROOT, file)}: ${orphaned.map((o) => `[METHOD: ${o}]`).join(', ')}`);
  }
  return found.length
    ? { ok: false, msg: `Sections for declined methods were not cut: ${found.join(' · ')}` }
    : { ok: true };
});

// ── 3. Cookie prefix env-driven in all 3 files ─────────────────────────────
// Presence + no-hardcoded-literal only — it does NOT compare the derived
// values across files (that would need evaluating the expressions).
check('Cookie prefix env-driven in all 3 files (no hardcoded literal)', () => {
  const targets = ['lib/auth.ts', GUARD_FILE, 'lib/actions/auth.ts'];
  const missing = targets.filter((f) => !has(f));
  if (missing.length) return { ok: false, msg: `Missing files: ${missing.join(', ')}` };
  // stripComments first — a cross-reference comment mentioning cookiePrefix
  // must not satisfy a check about the code
  const noPrefix = targets.filter((f) => !/cookiePrefix|APP_COOKIE_PREFIX/.test(stripComments(read(f))));
  if (noPrefix.length) {
    return {
      ok: false,
      msg: `No cookie-prefix reference in: ${noPrefix.join(', ')} — on a shared domain this is ERR_TOO_MANY_REDIRECTS`,
    };
  }
  // Every file should derive from NEXT_PUBLIC_BASE_PATH, not hardcode
  const hardcoded = targets.filter((f) => {
    const body = read(f);
    return /cookiePrefix\s*:\s*['"][^'"]+['"]/.test(body);
  });
  return hardcoded.length
    ? { ok: false, msg: `Hardcoded cookie prefix in: ${hardcoded.join(', ')} — must derive from NEXT_PUBLIC_BASE_PATH` }
    : { ok: true };
});

check('proxy redirects are app-relative', () => {
  if (!has(GUARD_FILE)) return { ok: false, msg: `No ${GUARD_FILE}` };
  const body = stripComments(read(GUARD_FILE));
  // Flag only *assignments* to url.pathname that mention basePath on the same line
  const bad = body
    .split('\n')
    .filter((l) => /\burl\.pathname\s*=/.test(l))
    .filter((l) => /basePath|BASE_PATH/.test(l));
  return bad.length
    ? { ok: false, msg: `basePath appended to url.pathname manually → duplicated basePath in the URL (clone() already carries it): ${bad.map((l) => l.trim()).join(' · ')}` }
    : { ok: true };
});

check('proxy does not bounce auth pages on cookie presence (stale-cookie redirect loop)', () => {
  if (!has(GUARD_FILE)) return { ok: false, msg: `No ${GUARD_FILE}` };
  const body = stripComments(read(GUARD_FILE));
  // `if (isAuthOnlyPath && sessionCookie) { …redirect('/') }` — a cookie is not a session:
  // an expired one makes the layout send the browser back to /login, which this sends to /.
  const bounce = /isAuthOnlyPath\s*&&\s*(?:!!)?\s*sessionCookie|sessionCookie\s*&&\s*isAuthOnlyPath/.test(body);
  const problems = [];
  if (bounce) {
    problems.push(`${GUARD_FILE} redirects an auth page (/login) to the app on cookie presence — an expired cookie loops / ↔ /login (ERR_TOO_MANY_REDIRECTS); do that in the login page with auth.api.getSession`);
  }
  const loginPage = ['app/(auth)/login/page.tsx', 'app/login/page.tsx', 'app/[locale]/(auth)/login/page.tsx', 'app/[locale]/login/page.tsx'].find((f) => has(f));
  if (loginPage && !/getSession/.test(stripComments(read(loginPage)))) {
    problems.push(`${loginPage} never checks auth.api.getSession — a signed-in user still sees the login form (SKILL.md §5.5 step 1)`);
  }
  return problems.length ? { ok: bounce ? false : 'warn', msg: problems.join(' · ') } : { ok: true };
});

check('Login page: two-column hero, copy from the project catalog (DESIGN.md §3)', () => {
  const loginPage = ['app/(auth)/login/page.tsx', 'app/login/page.tsx', 'app/[locale]/(auth)/login/page.tsx', 'app/[locale]/login/page.tsx'].find((f) => has(f));
  if (!loginPage) return { ok: 'warn', msg: 'no login page found (SKILL.md §5.5 step 1)' };
  const page = stripComments(read(loginPage));
  const problems = [];
  if (!/<LoginShell\b/.test(page)) {
    problems.push(`${loginPage} does not render <LoginShell> — no two-column login hero (references/login-page.md; a project keeping its own page records the deviation in DESIGN.md §10)`);
  } else {
    if (!/hero=\{/.test(page)) problems.push('<LoginShell> has no hero={…} — the page renders as the plain centred form');
    // hero copy belongs to messages/app.*.ts — a literal in the page is untranslatable and drifts
    if (/[฀-๿]/.test(page)) problems.push(`${loginPage} holds Thai text in code — build the hero from getTranslations('app.loginHero')`);
  }
  // LoginShell renders the form column as the page's <main> (the root layout has none)
  if (/<LoginShell\b/.test(page) && /<main\b/.test(page)) {
    problems.push(`${loginPage} renders <main> inside <LoginShell>, which already is the <main> landmark (nested landmarks)`);
  }
  if (has('components/login-shell.tsx')) {
    const shell = stripComments(read('components/login-shell.tsx'));
    if (!/<main\b/.test(shell)) {
      problems.push('components/login-shell.tsx: the form column is not <main> — the login page has no main landmark (references/login-page.md §1)');
    }
    if (/<h[1-6]\b/.test(shell)) {
      problems.push("components/login-shell.tsx: the hero holds a heading that comes before the form's <h1> in document order — keep the title as styled text");
    }
    if (!/\bhidden\b[^"'`]*\blg:flex\b/.test(shell)) problems.push('components/login-shell.tsx: the hero is not `hidden … lg:flex` — mobile would get the panel above the form');
  }
  if (has('public/login-hero.webp')) {
    const kb = Math.round(statSync(p('public/login-hero.webp')).size / 1024);
    if (kb > 400) problems.push(`public/login-hero.webp is ${kb} KB — re-encode ~1440 px wide, webp q≈78 (≈150 KB)`);
  }
  return problems.length ? { ok: 'warn', msg: problems.join(' · ') } : { ok: true };
});

check('proxy bypasses /_next/ and /api/health', () => {
  if (!has(GUARD_FILE)) return { ok: false, msg: `No ${GUARD_FILE}` };
  const body = read(GUARD_FILE);
  const problems = [];
  if (!body.includes('_next')) problems.push("no /_next/ bypass → static assets get an HTML redirect (Unexpected token '<')");
  if (!body.includes('/api/health')) problems.push('no /api/health bypass → healthchecks bounce to /login');
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── 4. Frequently mis-called Better Auth APIs ──────────────────────────────
check('Uses auth.api.signInEmail (not signIn.email)', () => {
  const bad = sourceFiles().filter((f) => /auth\.api\.signIn\.email/.test(stripComments(readFileSync(f, 'utf8'))));
  return bad.length
    ? { ok: false, msg: `${bad.map((f) => relative(ROOT, f)).join(', ')} — that path does not exist in Better Auth` }
    : { ok: true };
});

check('Logout avoids cookieStore.delete()', () => {
  const bad = [];
  for (const f of ['lib/actions/auth.ts']) {
    if (!has(f)) continue;
    if (/cookie(Store)?\s*\.\s*delete\s*\(/.test(stripComments(read(f)))) bad.push(f);
  }
  return bad.length
    ? {
        ok: false,
        msg: `${bad.join(', ')} uses cookieStore.delete() — it omits the Secure flag so __Secure- cookies never get deleted on https (use set(name, '', { maxAge: 0, secure }))`,
      }
    : { ok: true };
});

// ── 4b. Password reset (Local only — silent when the files aren't installed) ─
check('Password reset wired correctly', () => {
  if (!has('lib/actions/password.ts')) {
    return { ok: true, msg: 'no local password flows installed — nothing to check' };
  }
  const problems = [];
  const authTs = has('lib/auth.ts') ? read('lib/auth.ts') : '';
  const actions = read('lib/actions/password.ts');

  // The 1.5.x rename: the old name compiles (any-typed api) and fails at runtime.
  if (/auth\.api\.forgetPassword/.test(stripComments(actions))) {
    problems.push('auth.api.forgetPassword no longer exists in better-auth 1.5.x — use requestPasswordReset');
  }
  if (!/sendResetPassword/.test(authTs)) {
    problems.push('lib/auth.ts has no sendResetPassword — Better Auth answers RESET_PASSWORD_DISABLED and the form is dead');
  }
  // The basePath trap: mailing Better Auth's own `url` 404s in production only.
  if (/sendResetPassword/.test(authTs) && !/NEXT_PUBLIC_BASE_PATH[^\n]*reset-password|reset-password[^\n]*token/.test(authTs)) {
    problems.push('the reset link is not built from token + NEXT_PUBLIC_BASE_PATH — Better Auth\'s url omits the basePath and 404s in prod');
  }
  if (!/revokeSessionsOnPasswordReset\s*:\s*true/.test(authTs)) {
    problems.push('revokeSessionsOnPasswordReset is not true — a reset leaves the intruder\'s session alive');
  }
  if (!has('lib/password-policy.ts')) {
    problems.push('lib/password-policy.ts missing — each form will grow its own rules and the loosest one wins');
  }
  if (has(GUARD_FILE) && !/reset-password/.test(read(GUARD_FILE))) {
    problems.push(`/reset-password is not public in ${GUARD_FILE} — the mailed link bounces to /login`);
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Local accounts: no self-signup, but a way in', () => {
  if (!has('lib/actions/password.ts')) {
    return { ok: true, msg: 'no local login — accounts come from SSO/LDAP on first login' };
  }
  const problems = [];
  const authTs = has('lib/auth.ts') ? read('lib/auth.ts') : '';
  const adminUsers = has('lib/actions/admin-users.ts') ? read('lib/actions/admin-users.ts') : '';

  // emailAndPassword.enabled publishes POST /api/auth/sign-up/email to the world.
  if (!/disableSignUp\s*:\s*true/.test(authTs)) {
    problems.push('emailAndPassword.disableSignUp is not true — anyone who can reach the app can self-register');
  }
  if (!/createLocalUserAction/.test(adminUsers)) {
    problems.push('no createLocalUserAction — with sign-up closed, nobody can ever get a local account');
  }
  // signUpEmail is what disableSignUp switches off; an admin action calling it
  // fails the moment the flag above is set, and only in the one flow nobody tests.
  if (/auth\.api\.signUpEmail/.test(stripComments(adminUsers))) {
    problems.push('admin-users.ts calls auth.api.signUpEmail — disableSignUp blocks it too; write the user + credential rows with hashPassword instead');
  }
  if (!has('scripts/create-first-user.ts')) {
    problems.push('scripts/create-first-user.ts missing — a local-only project cannot bootstrap its first login');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── 4c. Directory enrichment (only when lib/directory.ts was installed) ─────
check('Directory enrichment is wired and fails soft', () => {
  if (!has('lib', 'directory.ts')) {
    return { ok: true, msg: 'no central employee view in this project' };
  }
  const problems = [];
  const dir = read('lib', 'directory.ts');

  // A lookup that throws during login turns an HR-server outage into a total outage.
  if (!/catch\s*\(/.test(dir)) {
    problems.push('lib/directory.ts never catches — a linked-server outage would take every login down with it');
  }
  // Identifiers must go through Prisma.raw; values must NOT.
  if (!/Prisma\.raw/.test(dir)) {
    problems.push("lib/directory.ts has no Prisma.raw — a view name interpolated as a value becomes a bound parameter and the SQL fails");
  }
  // Both login paths must refresh from the same helper, or SSO and LDAP users
  // end up with different columns filled and nobody notices until a page needs one.
  const wired = ['lib/auth.ts', 'lib/actions/auth.ts'].filter(
    (f) => has(f) && /getDirectoryPerson|directoryUserFields/.test(read(f))
  );
  if (wired.length === 0) {
    problems.push('lib/directory.ts is installed but never called from a login path — the columns stay empty forever');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

// ── 4c'. Org identity: email domains, no shared accounts, pre-assigned roles ─
// (2026-10-14 — SKILL.md §2 items 10–11). Silent on local-only projects.
const orgLogin = () => {
  const m = selectedMethods();
  return m.has('SSO') || m.has('LDAP');
};
const code = (f) => (has(f) ? stripComments(read(f)) : '');

check('ORG_EMAIL_DOMAINS: normalized from SSO/LDAP/HR, refused for Local', () => {
  if (!orgLogin()) return { ok: true, msg: 'no SSO/LDAP — org email domains do not apply' };
  const problems = [];
  if (!has('lib/org-email.ts')) problems.push('lib/org-email.ts missing — copy the asset (canonical domain + isOrgEmail)');
  if (has('lib/env.ts') && !/ORG_EMAIL_DOMAINS/.test(read('lib/env.ts'))) {
    problems.push('lib/env.ts does not declare ORG_EMAIL_DOMAINS — env.ORG_EMAIL_DOMAINS is undefined and nothing is normalized');
  }
  const m = selectedMethods();
  if (m.has('SSO') && !/toCanonicalEmail/.test(code('lib/auth.ts'))) {
    problems.push('lib/auth.ts never calls toCanonicalEmail — SSO users keep whatever domain Keycloak sent');
  }
  if (m.has('LDAP') && !/toCanonicalEmail/.test(code('lib/actions/auth.ts'))) {
    problems.push('ldapLoginAction never calls toCanonicalEmail — AD users keep whatever domain AD sent');
  }
  if (m.has('LOCAL')) {
    if (!/isOrgEmail/.test(code('lib/actions/admin-users.ts'))) {
      problems.push('createLocalUserAction does not refuse org emails — a Local password on an employee mailbox is a shared account');
    }
    if (!/sign-in\/email[\s\S]{0,300}isOrgEmail|isOrgEmail[\s\S]{0,300}sign-in\/email/.test(code('lib/auth.ts'))) {
      problems.push("lib/auth.ts has no hooks.before refusing org emails on '/sign-in/email' — legacy Local rows on org mailboxes still sign in (and direct API calls skip the Server Action)");
    }
  }
  if (problems.length) return { ok: false, msg: problems.join(' · ') };
  const envFile = ['.env.example', '.env.local'].find((f) => has(f));
  if (envFile && !/^ORG_EMAIL_DOMAINS=\S/m.test(read(envFile))) {
    return { ok: 'warn', msg: `${envFile} has no ORG_EMAIL_DOMAINS value — fine only if the org has a single mail domain and no Local accounts on it` };
  }
  return { ok: true };
});

check('SSO/LDAP never link into another account (Local on an org email)', () => {
  const m = selectedMethods();
  const problems = [];
  // SSO: Better Auth links by email; mapProfileToUser must refuse a row that is not this AD identity
  const authTs = code('lib/auth.ts');
  if (m.has('SSO') && !/orgEmailVariants[\s\S]{0,400}providerId:\s*'keycloak'/.test(authTs)) {
    problems.push("mapProfileToUser does not refuse an email held by a row with no Keycloak account — SSO links into a Local account and two people share it (§2 item 11)");
  } else if (m.has('SSO') && !/providerId:\s*'keycloak',\s*accountId\b/.test(authTs)) {
    // any Keycloak account is not enough — a different AD identity sharing the mailbox must be refused too
    problems.push("mapProfileToUser's clash check skips any row with ANY Keycloak account — require the same subject: accounts: { none: { providerId: 'keycloak', accountId: <profile.sub> } }");
  }
  if (m.has('SSO')) {
    // the AD login must come from Keycloak (preferred_username), never from the mailbox local part
    if (/email\??\.split\(\s*['"]@/.test(authTs)) {
      problems.push("lib/auth.ts derives the AD login from the email (email.split('@')) — another person's HR record / pending role can match; use the stored ldapUsername (preferred_username) or null");
    }
    if (!/additionalFields[\s\S]{0,300}ldapUsername/.test(authTs)) {
      problems.push('lib/auth.ts does not declare user.additionalFields.ldapUsername — Better Auth drops it from mapProfileToUser, so a first SSO login has no AD login to key the directory and pending role on');
    }
  }
  // LDAP: the upsert is keyed on ldapUsername; a clash on email must be refused, NULL rows included
  if (m.has('LDAP') && !/ldapUsername:\s*null/.test(code('lib/actions/auth.ts'))) {
    problems.push('ldapLoginAction has no email-clash check that includes ldapUsername: null rows — a Local row on the same mailbox makes the upsert throw mid-login (or, hand-patched, merge into it)');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Pre-assigned roles: HR identity only, applied at first login, never pre-creates accounts', () => {
  if (!has('lib', 'directory.ts') || !orgLogin()) {
    return { ok: true, msg: 'no HR view or no SSO/LDAP — pre-assignment not installed' };
  }
  if (!has('lib/actions/admin-preassign.ts')) {
    return { ok: 'warn', msg: 'lib/directory.ts is installed but lib/actions/admin-preassign.ts is not — admins cannot set a role before first login (SKILL.md §5.2)' };
  }
  const problems = [];
  const actions = code('lib/actions/admin-preassign.ts');
  // pre-ASSIGNMENT, not pre-REGISTRATION: no user/account row may be born here
  // (any client — prisma.user.create, tx.user.create, db.account.upsert …)
  const createsRows = /\.(user|account)\.(create|upsert|createMany)\b/;
  if (createsRows.test(actions)) {
    problems.push('admin-preassign.ts creates user/account rows — that is pre-registration (forbidden, มติ 2026-08-11): store a PendingRoleAssignments row only');
  }
  if (createsRows.test(code('lib/after-login.ts'))) {
    problems.push('lib/after-login.ts creates user/account rows — applying a pending role only updates the row the login already made');
  }
  if (!/getDirectoryPersonByEmpCode/.test(actions)) {
    problems.push('createPreassignAction does not re-resolve the person from the HR view — a client-typed loginName is the duplicate-user trap the มติ exists for');
  }
  if (!/USERS_UPDATE/.test(actions)) problems.push('pre-assign actions are not guarded by PERMISSIONS.USERS_UPDATE');
  const audits = ['USERS_PREASSIGN_CREATE', 'USERS_PREASSIGN_UPDATE', 'USERS_PREASSIGN_DELETE'].filter((a) => !actions.includes(a));
  if (audits.length) problems.push(`no audit log for ${audits.join(', ')}`);
  if (!has('lib/after-login.ts')) {
    problems.push('lib/after-login.ts missing — nothing applies the pending role at login');
  } else {
    const after = code('lib/after-login.ts');
    if (!/pendingRoleAssignment/.test(after) || !/USERS_PREASSIGN_APPLY/.test(after)) {
      problems.push('lib/after-login.ts does not apply + audit (USERS_PREASSIGN_APPLY) the pending role');
    }
    // the whole function, not one query shape: any `email:` key in it is a match/filter by email
    const apply = after.match(/function\s+applyPendingRole\b[\s\S]*?\n\}/)?.[0] ?? '';
    if (!apply) {
      problems.push('lib/after-login.ts has no applyPendingRole() — cannot check how the pending role is matched');
    } else if (/\bemail\s*:/.test(apply)) {
      problems.push('applyPendingRole uses an `email:` key — the pending role must be matched by EmpCode/ADLoginName only, never email');
    }
  }
  const m = selectedMethods();
  if (m.has('SSO') && !/afterOrgLogin\s*\(/.test(code('lib/auth.ts'))) problems.push('the SSO session hook never calls afterOrgLogin()');
  if (m.has('LDAP') && !/afterOrgLogin\s*\(/.test(code('lib/actions/auth.ts'))) problems.push('ldapLoginAction never calls afterOrgLogin()');
  const model = schema.match(/model\s+pendingRoleAssignment\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!model) problems.push('schema has no pendingRoleAssignment model (assets/prisma/schema-auth.prisma)');
  else if (!/empCode[^\n]*@unique/.test(model) || !/loginName[^\n]*@unique/.test(model)) {
    problems.push('pendingRoleAssignment.empCode / loginName are not @unique — one person can get two competing pending roles');
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('"ยังไม่มีบทบาท" is visible: users-page tab + nav badge', () => {
  const files = sourceFiles().map((f) => ({ rel: relative(ROOT, f).replaceAll('\\', '/'), f }));
  const page = files.find((x) => x.rel.endsWith('admin/users/page.tsx'));
  if (!page) return { ok: true, msg: 'no /admin/users page (reported above)' };
  const problems = [];
  if (!/['"]no-role['"]/.test(stripComments(readFileSync(page.f, 'utf8')))) {
    problems.push(`${page.rel} has no "no-role" tab — SSO/LDAP users with no role are invisible until someone scrolls the whole list`);
  }
  const badged = files.some(
    (x) => !x.rel.endsWith('lib/admin-badges.ts') && /getAdminNavBadges\s*\(/.test(stripComments(readFileSync(x.f, 'utf8')))
  );
  if (!badged) {
    problems.push('nothing calls getAdminNavBadges() — the users menu item shows no "no role" count (merged sidebars: §5.6 step 1)');
  }
  return problems.length ? { ok: 'warn', msg: problems.join(' · ') } : { ok: true };
});

check('No-role admin mail matches the installed modules', () => {
  if (!has('lib/after-login.ts')) return { ok: true, msg: 'no lib/after-login.ts' };
  const after = code('lib/after-login.ts');
  const importsMail = /from\s+['"]@\/lib\/email['"]/.test(after);
  if (importsMail && !has('lib/email.ts')) {
    return { ok: false, msg: 'lib/after-login.ts imports @/lib/email but ugt-nextjs-mail-setup is not installed — the build breaks; delete the [MAIL] parts (SKILL.md §5.5 step 7)' };
  }
  if (!importsMail && has('lib/email.ts')) {
    return { ok: 'warn', msg: "mail is installed but lib/after-login.ts sends no 'auth.user-without-role' notice — restore its [MAIL] parts (mail-setup §4.6)" };
  }
  if (importsMail && !/noRoleNotifiedAt/.test(schema)) {
    return { ok: false, msg: 'user.noRoleNotifiedAt missing from the schema — the once-per-user claim fails and the notice never sends' };
  }
  return { ok: true };
});

// ── 4d. Data scope + approval chain (only when installed) ──────────────────
check('Data scope is enforced where an owner id is accepted', () => {
  if (!has('lib', 'scope.ts')) return { ok: true, msg: 'no row-level scope in this project' };
  const problems = [];

  // scopeWhere must never widen to "everything" for an unlinked account.
  const scopeSrc = read('lib', 'scope.ts');
  if (!/in:\s*allowed|in:\s*\[/.test(scopeSrc)) {
    problems.push('scopeWhere does not constrain with an `in:` list — an unlinked account may be seeing every row');
  }
  if (!has('lib', 'scope.test.ts')) {
    problems.push('lib/scope.test.ts missing — the subtree walk and the unlinked-account case are exactly what silently regress');
  }

  // The real failure: a route takes empCode from the client and never checks it.
  const suspects = [];
  for (const file of sourceFiles()) {
    const rel = relative(ROOT, file).split('\\').join('/');
    // src/ layouts and non-group app routes (app/admin/...) accept empCode
    // exactly the same way — normalize before matching, or the scan silently
    // checks nothing on those projects.
    const norm = rel.replace(/^src\//, '');
    if (!/^app\/|^lib\/actions\//.test(norm)) continue;
    if (norm.startsWith('lib/scope')) continue;
    // takes an HR empCode to *pre-assign a role* (users:update over the whole
    // directory) — it reads no owner-scoped rows, so there is no scope to check
    if (norm === 'lib/actions/admin-preassign.ts') continue;
    const body = stripComments(readFileSync(file, 'utf8'));
    const takesOwnerId = /searchParams[^\n]*empCode|params[^\n]*empCode|body[^\n]*empCode|empCode:\s*z\./.test(body);
    if (!takesOwnerId) continue;
    if (!/isEmpCodeAllowed|scopeWhere|resolveDataScope/.test(body)) suspects.push(rel);
  }
  if (suspects.length) {
    problems.push(
      `accepts an empCode from the client without a scope check (edit ?empCode= and you read someone else's rows): ${suspects.slice(0, 5).join(' · ')}`
    );
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

check('Approval-chain lookups fail loud', () => {
  if (!has('lib', 'approval-chain.ts')) return { ok: true, msg: 'no approval workflow in this project' };
  const body = read('lib', 'approval-chain.ts');
  // A swallowed error here saves a request with no approver and tells the user "submitted".
  return /getApprovalChain[\s\S]*?catch[\s\S]{0,400}?throw/.test(body)
    ? { ok: true }
    : {
        ok: false,
        msg: 'getApprovalChain swallows its error instead of rethrowing — a failed lookup becomes "no approver" and the request sits unrouted',
      };
});

check('Keycloak plugin guarded by env', () => {
  if (!has('lib/auth.ts')) return { ok: false, msg: 'No lib/auth.ts' };
  const body = read('lib/auth.ts');
  if (!/KEYCLOAK/.test(body)) return { ok: 'warn', msg: 'SSO not enabled (no KEYCLOAK_* references)' };
  return /KEYCLOAK_ISSUER\s*&&|KEYCLOAK_CLIENT_ID\s*&&|\?\s*\[/.test(body)
    ? { ok: true }
    : { ok: false, msg: 'keycloak() called without an undefined guard — builds with SKIP_ENV_VALIDATION=1 will crash' };
});

// ── 5. Schema requirements ─────────────────────────────────────────────────
check('rateLimit model: id is @id, key is nullable', () => {
  if (!schema) return { ok: false, msg: 'No prisma/schema.prisma' };
  const model = schema.match(/model\s+rateLimit\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!model) return { ok: 'warn', msg: 'No rateLimit model (Better Auth rate limiting not enabled)' };
  const problems = [];
  if (!/^\s*id\s+String\s+@id/m.test(model)) problems.push('id is not @id');
  if (!/^\s*key\s+String\?/m.test(model)) problems.push('key is not nullable');
  return problems.length
    ? { ok: false, msg: `${problems.join(' · ')} — Better Auth v1 sends id too, yielding "Unknown argument 'id'"` }
    : { ok: true };
});

check('Auth/RBAC tables map singular per convention', () => {
  if (!schema) return { ok: false, msg: 'No prisma/schema.prisma' };
  const expect = {
    user: 'User',
    session: 'Session',
    account: 'Account',
    verification: 'Verification',
    rateLimit: 'RateLimit',
    role: 'Role',
    permission: 'Permission',
    rolePermission: 'RolePermission',
    activityLog: 'ActivityLogs',
    // app-owned (not Better Auth's) → the normal plural rule
    pendingRoleAssignment: 'PendingRoleAssignments',
  };
  const wrong = [];
  for (const [model, want] of Object.entries(expect)) {
    const body = schema.match(new RegExp(`model\\s+${model}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1];
    if (!body) continue;
    const got = body.match(/@@map\("([^"]+)"\)/)?.[1];
    if (got !== want) wrong.push(`${model} -> "${got ?? '(no @@map)'}" should be "${want}"`);
  }
  return wrong.length ? { ok: false, msg: wrong.join(' · ') } : { ok: true };
});

check('account model has no required issuer (better-auth >= 1.7.4 never writes it)', () => {
  if (!schema) return { ok: false, msg: 'No prisma/schema.prisma' };
  const body = schema.match(/model\s+account\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!body) return { ok: false, msg: 'No account model' };
  return /^\s*issuer\s+String\b(?!\?)/m.test(body)
    ? { ok: false, msg: 'account.issuer is NOT NULL — better-auth 1.7.4+ never writes it, so every SSO/credential insert fails (make it String? or drop it; references/troubleshooting-upgrades.md §Account.issuer)' }
    : { ok: true };
});

check('Audit actions come from lib/audit-actions.ts, not raw strings', () => {
  if (!has('lib/audit-actions.ts')) {
    return {
      ok: false,
      msg: 'lib/audit-actions.ts missing — audit-logging.md mandates every ActivityLogs.action string come from a constant there (copy the asset)',
    };
  }
  const bad = [];
  for (const file of sourceFiles()) {
    if (file === p('lib/audit-actions.ts')) continue;
    const body = stripComments(readFileSync(file, 'utf8'));
    // `action: 'users.create'` / `logAuthEvent('login.success', …)` — a dotted
    // lowercase literal where a constant belongs.
    const hits = [
      ...body.matchAll(/action:\s*'([a-z][a-z0-9.-]*\.[a-z0-9.-]+)'/g),
      ...body.matchAll(/logAuthEvent\(\s*'([a-z][a-z0-9.-]*)'/g),
    ].map((m) => m[1]);
    if (hits.length) bad.push(`${relative(ROOT, file)}: ${[...new Set(hits)].join(', ')}`);
  }
  return bad.length
    ? { ok: false, msg: `raw audit action string(s) — import AUDIT_ACTIONS instead: ${bad.slice(0, 5).join(' · ')}` }
    : { ok: true };
});

check('rateLimit.customRules keys omit the /api/auth basePath', () => {
  if (!has('lib/auth.ts')) return { ok: true };
  const body = stripComments(read('lib/auth.ts'));
  const rules = /customRules\s*:\s*\{([\s\S]*?)\n\s*\}/.exec(body)?.[1];
  if (!rules) return { ok: true, msg: 'no customRules configured' };
  const bad = [...rules.matchAll(/'(\/api\/auth\/[^']+)'\s*:/g)].map((m) => m[1]);
  return bad.length
    ? {
        ok: false,
        msg: `${bad.join(', ')} — Better Auth strips its own /api/auth basePath before matching, so these rules never fire and the default limit silently applies; use '/sign-in/email' etc.`,
      }
    : { ok: true };
});

check('ActivityLogs never UPDATEd/DELETEd from app code', () => {
  const bad = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    if (/prisma\.activityLog\.(update|delete|deleteMany|updateMany|upsert)/.test(body)) {
      bad.push(relative(ROOT, file));
    }
  }
  return bad.length
    ? { ok: false, msg: `${bad.join(', ')} — the audit table is append-only` }
    : { ok: true };
});

// ── 6. Env ─────────────────────────────────────────────────────────────────
check('BETTER_AUTH_SECRET enforces length >= 32', () => {
  if (!has('lib/env.ts')) return { ok: false, msg: 'No lib/env.ts' };
  const body = read('lib/env.ts');
  if (!body.includes('BETTER_AUTH_SECRET')) return { ok: false, msg: 'lib/env.ts has no BETTER_AUTH_SECRET' };
  // min(32) or min(32, 'message') both pass
  return /BETTER_AUTH_SECRET\s*:[^\n]*min\(\s*32\s*[,)]/.test(body)
    ? { ok: true }
    : { ok: 'warn', msg: 'No .min(32) found — a short secret weakens the HMAC' };
});

check('BETTER_AUTH_URL is required, not optional', () => {
  if (!has('lib/env.ts')) return { ok: false, msg: 'No lib/env.ts' };
  const line = read('lib/env.ts')
    .split('\n')
    .find((l) => /BETTER_AUTH_URL\s*:/.test(l));
  if (!line) {
    return {
      ok: false,
      msg: 'lib/env.ts has no BETTER_AUTH_URL — Better Auth then derives the __Secure- cookie prefix from NODE_ENV instead of the real scheme',
    };
  }
  return /\.optional\(\)/.test(line)
    ? {
        ok: false,
        msg: 'BETTER_AUTH_URL is optional — unset in production means the cookie Better Auth sets and the name lib/actions/auth.ts looks for disagree (redirect loop). Make it required (SKILL.md §5.4)',
      }
    : { ok: true };
});

check('NEXT_PUBLIC_BASE_PATH in client block + runtimeEnv', () => {
  if (!has('lib/env.ts')) return { ok: false, msg: 'No lib/env.ts' };
  const body = read('lib/env.ts');
  if (!body.includes('NEXT_PUBLIC_BASE_PATH')) {
    return { ok: 'warn', msg: 'NEXT_PUBLIC_BASE_PATH not declared (fine if the project has no basePath)' };
  }
  const occurrences = (body.match(/NEXT_PUBLIC_BASE_PATH/g) ?? []).length;
  return occurrences >= 2
    ? { ok: true }
    : { ok: false, msg: 'Declared only once — must appear in both the client block and runtimeEnv or it is undefined at runtime' };
});

check('ldapts, not ldapjs', () => {
  if (!pkg) return { ok: false, msg: 'No package.json' };
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (deps.ldapjs) return { ok: false, msg: 'ldapjs in use (deprecated, no types) — switch to ldapts' };
  const usesLdap = has('lib/ldap.ts');
  if (usesLdap && !deps.ldapts) return { ok: false, msg: 'lib/ldap.ts exists but ldapts is not installed' };
  return { ok: true };
});

check('syncPermissionsIfNeeded is actually called', () => {
  if (!has('lib/permissions-sync.ts')) return { ok: false, msg: 'No lib/permissions-sync.ts' };
  const called = sourceFiles().some(
    (f) => f !== p('lib/permissions-sync.ts') && /syncPermissionsIfNeeded\s*\(/.test(readFileSync(f, 'utf8'))
  );
  return called
    ? { ok: true }
    : { ok: false, msg: 'Defined but never called — new ALL_PERMISSIONS entries will never reach the database' };
});

check('System roles protected from edit + delete', () => {
  if (!has('lib/actions/admin-roles.ts')) return { ok: false, msg: 'No lib/actions/admin-roles.ts' };
  const body = read('lib/actions/admin-roles.ts');
  const problems = [];
  if (!/isSystem/.test(body)) problems.push('no isSystem check at all');
  if (!/updateRoleAction[\s\S]*?isSystem/.test(body)) problems.push('updateRoleAction does not check isSystem');
  if (!/deleteRoleAction[\s\S]*?isSystem/.test(body)) problems.push('deleteRoleAction does not check isSystem');
  return problems.length
    ? { ok: false, msg: `${problems.join(' · ')} — a system role's permissions could be edited away, locking everyone out` }
    : { ok: true };
});

// ── 7. UI kit compliance (the admin pages ship against base-mira / Base UI) ──
check('No Radix-only APIs in UI code (asChild / onSelect on menu items)', () => {
  // Base UI ignores both silently: the component renders fine and the button
  // just does nothing — shipped once as "ปุ่ม logout กดไม่ได้" (4.25.0).
  const bad = [];
  for (const file of sourceFiles()) {
    if (!/\.tsx$/.test(file)) continue;
    const rel = relative(ROOT, file).replaceAll('\\', '/');
    // includes(), not startsWith(): this script also supports src/ layouts
    // (see the /admin/setup candidates above) and src/components/ui/* is the
    // same shadcn-owned territory — startsWith failed those projects.
    if (rel.includes('components/ui/')) continue; // shadcn primitives own their internals
    const body = stripComments(readFileSync(file, 'utf8'));
    const hits = [];
    if (/\basChild\b/.test(body)) hits.push('asChild');
    if (/<DropdownMenuItem/.test(body) && /onSelect\s*=/.test(body) && !/react-day-picker|Calendar/.test(body)) {
      hits.push('onSelect on a menu item');
    }
    if (hits.length) bad.push(`${rel}: ${hits.join(', ')}`);
  }
  return bad.length
    ? { ok: false, msg: `Radix idioms in a Base UI (base-mira) project — dead buttons: ${bad.slice(0, 5).join(' · ')}` }
    : { ok: true };
});

check('Destructive confirms use ConfirmActionDialog, not window.confirm', () => {
  const bad = sourceFiles().filter((f) => /window\.(confirm|alert)\s*\(/.test(stripComments(readFileSync(f, 'utf8'))));
  return bad.length
    ? {
        ok: false,
        msg: `${bad.map((f) => relative(ROOT, f)).join(', ')} — DESIGN.md §4: destructive = ConfirmActionDialog (the kit ships it; native confirm is unstyled and unaudited)`,
      }
    : { ok: true };
});

check('First-admin gate: some layout redirects to /admin/setup', () => {
  const gated = sourceFiles().some((f) => {
    const rel = relative(ROOT, f).replaceAll('\\', '/');
    if (!/layout\.tsx$/.test(rel) || rel.includes('(admin-setup)')) return false;
    const body = stripComments(readFileSync(f, 'utf8'));
    return /isAdminInitialized/.test(body) && /admin\/setup/.test(body);
  });
  return gated
    ? { ok: true }
    : {
        ok: 'warn',
        msg: "no protected layout checks isAdminInitialized() → redirect('/admin/setup') — the first user lands on a blank permission-less app with no hint the setup page exists (SKILL.md §5.5)",
      };
});

// ── 8. Preserve mode: one shell, no prototype gate (2026-09-09 field report) ─
check('Admin pages live in the project shell, not a second one (§5.6)', () => {
  const rel = (f) => relative(ROOT, f).replaceAll('\\', '/');
  const files = sourceFiles().filter((f) => /\.tsx$/.test(f));
  const inAuthGroups = (r) => /\((admin|admin-setup|auth)\)\//.test(r) || /components\/admin-nav\.tsx$/.test(r);
  const shellLayouts = files.filter((f) => {
    const r = rel(f);
    if (!/layout\.tsx$/.test(r) || inAuthGroups(r)) return false;
    return /SidebarProvider|<aside\b|<nav\b|AppSidebar|site-header|Sidebar\b/.test(stripComments(readFileSync(f, 'utf8')));
  });
  if (!shellLayouts.length) return { ok: true, msg: 'no project shell found — the standalone <AdminNav> fallback is the right one here' };
  // Importing ADMIN_NAV_ITEMS to merge is the correct use; RENDERING <AdminNav> is the bug —
  // and so is a hand-built second shell inside the (admin) group that avoids the name
  // (grader finding 2026-09-10: the AdminNav-only check let that through).
  const renders = files.filter((f) => !/components\/admin-nav\.tsx$/.test(rel(f)) && /<AdminNav\b/.test(stripComments(readFileSync(f, 'utf8'))));
  const secondShells = files.filter((f) => {
    const r = rel(f);
    if (!/\(admin\)\/[^/]*layout\.tsx$/.test(r)) return false;
    return /\bSidebarInset\b|<Sidebar[\s>\/]|<aside\b/.test(stripComments(readFileSync(f, 'utf8')));
  });
  const problems = [];
  if (renders.length) problems.push(`<AdminNav> is still rendered in ${renders.map(rel).join(', ')}`);
  if (secondShells.length) problems.push(`(admin) layout builds its own sidebar/aside: ${secondShells.map(rel).join(', ')}`);
  return problems.length
    ? {
        ok: false,
        msg: `project has a shell (${shellLayouts.map(rel).join(', ')}) but ${problems.join(' · ')} — two competing sidebars / a second template on org tokens; merge ADMIN_NAV_ITEMS into the existing nav and render plain {children} in (admin)/layout.tsx (§5.6, มติ 2026-09-09)`,
      }
    : { ok: true };
});

check('No prototype login gate left beside Better Auth (§5.7)', () => {
  const hits = [];
  for (const f of sourceFiles()) {
    const r = relative(ROOT, f).replaceAll('\\', '/');
    if (/\.(test|spec)\.tsx?$/.test(r) || /\.prisma$/.test(r) || /^(e2e|scripts)\//.test(r)) continue;
    const body = stripComments(readFileSync(f, 'utf8'));
    const m = body.match(/\b(mockUser|MOCK_USER|mockSession|fakeAuth|FAKE_AUTH|DEMO_USERS?|isLoggedIn)\b|localStorage\.(get|set)Item\(\s*['"](token|user|auth|session|currentUser)['"]/);
    if (m) hits.push(`${r}: ${m[0]}`);
  }
  return hits.length
    ? { ok: 'warn', msg: `prototype auth traces — the old gate may still decide who gets in while Better Auth sits beside it: ${hits.slice(0, 5).join(' · ')}${hits.length > 5 ? ` …+${hits.length - 5}` : ''} (§5.7)` }
    : { ok: true };
});

check('.env.local not committed', () => {
  if (!has('.gitignore')) return { ok: false, msg: 'No .gitignore' };
  const ig = read('.gitignore');
  return ig.includes('.env.local') || ig.includes('.env*')
    ? { ok: true }
    : { ok: false, msg: '.gitignore does not cover .env.local — secrets would land in git' };
});

// ── Report ─────────────────────────────────────────────────────────────────
const icon = { true: '✔', false: '✘', warn: '!' };
let failed = 0;
let warned = 0;
console.log('\nugt-nextjs-auth-setup — verify\n');
for (const r of results) {
  const state = r.ok === true ? 'true' : r.ok === 'warn' ? 'warn' : 'false';
  if (state === 'false') failed++;
  if (state === 'warn') warned++;
  console.log(`  ${icon[state]} ${r.name}${r.msg ? `\n      ${r.msg}` : ''}`);
}
console.log(
  `\n${results.length - failed - warned} passed · ${warned} warning(s) · ${failed} failed\n` +
    'Not machine-checkable, exercise by hand: login via every method · logout clears cookie + DB session ·\n' +
    '/admin/setup grants Administrator on one click · ActivityLogs has login.success/logout rows\n'
);
process.exit(failed > 0 ? 1 : 0);
