// node --test plugins/ugt-core/scripts/eval-runner.test.mjs
// Tests the ugt-eval skill's runner asset (skills/ugt-eval/assets/run.mjs)
// end to end against a fake `claude` on PATH — no API calls.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluate, projectFiles } from '../skills/ugt-eval/assets/run.mjs';

const RUNNER = join(dirname(fileURLToPath(import.meta.url)), '../skills/ugt-eval/assets/run.mjs');

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'ugt-eval-test-'));
  const git = (...a) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  writeFileSync(join(dir, 'CLAUDE.md'), 'codename BLUEHERON');
  writeFileSync(join(dir, '.gitignore'), '.env\nevals/claude/results/\n');
  writeFileSync(join(dir, '.env'), 'SECRET=real');
  mkdirSync(join(dir, 'evals/claude/cases'), { recursive: true });
  cpSync(RUNNER, join(dir, 'evals/claude/run.mjs'));
  git('add', '-A');
  git('commit', '-qm', 'init');
  return dir;
}

test('evaluate: file, answer and run checks', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ugt-eval-chk-'));
  writeFileSync(join(dir, 'a.ts'), 'import { env } from "@/lib/env"\nexport const k = env.KEY');
  const ctx = { dir, answer: 'เสร็จแล้ว codename BLUEHERON' };
  const ok = (c) => evaluate(c, ctx).ok;
  assert.equal(ok({ file: 'a.ts', contains: '^export const k' }), true);
  assert.equal(ok({ file: 'a.ts', notContains: 'process\\.env' }), true);
  assert.equal(ok({ file: 'missing.ts', notContains: 'x' }), true, 'nothing written cannot contain it');
  assert.equal(ok({ file: 'missing.ts', contains: 'x' }), false);
  assert.equal(ok({ file: 'missing.ts', exists: false }), true);
  assert.equal(ok({ file: 'a.ts' }), true);
  assert.equal(ok({ answer: 'BLUEHERON' }), true);
  assert.equal(ok({ answerNot: 'ไม่สามารถ' }), true);
  assert.equal(ok({ run: 'node -e "process.exit(0)"' }), true);
  assert.equal(ok({ run: 'node -e "process.exit(3)"' }), false);
  assert.equal(ok({ nonsense: 1 }), false);
});

test('projectFiles: tracked + untracked, never ignored files or the eval suite', () => {
  const dir = repo();
  writeFileSync(join(dir, 'new.ts'), 'x');
  writeFileSync(join(dir, 'evals/claude/cases/a.json'), '{}');
  const files = projectFiles(dir);
  assert.ok(files.includes('CLAUDE.md') && files.includes('new.ts'));
  assert.ok(!files.includes('.env'), '.env is ignored → never copied');
  assert.ok(!files.some((f) => f.startsWith('evals/claude/')), 'the agent must not see the checks');
});

test('end to end with a fake claude: pass, fail, exit code, results file', () => {
  const dir = repo();
  // fake claude: writes out.txt from the prompt (stdin) and answers with the codename it can see
  const bin = mkdtempSync(join(tmpdir(), 'ugt-eval-bin-'));
  const fake = join(bin, 'fake-claude.mjs');
  writeFileSync(
    fake,
    `import fs from 'node:fs';
const prompt = fs.readFileSync(0, 'utf8');
fs.writeFileSync('out.txt', prompt.toUpperCase());
const seen = fs.existsSync('evals/claude') ? 'LEAK' : fs.readFileSync('CLAUDE.md', 'utf8');
console.log(JSON.stringify({ type: 'result', result: 'done ' + seen, total_cost_usd: 0.01, num_turns: 2, is_error: false }));`
  );
  writeFileSync(join(bin, 'claude.cmd'), `@node "${fake}"\r\n`);
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\nexec node "${fake}"\n`);
  chmodSync(join(bin, 'claude'), 0o755);

  writeFileSync(join(dir, 'evals/claude/cases/good.json'), JSON.stringify({ prompt: 'hello', checks: [{ file: 'out.txt', contains: 'HELLO' }, { answer: 'BLUEHERON' }, { answerNot: 'LEAK' }] }));
  writeFileSync(join(dir, 'evals/claude/cases/bad.json'), JSON.stringify({ prompt: 'x', checks: [{ file: 'out.txt', contains: 'NOPE' }] }));

  const env = { ...process.env, PATH: `${bin}${delimiter}${process.env.PATH}` };
  const run = (...a) => spawnSync(process.execPath, ['evals/claude/run.mjs', ...a], { cwd: dir, env, encoding: 'utf8' });

  const good = run('good');
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /good … 3\/3/);

  const all = run();
  assert.equal(all.status, 1);
  assert.match(all.stdout, /bad … 0\/1[\s\S]*✘ out\.txt must match \/NOPE\//);
  assert.match(all.stdout, /1\/2 cases passed/);
  assert.equal(readdirSync(join(dir, 'evals/claude/results')).length, 2);
  assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), 'codename BLUEHERON', 'the real tree is untouched');

  assert.equal(run('nomatch').status, 2);
});
