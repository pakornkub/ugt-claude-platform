#!/usr/bin/env node
// MCP server: read-only access to a SonarQube server's issues + Quality Gate status.
// Auth: user token (SonarQube → My Account → Security). Token never logged.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { apiUrl, basicAuth, env, getJson, requireConfig, text } from './http.mjs';

requireConfig('sonarqube-mcp', ['SONARQUBE_URL', 'SONARQUBE_TOKEN']);
const HOST = env('SONARQUBE_URL');
// Token as Basic-auth username with empty password — works on every SonarQube version (Bearer is newer-only)
const AUTH = basicAuth(env('SONARQUBE_TOKEN'), '');

function sonar(path, params) {
  const url = apiUrl(HOST, path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  return getJson(url, AUTH);
}

const projectKey = z.string().describe('SonarQube project key, e.g. my-app or my-app-dev');

const server = new McpServer({ name: 'sonarqube-mcp', version: '0.1.3' });

server.tool(
  'list_issues',
  'List open SonarQube issues for a project (bugs, vulnerabilities, code smells). Use to see what is failing the Quality Gate.',
  {
    projectKey,
    severities: z.string().optional().describe('Comma-separated: BLOCKER,CRITICAL,MAJOR,MINOR,INFO'),
    types: z.string().optional().describe('Comma-separated: BUG,VULNERABILITY,CODE_SMELL'),
    resolved: z.boolean().optional().describe('false = only unresolved issues (default)'),
    pageSize: z.number().int().min(1).max(500).optional().default(100),
  },
  async ({ projectKey, severities, types, resolved, pageSize }) => {
    const data = await sonar('api/issues/search', {
      components: projectKey, // componentKeys is deprecated since SonarQube 10.2
      severities,
      types,
      resolved: resolved ?? false,
      ps: pageSize,
    });
    const issues = (data.issues ?? []).map((i) => ({
      key: i.key,
      rule: i.rule,
      severity: i.severity,
      type: i.type,
      component: i.component,
      line: i.line,
      message: i.message,
      status: i.status,
    }));
    return text({ total: data.total, count: issues.length, issues });
  }
);

server.tool(
  'get_quality_gate_status',
  'Get the pass/fail Quality Gate status for a SonarQube project, with per-condition breakdown (e.g. new_coverage, new_violations).',
  { projectKey },
  async ({ projectKey }) => {
    const data = await sonar('api/qualitygates/project_status', { projectKey });
    return text(data.projectStatus);
  }
);

await server.connect(new StdioServerTransport());
