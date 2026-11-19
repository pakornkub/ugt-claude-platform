#!/usr/bin/env node
// Edit guard — the deterministic layer behind the "Rules that break the build
// every time" in the ugt CLAUDE.md block. A rule written in CLAUDE.md or a skill
// is advice; this hook enforces the few that can be checked from the text being
// written, before it lands.
//
// Invoked from hooks/hooks.json (PreToolUse on Write|Edit|MultiEdit). Pure
// shell command, no LLM call. Acts only in a project whose CLAUDE.md carries the
// ugt block (the plugin installs at user scope, so it sees every repo on the
// machine). Checks only the NEW text of the edit, so legacy code is never
// blocked for lines the edit does not touch. Fails open: a guard bug must
// never block a session.
import { existsSync, readFileSync } from 'node:fs';
import { basename, isAbsolute, join, relative } from 'node:path';

const CODE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

// Files allowed to read process.env directly (ugt-nextjs-database rule § Env),
// plus scripts/ and prisma/ (seed, one-off tools) that run outside the app.
const ENV_EXEMPT = [
  /^(src\/)?lib\/env\.(ts|js|mjs)$/,
  /^[^/]+\.config\.(ts|js|mjs|cjs)$/,
  /^(src\/)?instrumentation[^/]*\.(ts|js)$/,
  /^sentry\.[^/]+\.config\.(ts|js)$/,
  /(^|\/)(__tests__|tests?)\//,
  /\.(test|spec)\.[^/]+$/,
  /^vitest\.setup\.[^/]+$/,
  /^(scripts|prisma)\//,
];

// NEXT_PUBLIC_* and NODE_ENV are inlined at build time — the kit reads them
// directly on purpose (a createEnv() read skips inlining in client bundles).
const SERVER_ENV_READ = /process\.env(?:\.(?!NEXT_PUBLIC_|NODE_ENV\b)\w+|\s*\[|\s*\))|\{[^}]*\}\s*=\s*process\.env\b/;

const RAW_UNSAFE = /\$(queryRawUnsafe|executeRawUnsafe)\b/;

// A real password in a SQL Server connection string (`;password=`), or a
// private key — outside the gitignored env files and throwaway test stacks.
// Placeholders pass: ALL_CAPS (CHANGE_ME, PASS), ${VAR}, $VAR, <x>, __X__.
// no /i flag: the ALL_CAPS placeholder test must stay case-sensitive
const CONN_PASSWORD = /;\s*(?:[Pp]assword|PASSWORD|[Pp]wd|PWD)\s*=\s*(?![A-Z_]+(?=[;"'`\s]|$)|\$\{|\$[A-Z_]|<|__|\*{3}|["';])[^;\s"'`]{4,}/;
const PRIVATE_KEY = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const IGNORED_ENV_FILE = /^\.env(\.(?!example$)[\w.-]+)?$/;
const FAKE_SECRET_OK = [/(^|\/)(__tests__|tests?)\//, /\.(test|spec)\.[^/]+$/, /\.smoke\.[^/]+$/];

/** Text the edit adds, and the whole file after the edit (for schema checks). */
export function editText(toolName, input, current = '') {
  if (toolName === 'Write') return { added: input.content ?? '', after: input.content ?? '' };
  const edits = toolName === 'MultiEdit' ? input.edits ?? [] : [input];
  let after = current;
  for (const e of edits) {
    after = e.replace_all ? after.split(e.old_string).join(e.new_string) : after.replace(e.old_string, () => e.new_string);
  }
  return { added: edits.map((e) => e.new_string ?? '').join('\n'), after };
}

/** Returns null (allow) or { decision: 'deny' | 'ask', reason }. */
export function check(rel, added, after, { hasEnvModule }) {
  rel = rel.replace(/\\/g, '/');

  if (rel === 'prisma/schema.prisma') {
    const ds = after.match(/datasource\s+\w+\s*\{[^}]*\}/);
    if (ds && /^\s*url\s*=/m.test(ds[0])) {
      return {
        decision: 'deny',
        reason:
          'ugt: `url` ใน datasource ของ schema.prisma ทำให้ prisma generate พัง (Prisma 7) — DATABASE_URL อยู่ใน prisma.config.ts เท่านั้น ลบบรรทัด url ออกจาก datasource',
      };
    }
  }

  if (CODE.test(rel) && hasEnvModule && !ENV_EXEMPT.some((re) => re.test(rel)) && SERVER_ENV_READ.test(added)) {
    return {
      decision: 'deny',
      reason:
        "ugt: ห้ามอ่าน process.env ตรง ๆ ในโค้ดแอป — ใช้ `import { env } from '@/lib/env'` (ตัวแปรใหม่ให้เพิ่ม schema ใน lib/env.ts ก่อน) · ยกเว้น NEXT_PUBLIC_* / NODE_ENV ที่ build ฝังให้, lib/env.ts, *.config.*, instrumentation*, test, scripts/, prisma/",
    };
  }

  if (CODE.test(rel) && RAW_UNSAFE.test(added)) {
    return {
      decision: 'ask',
      reason:
        'ugt: $queryRawUnsafe / $executeRawUnsafe — ห้ามใช้กับค่าที่มาจากผู้ใช้ (SQL injection) ใช้ tagged template `prisma.$queryRaw`...${x}`` แทน · อนุมัติเฉพาะเมื่อ SQL ไม่มีค่าจากผู้ใช้เลย',
    };
  }

  const secretAllowed = IGNORED_ENV_FILE.test(basename(rel)) || FAKE_SECRET_OK.some((re) => re.test(rel));
  if (!secretAllowed && (PRIVATE_KEY.test(added) || CONN_PASSWORD.test(added))) {
    return {
      decision: 'ask',
      reason:
        'ugt: ข้อความนี้มีรหัสผ่านใน connection string หรือ private key ในไฟล์ที่ถูก commit — secret อยู่ได้แค่ใน .env / .env.dev / .env.local (gitignore) หรือ Jenkins credential · ในไฟล์อื่นใช้ CHANGE_ME หรือ ${VAR} · อนุมัติเฉพาะเมื่อเป็นค่าทดสอบปลอม',
    };
  }

  return null;
}

function main(raw) {
  const event = JSON.parse(raw);
  const project = process.env.CLAUDE_PROJECT_DIR || event.cwd || process.cwd();
  const claudeMd = join(project, 'CLAUDE.md');
  if (!existsSync(claudeMd) || !readFileSync(claudeMd, 'utf8').includes('<!-- ugt:start')) return;

  const input = event.tool_input ?? {};
  if (!input.file_path) return;
  const abs = isAbsolute(input.file_path) ? input.file_path : join(project, input.file_path);
  const rel = relative(project, abs);
  if (rel.startsWith('..') || isAbsolute(rel)) return;

  const current = event.tool_name !== 'Write' && existsSync(abs) ? readFileSync(abs, 'utf8') : '';
  const { added, after } = editText(event.tool_name, input, current);
  const hasEnvModule = ['lib/env.ts', 'src/lib/env.ts'].some((p) => existsSync(join(project, p)));
  const verdict = check(rel, added, after, { hasEnvModule });
  if (!verdict) return;

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: verdict.decision,
        permissionDecisionReason: verdict.reason,
      },
    })
  );
}

if (process.argv[1]?.endsWith('guard-edits.mjs')) {
  let raw = '';
  process.stdin.on('data', (c) => (raw += c));
  process.stdin.on('end', () => {
    try {
      main(raw);
    } catch {
      // unreadable event / file → allow; never block on the guard's own failure
    }
  });
}
