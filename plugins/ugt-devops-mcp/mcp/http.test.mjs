// node --test plugins/ugt-devops-mcp/mcp/http.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiUrl, env } from './http.mjs';

test('apiUrl keeps a reverse-proxy base path', () => {
  assert.equal(apiUrl('https://h/sonar', '/api/x').href, 'https://h/sonar/api/x');
  assert.equal(apiUrl('https://h/jenkins/', 'job/a/api/json').href, 'https://h/jenkins/job/a/api/json');
  assert.equal(apiUrl('https://h', 'api/x?a=1').href, 'https://h/api/x?a=1');
});

test('env treats empty and unexpanded placeholders as missing', () => {
  process.env.T_EMPTY = ' ';
  process.env.T_PLACEHOLDER = '${user_config.jenkins_url}';
  process.env.T_OK = 'https://h';
  assert.equal(env('T_EMPTY'), undefined);
  assert.equal(env('T_PLACEHOLDER'), undefined);
  assert.equal(env('T_OK'), 'https://h');
});
