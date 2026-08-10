#!/usr/bin/env node
// Runnable version of the ugt-nextjs-auth-setup Verification Checklist (machine-checkable part)
//
//   node <path-to-skill>/scripts/verify.mjs
//
// Anchors at process.cwd() as the project root — a file that should exist but
// can't be found is a FAIL, never a pass.
// Real flow testing (login via every method, logout clearing the cookie,
// /admin/setup) cannot be machine-checked — walk §8 of SKILL.md by hand.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const results = [];
const p = (...s) => join(ROOT, ...s);
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

// ── 1. Required files ──────────────────────────────────────────────────────
check('Core auth files present', () => {
  const missing = AUTH_FILES.filter((f) => !has(f));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.join(', ')} — run ugt-nextjs-auth-setup first` }
    : { ok: true };
});

check('proxy.ts, not middleware.ts', () => {
  if (has('middleware.ts') && !has('proxy.ts')) {
    return { ok: false, msg: 'Found middleware.ts — Next.js 16 uses proxy.ts; the guard will never run' };
  }
  return { ok: true };
});

check('First-admin bootstrap page exists', () => {
  const candidates = [
    'app/(admin-setup)/admin/setup/page.tsx',
    'app/admin/setup/page.tsx',
    'src/app/(admin-setup)/admin/setup/page.tsx',
  ];
  return candidates.some((c) => has(c))
    ? { ok: true }
    : { ok: false, msg: 'No /admin/setup page — a fresh deployment has no way to mint an Administrator' };
});

check('Ongoing admin pages exist (users / roles / audit-logs)', () => {
  const required = [
    ['app/(admin)/admin/users/page.tsx', 'app/admin/users/page.tsx'],
    ['app/(admin)/admin/roles/page.tsx', 'app/admin/roles/page.tsx'],
    ['app/(admin)/admin/audit-logs/page.tsx', 'app/admin/audit-logs/page.tsx'],
  ];
  const missing = required.filter((candidates) => !candidates.some((c) => has(c)));
  return missing.length
    ? { ok: false, msg: `Missing: ${missing.map((c) => c[0]).join(', ')} — the RBAC data model exists but nobody can manage it` }
    : { ok: true };
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

// ── 2. Leftover placeholders (including the one hidden mid-file) ───────────
const PLACEHOLDERS = [
  '__PROJECT_NAME__',
  '__BASE_PATH__',
  '__KEYCLOAK_HOST__',
  '__REALM__',
  '__LDAP_HOST__',
  '__AD_BASE_DN__',
  '__COMPANY_DOMAIN__',
  '__APP_HOST__',
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

check('All [METHOD: …] markers removed', () => {
  const found = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    const hits = [...new Set([...body.matchAll(/\[METHOD:\s*[^\]]+\]/g)].map((m) => m[0]))];
    if (hits.length) found.push(`${relative(ROOT, file)}: ${hits.join(', ')}`);
  }
  return found.length
    ? { ok: false, msg: `Markers remain (sections for unselected methods were not cut): ${found.join(' · ')}` }
    : { ok: true };
});

// ── 3. Cookie prefix must match across 3 files ─────────────────────────────
check('Cookie prefix consistent across all 3 files', () => {
  const targets = ['lib/auth.ts', 'proxy.ts', 'lib/actions/auth.ts'];
  const missing = targets.filter((f) => !has(f));
  if (missing.length) return { ok: false, msg: `Missing files: ${missing.join(', ')}` };
  const noPrefix = targets.filter((f) => !/cookiePrefix|APP_COOKIE_PREFIX/.test(read(f)));
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
  if (!has('proxy.ts')) return { ok: false, msg: 'No proxy.ts' };
  const body = stripComments(read('proxy.ts'));
  // Flag only *assignments* to url.pathname that mention basePath on the same line
  const bad = body
    .split('\n')
    .filter((l) => /\burl\.pathname\s*=/.test(l))
    .filter((l) => /basePath|BASE_PATH/.test(l));
  return bad.length
    ? { ok: false, msg: `basePath appended to url.pathname manually → duplicated basePath in the URL (clone() already carries it): ${bad.map((l) => l.trim()).join(' · ')}` }
    : { ok: true };
});

check('proxy bypasses /_next/ and /api/health', () => {
  if (!has('proxy.ts')) return { ok: false, msg: 'No proxy.ts' };
  const body = read('proxy.ts');
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
  if (has('proxy.ts') && !/reset-password/.test(read('proxy.ts'))) {
    problems.push('/reset-password is not public in proxy.ts — the mailed link bounces to /login');
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
    if (!/^app\/(api|\()|^lib\/actions\//.test(rel)) continue;
    if (rel.startsWith('lib/scope')) continue;
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
