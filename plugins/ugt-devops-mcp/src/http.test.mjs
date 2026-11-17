// node --test plugins/ugt-devops-mcp/src/http.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiUrl, env, fetchError, getJson } from './http.mjs';

test('fetchError surfaces err.cause and flags only chain-trust failures', () => {
  const url = new URL('https://h/jenkins/api/json');
  const tls = fetchError(new TypeError('fetch failed', { cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' } }), url);
  assert.match(tls.message, /fetch failed \(UNABLE_TO_VERIFY_LEAF_SIGNATURE\) — https:\/\/h — cert chain not trusted/);
  const host = fetchError(new TypeError('fetch failed', { cause: { code: 'ERR_TLS_CERT_ALTNAME_INVALID' } }), url);
  assert.equal(host.message, 'fetch failed (ERR_TLS_CERT_ALTNAME_INVALID) — https://h');
  const dns = fetchError(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }), url);
  assert.equal(dns.message, 'fetch failed (ENOTFOUND) — https://h');
  assert.equal(fetchError(new Error('timeout'), url).message, 'timeout — https://h');
});

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

test('getJson wraps a rejected fetch with its cause', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }); };
  try {
    await assert.rejects(getJson(new URL('https://h/api/json'), 'Basic x'), { message: 'fetch failed (ECONNREFUSED) — https://h' });
  } finally {
    globalThis.fetch = real;
  }
});
