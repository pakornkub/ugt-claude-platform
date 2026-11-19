// node --test plugins/ugt-nextjs-platform/scripts/guard-edits.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check, editText } from './guard-edits.mjs';

const app = { hasEnvModule: true };
const run = (rel, added, after = added, opts = app) => check(rel, added, after, opts)?.decision ?? 'allow';

test('server env read in app code is denied; NEXT_PUBLIC_/NODE_ENV and exempt files pass', () => {
  assert.equal(run('app/actions/leave.ts', 'const k = process.env.SMTP_PASSWORD'), 'deny');
  assert.equal(run('src/lib/mail.ts', 'const { DATABASE_URL } = process.env'), 'deny');
  assert.equal(run('lib/x.ts', "process.env['SECRET']"), 'deny');
  assert.equal(run('components/nav.tsx', 'process.env.NEXT_PUBLIC_BASE_PATH ?? ""'), 'allow');
  assert.equal(run('proxy.ts', "process.env.NODE_ENV === 'development'"), 'allow');
  for (const f of ['lib/env.ts', 'next.config.ts', 'instrumentation.ts', 'lib/a.test.ts', 'tests/x.ts', 'scripts/seed.ts', 'prisma/seed.ts']) {
    assert.equal(run(f, 'process.env.DATABASE_URL'), 'allow', f);
  }
  // no lib/env.ts yet (database-setup not installed) → nothing to point at, allow
  assert.equal(run('app/page.tsx', 'process.env.SECRET', undefined, { hasEnvModule: false }), 'allow');
});

test('url inside the prisma datasource is denied, url elsewhere is not', () => {
  const bad = 'datasource db {\n  provider = "sqlserver"\n  url = env("DATABASE_URL")\n}';
  const good = 'datasource db {\n  provider = "sqlserver"\n}\nmodel A { url String @map("Url") }';
  assert.equal(run('prisma/schema.prisma', '  url = env("X")', bad), 'deny');
  assert.equal(run('prisma/schema.prisma', good), 'allow');
});

test('raw unsafe SQL asks', () => {
  assert.equal(run('lib/data/r.ts', 'await prisma.$queryRawUnsafe(sql)'), 'ask');
  assert.equal(run('lib/data/r.ts', 'await prisma.$queryRaw`SELECT ${a}`'), 'allow');
});

test('real secrets in committed files ask; placeholders and ignored env files pass', () => {
  const real = 'DATABASE_URL="sqlserver://db01:1433;database=App;user=app;password=S3cretPass!;encrypt=true"';
  assert.equal(run('docker-compose.yml', real), 'ask');
  assert.equal(run('Jenkinsfile', 'x;Password=lowercaseonly;y'), 'ask');
  assert.equal(run('docs/admin-handoff.md', '-----BEGIN RSA PRIVATE KEY-----'), 'ask');
  assert.equal(run('.env.example', real), 'ask');
  for (const f of ['.env', '.env.dev', '.env.local']) assert.equal(run(f, real), 'allow', f);
  for (const v of ['CHANGE_ME', 'CHANGE_ME_DB_PASSWORD', 'PASS', '${DB_PASSWORD}', '$DB_PASSWORD', '<password>', '__DB_PASSWORD__']) {
    assert.equal(run('.env.example', `x;password=${v};encrypt=true`), 'allow', v);
  }
  // code that merely names a password, and throwaway test stacks, are not secrets
  assert.equal(run('app/users/page.tsx', 'const canResetPassword = perms.includes(X)'), 'allow');
  assert.equal(run('lib/auth.ts', "const password = formData.get('password')"), 'allow');
  assert.equal(run('docker-compose.smoke.yml', real), 'allow');
  assert.equal(run('lib/env.test.ts', real), 'allow');
});

test('editText applies Edit / MultiEdit to the current file', () => {
  const cur = 'datasource db {\n  provider = "sqlserver"\n}';
  const e = editText('Edit', { old_string: '  provider = "sqlserver"', new_string: '  provider = "sqlserver"\n  url = env("X")' }, cur);
  assert.match(e.after, /url = env/);
  const m = editText('MultiEdit', { edits: [{ old_string: 'db', new_string: 'main' }, { old_string: 'sqlserver', new_string: 'x', replace_all: true }] }, cur);
  assert.equal(m.after, 'datasource main {\n  provider = "x"\n}');
});

test('end to end: acts only in a project with the ugt block', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'guard-edits.mjs');
  const proj = mkdtempSync(join(tmpdir(), 'ugt-guard-'));
  mkdirSync(join(proj, 'lib'));
  writeFileSync(join(proj, 'lib', 'env.ts'), 'export const env = {}');
  const event = JSON.stringify({ cwd: proj, tool_name: 'Write', tool_input: { file_path: join(proj, 'app.ts'), content: 'process.env.SECRET' } });
  const call = () => spawnSync(process.execPath, [script], { input: event, env: { ...process.env, CLAUDE_PROJECT_DIR: proj } }).stdout.toString();

  assert.equal(call(), '', 'no CLAUDE.md → silent');
  writeFileSync(join(proj, 'CLAUDE.md'), '# x\n<!-- ugt:start 4.95.0 -->\n<!-- ugt:end -->');
  assert.equal(JSON.parse(call()).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(spawnSync(process.execPath, [script], { input: 'not json' }).status, 0, 'bad input fails open');
});
