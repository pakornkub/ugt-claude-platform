// node --test plugins/ugt-nextjs-platform/skills/ugt-nextjs-system-test/scripts/env-ready.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnv, staticChecks, dbTarget, devUrlProblem } from './env-ready.mjs';

const fails = (text) =>
  staticChecks(parseEnv(text))
    .filter((r) => r.level === 'fail')
    .map((r) => r.msg);

const READY = `
NEXT_PUBLIC_BASE_PATH=/expense-portal-dev
DATABASE_URL="sqlserver://sql-dev01:1433;database=Expense_Dev;user=expense_app;password=x;encrypt=true;trustServerCertificate=true"
BETTER_AUTH_SECRET=0123456789abcdef0123456789abcdef01
BETTER_AUTH_URL=https://apps.example.com
KEYCLOAK_ISSUER=https://sso.example.com/realms/org
KEYCLOAK_CLIENT_ID=expense-portal
KEYCLOAK_CLIENT_SECRET=s3cret # comment
`;

test('a filled dev env passes', () => assert.deepEqual(fails(READY), []));

test('placeholders fail by key name, never by value', () => {
  const msgs = fails(READY.replace('s3cret', 'CHANGE_ME').replace('sso.example.com', 'KEYCLOAK_HOST'));
  assert.deepEqual(msgs.sort(), [
    'KEYCLOAK_CLIENT_SECRET still holds a placeholder',
    'KEYCLOAK_ISSUER still holds a placeholder',
  ]);
});

test('prod basePath is refused', () => {
  assert.match(fails(READY.replace('/expense-portal-dev', '/expense-portal')).join(), /not a dev basePath/);
});

test('a local smoke DB is refused', () => {
  const local = READY.replace('sql-dev01:1433', '127.0.0.1:14330').replace(
    'encrypt=true',
    'encrypt=DANGER_PLAINTEXT',
  );
  const msgs = fails(local).join('\n');
  assert.match(msgs, /DANGER_PLAINTEXT/);
  assert.match(msgs, /127\.0\.0\.1/);
});

test('empty required key fails, empty SMTP only warns', () => {
  const r = staticChecks(
    parseEnv(READY.replace('BETTER_AUTH_URL=https://apps.example.com', 'BETTER_AUTH_URL=') + '\nSMTP_HOST=\n'),
  );
  assert.ok(r.some((x) => x.level === 'fail' && x.msg === 'BETTER_AUTH_URL is empty'));
  assert.ok(r.some((x) => x.level === 'warn' && /SMTP_HOST/.test(x.msg)));
});

test('dbTarget reads host, port, database and named instances', () => {
  assert.deepEqual(dbTarget('sqlserver://sql-dev01;database=A_Dev'), { host: 'sql-dev01', port: 1433, db: 'A_Dev' });
  assert.deepEqual(dbTarget('sqlserver://db\\INST:1500;database=B'), { host: 'db', port: 1500, db: 'B' });
  assert.deepEqual(dbTarget('sqlserver://db\\INST;database=B'), { host: 'db', port: null, db: 'B' });
});

test('an empty file or a half-filled module is not ready', () => {
  assert.deepEqual(fails(''), ['DATABASE_URL is missing']);
  const noSecret = READY.replace(/^KEYCLOAK_CLIENT_SECRET=.*$/m, '# KEYCLOAK_CLIENT_SECRET=');
  assert.deepEqual(fails(noSecret), ['KEYCLOAK_CLIENT_SECRET is missing']);
});

test('a project without Prisma does not need DATABASE_URL', () => {
  assert.deepEqual(staticChecks(parseEnv(''), { db: false }).filter((r) => r.level === 'fail'), []);
});

test('a deployed URL must be the dev one', () => {
  assert.equal(devUrlProblem('https://apps.example.com/expense-portal-dev/'), null);
  assert.match(devUrlProblem('https://apps.example.com/expense-portal'), /not a dev URL/);
  assert.match(devUrlProblem('apps.example.com'), /not a URL/);
});

test('a quoted value with a trailing comment keeps its content', () => {
  const env = parseEnv('DATABASE_URL="sqlserver://h:1433;database=X_Dev" # dev db');
  assert.equal(env.get('DATABASE_URL'), 'sqlserver://h:1433;database=X_Dev');
});
