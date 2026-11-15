#!/usr/bin/env node
// Live-mode gate for ugt-nextjs-system-test: is .env.local filled with the real
// DEV values the admin team returned, and can this machine reach them?
// Read-only — never writes the env file, never prints a secret (key names and
// host:port only).
//
//   node <skill-dir>/scripts/env-ready.mjs [env-file=.env.local] [--no-net]
//   node <skill-dir>/scripts/env-ready.mjs --url <deployed-dev-url>
//
// --url = the deployed DEV target: it runs on Jenkins' env, not .env.local, so
// only the URL is checked (dev basePath + /api/health 200).
//
// exit 0 = ready (warnings allowed) · exit 1 = not ready — report the ✘ lines
// to the user and stop; never "fix" them by editing the file yourself.
import { readFileSync, existsSync } from 'node:fs';
import { connect } from 'node:net';
import { pathToFileURL } from 'node:url';

export function parseEnv(text) {
  const env = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    // quoted value (a trailing `# comment` after the closing quote allowed) → inside the quotes
    const q = v.match(/^(['"])(.*)\1\s*(?:#.*)?$/);
    env.set(m[1], q ? q[2] : v.replace(/\s+#.*$/, ''));
  }
  return env;
}

const PLACEHOLDER = /CHANGE_ME|__[A-Z0-9_]+__|KEYCLOAK_HOST|\/realms\/REALM\b/;
// A module's keys are all-or-nothing: one key of the group present (= module installed)
// makes every key of the group required — a missing or commented-out line must not read
// as "ready". DATABASE_URL is required whenever the project has Prisma (`db`), even when
// the line is gone from the file.
const GROUPS = [
  ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'],
  ['KEYCLOAK_ISSUER', 'KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET'],
];

export function dbTarget(url) {
  const m = url?.match(/^sqlserver:\/\/([^;:\\/]+)(\\[^;:]+)?(?::(\d+))?/i);
  if (!m) return null;
  const db = url.match(/;\s*(?:database|initial catalog)\s*=\s*([^;]+)/i)?.[1]?.trim();
  // named instance without a port: SQL Browser picks the port — nothing to probe
  const port = m[3] ? Number(m[3]) : m[2] ? null : 1433;
  return { host: m[1], port, db };
}

// deployed DEV URL: the org dev basePath is /<project>-dev
export function devUrlProblem(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return `${url} is not a URL`;
  }
  const bp = u.pathname.replace(/\/+$/, '');
  return bp.endsWith('-dev') ? null : `${url} is not a dev URL (basePath must end in -dev) — live tests run on dev only`;
}

export function staticChecks(env, { db = true } = {}) {
  const out = [];
  const fail = (msg) => out.push({ level: 'fail', msg });
  const warn = (msg) => out.push({ level: 'warn', msg });

  for (const [k, v] of env) if (PLACEHOLDER.test(v)) fail(`${k} still holds a placeholder`);
  const required = [...(db || env.has('DATABASE_URL') ? ['DATABASE_URL'] : []), ...GROUPS.filter((g) => g.some((k) => env.has(k))).flat()];
  for (const k of required) {
    if (!env.has(k)) fail(`${k} is missing`);
    else if (env.get(k) === '') fail(`${k} is empty`);
  }
  if (env.has('SMTP_HOST') && env.get('SMTP_HOST') === '')
    warn('SMTP_HOST is empty — mail items will be BLOCKED');

  const secret = env.get('BETTER_AUTH_SECRET');
  if (secret && !PLACEHOLDER.test(secret) && secret.length < 32)
    fail('BETTER_AUTH_SECRET is shorter than 32 characters');

  // dev only: the org basePath convention is /<project>-dev for dev
  const bp = env.get('NEXT_PUBLIC_BASE_PATH');
  if (bp && !bp.endsWith('-dev'))
    fail(`NEXT_PUBLIC_BASE_PATH ${bp} is not a dev basePath — live tests run on dev only`);
  if (!bp) warn('no NEXT_PUBLIC_BASE_PATH — confirm with the user that these are DEV values');

  const url = env.get('DATABASE_URL');
  if (url && !PLACEHOLDER.test(url)) {
    if (/DANGER_PLAINTEXT/i.test(url))
      fail('DATABASE_URL uses encrypt=DANGER_PLAINTEXT — a local test DB, not the real dev DB');
    const t = dbTarget(url);
    if (!t) fail('DATABASE_URL is not a sqlserver:// URL');
    else {
      if (/^(localhost|127\.|\(localdb\)|::1$)/i.test(t.host))
        fail(`DATABASE_URL points at ${t.host} — not the real dev DB`);
      if (t.db && !/dev/i.test(t.db)) warn(`database ${t.db} has no "dev" in its name — confirm it is not prod`);
    }
  }
  return out;
}

function tcp(host, port, ms = 5000) {
  return new Promise((resolve) => {
    const s = connect({ host, port });
    const done = (ok) => {
      s.destroy();
      resolve(ok);
    };
    s.setTimeout(ms, () => done(false));
    s.once('connect', () => done(true));
    s.once('error', () => done(false));
  });
}

export async function netChecks(env) {
  const out = [];
  const t = dbTarget(env.get('DATABASE_URL'));
  if (t && t.port === null)
    out.push({ level: 'warn', msg: `SQL Server ${t.host} is a named instance without a port — reachability not probed` });
  else if (t) {
    const ok = await tcp(t.host, t.port);
    out.push({
      level: ok ? 'ok' : 'fail',
      msg: `SQL Server ${t.host}:${t.port} ${ok ? 'reachable' : 'unreachable (VPN? firewall?)'}`,
    });
  }
  const issuer = env.get('KEYCLOAK_ISSUER')?.replace(/\/$/, '');
  if (issuer && !PLACEHOLDER.test(issuer)) {
    // org standard: internal-CA Keycloak — the same switch the app runs with
    if (env.get('NODE_TLS_REJECT_UNAUTHORIZED') === '0') process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let problem;
    try {
      const res = await fetch(`${issuer}/.well-known/openid-configuration`, {
        signal: AbortSignal.timeout(8000),
      });
      const body = res.ok ? await res.json() : null;
      if (!res.ok) problem = `HTTP ${res.status}`;
      else if (body?.issuer?.replace(/\/$/, '') !== issuer)
        problem = `discovery issuer is ${body?.issuer} — KEYCLOAK_ISSUER must match it exactly`;
    } catch (e) {
      problem = e?.cause?.code ?? e?.name ?? 'request failed';
    }
    out.push({ level: problem ? 'fail' : 'ok', msg: `Keycloak ${issuer} ${problem ?? 'answers discovery'}` });
  }
  const smtp = env.get('SMTP_HOST');
  if (smtp && !PLACEHOLDER.test(smtp)) {
    const port = Number(env.get('SMTP_PORT') || 25);
    const ok = await tcp(smtp, port);
    out.push({
      level: ok ? 'ok' : 'warn',
      msg: `SMTP ${smtp}:${port} ${ok ? 'reachable' : 'unreachable — mail items will be BLOCKED'}`,
    });
  }
  return out;
}

async function urlChecks(url) {
  const problem = devUrlProblem(url);
  if (problem) return [{ level: 'fail', msg: problem }];
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // org standard: internal-CA certs on the intranet
  const health = `${url.replace(/\/+$/, '')}/api/health`;
  let status;
  try {
    status = (await fetch(health, { signal: AbortSignal.timeout(8000) })).status;
  } catch (e) {
    status = e?.cause?.code ?? e?.name ?? 'request failed';
  }
  return [{ level: status === 200 ? 'ok' : 'fail', msg: `${health} → ${status}${status === 200 ? '' : ' (deployed? VPN?)'}` }];
}

async function main() {
  const args = process.argv.slice(2);
  const urlAt = args.indexOf('--url');
  let results;
  if (urlAt !== -1) {
    results = await urlChecks(args[urlAt + 1] ?? '');
  } else {
    const file = args.find((a) => !a.startsWith('--')) ?? '.env.local';
    if (!existsSync(file)) {
      console.log(`✘ ${file} not found — copy .env.example and fill the values from docs/admin-handoff.md`);
      process.exit(1);
    }
    const env = parseEnv(readFileSync(file, 'utf8'));
    results = staticChecks(env, { db: existsSync('prisma') || existsSync('prisma.config.ts') });
    // network checks only once the file itself is right — no point probing a placeholder host
    if (!args.includes('--no-net') && !results.some((r) => r.level === 'fail'))
      results.push(...(await netChecks(env)));
  }
  const icon = { ok: '✔', warn: '!', fail: '✘' };
  for (const r of results) console.log(`${icon[r.level]} ${r.msg}`);
  const failed = results.filter((r) => r.level === 'fail').length;
  console.log(failed ? `\n${failed} problem(s) — not ready for the live test` : '\n✔ env ready for the live test');
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
