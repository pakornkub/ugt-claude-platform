#!/usr/bin/env node
// Project eval runner — installed by the ugt-eval skill (ugt-core) as
// evals/claude/run.mjs; owned by the platform, replaced on re-install.
//
// Runs each case in evals/claude/cases/*.json as a REAL headless Claude Code
// session (`claude -p`) in a throwaway copy of the working tree — so it
// exercises this repo's CLAUDE.md, .claude/rules, REVIEW.md AND the user-scope
// plugins (skills, hooks) exactly as a developer session would. Then it checks
// the result deterministically: files, the final answer, and commands.
//
//   node evals/claude/run.mjs                 # every case
//   node evals/claude/run.mjs env-read auth-  # cases whose name starts with these
//   node evals/claude/run.mjs --keep          # keep the copies (paths printed)
//   node evals/claude/run.mjs --model sonnet  # override every case's model
//
// Exit 0 = every check passed · 1 = a check failed · 2 = setup error.
// Each case costs real money (default cap 2 USD per case, `budgetUsd` overrides).
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const EVAL_DIR = 'evals/claude';
const DEFAULT_TOOLS = ['Read', 'Glob', 'Grep', 'Write', 'Edit'];

/** One check → { ok, msg }. `ctx` = { dir, answer }. */
export function evaluate(check, ctx) {
  const re = (src) => new RegExp(src, 'm');
  if (check.file !== undefined) {
    const p = join(ctx.dir, check.file);
    const has = existsSync(p);
    const text = has ? readFileSync(p, 'utf8') : '';
    if (check.exists === false) return { ok: !has, msg: `${check.file} must not exist` };
    if (check.notContains !== undefined) return { ok: !re(check.notContains).test(text), msg: `${check.file} must not match /${check.notContains}/` };
    if (!has) return { ok: false, msg: `${check.file} missing` };
    if (check.contains !== undefined) return { ok: re(check.contains).test(text), msg: `${check.file} must match /${check.contains}/` };
    return { ok: true, msg: `${check.file} exists` };
  }
  if (check.answer !== undefined || check.answerNot !== undefined) {
    return check.answer !== undefined
      ? { ok: re(check.answer).test(ctx.answer), msg: `answer must match /${check.answer}/` }
      : { ok: !re(check.answerNot).test(ctx.answer), msg: `answer must not match /${check.answerNot}/` };
  }
  if (check.run !== undefined) {
    const r = spawnSync(check.run, { cwd: ctx.dir, shell: true, encoding: 'utf8', timeout: 300_000 });
    const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-5).join('\n');
    return { ok: r.status === 0, msg: `\`${check.run}\` must exit 0${r.status === 0 ? '' : ` (got ${r.status})\n${tail}`}` };
  }
  return { ok: false, msg: `unknown check ${JSON.stringify(check)}` };
}

/** Tracked + untracked-not-ignored files, minus the eval suite itself (the agent must not see the checks). */
export function projectFiles(root) {
  return execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0')
    .filter((f) => f && !f.startsWith(`${EVAL_DIR}/`) && existsSync(join(root, f)));
}

function copyProject(root) {
  const dir = mkdtempSync(join(tmpdir(), 'ugt-eval-'));
  for (const f of projectFiles(root)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    cpSync(join(root, f), join(dir, f));
  }
  // dependencies for `run` checks — linked, never copied (junction needs no admin rights on Windows)
  if (existsSync(join(root, 'node_modules'))) symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'), 'junction');
  const git = (...a) => execFileSync('git', ['-c', 'user.name=ugt-eval', '-c', 'user.email=ugt-eval@localhost', ...a], { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-qm', 'eval baseline', '--no-verify');
  return dir;
}

function runClaude(c, dir, modelOverride) {
  const args = ['-p', '--output-format', 'json', '--permission-mode', 'dontAsk', '--no-session-persistence',
    '--allowedTools', (c.tools ?? DEFAULT_TOOLS).join(','), '--max-budget-usd', String(c.budgetUsd ?? 2)];
  const model = modelOverride ?? c.model;
  if (model) args.push('--model', model);
  // prompt via stdin: no shell quoting of Thai text; shell only so Windows finds claude.cmd
  const r = spawnSync('claude', args, { cwd: dir, input: c.prompt, encoding: 'utf8', shell: process.platform === 'win32', timeout: (c.timeoutSeconds ?? 900) * 1000, maxBuffer: 64 << 20 });
  const line = (r.stdout ?? '').trim().split('\n').pop() ?? '';
  try {
    const out = JSON.parse(line);
    return { answer: out.result ?? '', cost: out.total_cost_usd ?? 0, turns: out.num_turns ?? 0, error: out.is_error ? out.subtype : null };
  } catch {
    return { answer: '', cost: 0, turns: 0, error: (r.error?.message ?? r.stderr ?? 'no output').trim().slice(0, 300) };
  }
}

function main(argv) {
  const keep = argv.includes('--keep');
  const mi = argv.indexOf('--model');
  const model = mi >= 0 ? argv[mi + 1] : undefined;
  const names = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--model');

  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const casesDir = join(root, EVAL_DIR, 'cases');
  const files = existsSync(casesDir) ? readdirSync(casesDir).filter((f) => f.endsWith('.json')).sort() : [];
  const cases = files
    .map((f) => ({ name: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(casesDir, f), 'utf8')) }))
    .filter((c) => !names.length || names.some((n) => c.name.startsWith(n)));
  if (!cases.length) {
    console.error(`no cases in ${EVAL_DIR}/cases/${names.length ? ` matching ${names.join(' ')}` : ''}`);
    return 2;
  }

  const results = [];
  for (const c of cases) {
    process.stdout.write(`▶ ${c.name} … `);
    const dir = copyProject(root);
    const run = runClaude(c, dir, model);
    const checks = run.error && !run.answer ? [{ ok: false, msg: `claude failed: ${run.error}` }] : (c.checks ?? []).map((k) => evaluate(k, { dir, answer: run.answer }));
    const passed = checks.filter((k) => k.ok).length;
    results.push({ name: c.name, passed, total: checks.length, cost: run.cost, turns: run.turns, checks, answer: run.answer, dir: keep ? dir : undefined });
    console.log(`${passed}/${checks.length} · $${run.cost.toFixed(2)} · ${run.turns} turns${keep ? ` · ${dir}` : ''}`);
    for (const k of checks.filter((x) => !x.ok)) console.log(`   ✘ ${k.msg.replace(/\n/g, '\n     ')}`);
    if (!keep) rmSync(dir, { recursive: true, force: true });
  }

  const ok = results.every((r) => r.passed === r.total);
  const cost = results.reduce((s, r) => s + r.cost, 0);
  console.log(`\n${results.filter((r) => r.passed === r.total).length}/${results.length} cases passed · $${cost.toFixed(2)}`);
  const out = join(root, EVAL_DIR, 'results');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify({ cost, results }, null, 2));
  return ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('run.mjs') && !process.argv[1].includes('.test.')) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
  }
}
