// node --test plugins/ugt-devops-mcp/scripts/check-legacy-mcp.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findLegacy, message } from './check-legacy-mcp.mjs';

const old = (svc) => ({ type: 'stdio', command: 'node', args: [`C:\\Users\\u\\.claude\\mcp-servers\\${svc}-mcp\\index.js`] });
const plugin = { command: 'node', args: ['C:/Users/u/.claude/plugins/cache/ugt/ugt-devops-mcp/0.1.2/mcp/jenkins.mjs'] };

test('finds old servers at user scope and under projects, ignores everything else', () => {
  const found = findLegacy({
    mcpServers: { jenkins: old('jenkins'), other: { command: 'npx', args: ['x'] } },
    projects: {
      'D:/a': { mcpServers: { sonarqube: old('sonarqube') } },
      'D:/b': { mcpServers: {} },
      'D:/c': { mcpServers: { jenkins: plugin } },
      'D:/d': {},
    },
  });
  assert.deepEqual(found, { user: ['jenkins'], projects: [{ path: 'D:/a', names: ['sonarqube'] }] });
});

test('message gives the right scope per entry and is empty when clean', () => {
  assert.equal(message({ user: [], projects: [] }), '');
  const msg = message({ user: ['jenkins'], projects: [{ path: 'D:/a', names: ['sonarqube'] }] });
  assert.match(msg, /claude mcp remove jenkins -s user/);
  assert.match(msg, /cd "D:\/a"\nclaude mcp remove sonarqube -s local/);
});

test('posix-style paths from a script run under WSL/macOS also match', () => {
  const found = findLegacy({ mcpServers: { sq: { args: ['/home/u/.claude/mcp-servers/sonarqube-mcp/index.js'] } } });
  assert.deepEqual(found.user, ['sq']);
});
