#!/usr/bin/env node
// Legacy-MCP guard — flags Jenkins/SonarQube MCP servers left by the old
// install-jenkins-mcp.ps1 / install-sonarqube-mcp.ps1 scripts.
//
// Invoked from hooks/hooks.json (SessionStart). Pure shell command, no LLM call.
//
// Why: with both installed, every tool shows up twice and the old servers keep
// reading tokens from plain user env vars. The scripts text-patched the first
// "mcpServers" in ~/.claude.json, which on most machines is a per-project block,
// so the old entry may sit at user scope or under any project (local scope).
// Read-only and silent on every failure: a guard must never block a session.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const LEGACY = /[\\/]\.claude[\\/]mcp-servers[\\/](jenkins|sonarqube)-mcp[\\/]/i;
const isLegacy = (server) => (server?.args ?? []).some((a) => LEGACY.test(String(a)));
const legacyNames = (servers) => Object.keys(servers ?? {}).filter((name) => isLegacy(servers[name]));

// → { user: [names], projects: [{ path, names }] }
export function findLegacy(config) {
  const user = legacyNames(config.mcpServers);
  const projects = Object.entries(config.projects ?? {})
    .map(([path, p]) => ({ path, names: legacyNames(p?.mcpServers) }))
    .filter((p) => p.names.length);
  return { user, projects };
}

export function message({ user, projects }) {
  if (!user.length && !projects.length) return '';
  const lines = [
    'ugt-devops-mcp: ยังมี MCP Jenkins/SonarQube ตัวเก่าจากสคริปต์ install-*-mcp.ps1 — tool จะขึ้นซ้ำสองชุด และตัวเก่าอ่าน token จาก env var แบบข้อความเปล่า · ลบด้วยคำสั่งนี้แล้ว restart Claude Code:',
    ...user.map((n) => `claude mcp remove ${n} -s user`),
  ];
  for (const { path, names } of projects) {
    lines.push(`cd "${path}"`, ...names.map((n) => `claude mcp remove ${n} -s local`));
  }
  lines.push(
    'จากนั้นลบ user env var JENKINS_URL/JENKINS_USER/JENKINS_TOKEN และ SONARQUBE_URL/SONARQUBE_TOKEN (SONAR_HOST_URL/SONAR_TOKEN ลบเฉพาะถ้าไม่ได้ใช้ sonar-scanner) และโฟลเดอร์ ~/.claude/mcp-servers/'
  );
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const file = process.env.CLAUDE_CONFIG_DIR
      ? join(process.env.CLAUDE_CONFIG_DIR, '.claude.json')
      : join(homedir(), '.claude.json');
    const msg = message(findLegacy(JSON.parse(readFileSync(file, 'utf8'))));
    if (msg) {
      process.stdout.write(
        JSON.stringify({ systemMessage: msg, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: msg } })
      );
    }
  } catch {
    // no / unreadable config → nothing to report
  }
}
