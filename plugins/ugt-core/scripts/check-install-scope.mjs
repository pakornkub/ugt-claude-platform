#!/usr/bin/env node
// Install-scope guard — flags @ugt plugins installed at project/local scope
// for the project this session opened.
//
// Invoked from hooks/hooks.json (SessionStart). Pure shell command, no LLM call.
//
// Why: platform plugins install at user scope only (contracts/harness.md). A
// project-scope record — created by `--scope project` or by a committed
// `enabledPlugins` key — updates apart from the user-scope one, so
// `/plugin update` in one project leaves the others on the old version.
// Silent on every failure: a guard must never block a session.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const norm = (p) => (process.platform === 'win32' ? resolve(p).toLowerCase() : resolve(p));

try {
  const project = norm(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  const { plugins = {} } = JSON.parse(readFileSync(join(configDir, 'plugins', 'installed_plugins.json'), 'utf8'));

  const fixes = [];
  for (const [id, installs] of Object.entries(plugins)) {
    if (!id.endsWith('@ugt')) continue;
    const here = installs.filter((e) => (e.scope === 'project' || e.scope === 'local') && e.projectPath && norm(e.projectPath) === project);
    if (!here.length) continue;
    // Install at user scope first, or the uninstall below removes the plugin outright.
    if (!installs.some((e) => e.scope === 'user' || e.scope === 'managed')) fixes.push(`claude plugin install ${id} --scope user`);
    for (const e of here) fixes.push(`claude plugin uninstall ${id} --scope ${e.scope}`);
  }

  if (fixes.length) {
    const msg =
      'ugt: โปรเจคนี้ติดตั้ง plugin ของ ugt ระดับ project — ตัวนี้อัปเดตแยกจากระดับ user ' +
      '(มาตรฐานคือติดตั้งระดับ user ครั้งเดียวต่อเครื่อง) · รันในโฟลเดอร์โปรเจคนี้:\n' +
      fixes.join('\n') +
      '\nuninstall --scope project จะลบ key `*@ugt` ใน .claude/settings.json ด้วย — commit ผลนั้นให้ทั้งทีม';
    process.stdout.write(
      JSON.stringify({ systemMessage: msg, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg } })
    );
  }
} catch {
  // no installed_plugins.json / unreadable → nothing to report
}
