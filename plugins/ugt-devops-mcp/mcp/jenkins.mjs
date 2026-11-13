#!/usr/bin/env node
// MCP server: read-only access to a Jenkins server (jobs, build status, console log).
// Auth: user + API token (Jenkins → your user → Configure → API Token). Token never logged.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { apiUrl, basicAuth, env, getJson, requireConfig, text } from './http.mjs';

requireConfig('jenkins-mcp', ['JENKINS_URL', 'JENKINS_USER', 'JENKINS_TOKEN']);
const HOST = env('JENKINS_URL');
const AUTH = basicAuth(env('JENKINS_USER'), env('JENKINS_TOKEN'));
const jenkins = (path, opts) => getJson(apiUrl(HOST, path), AUTH, opts);

// "folder/sub/job" → "job/folder/job/sub/job/job"
const jobPath = (name) => name.split('/').filter(Boolean).map((p) => `job/${encodeURIComponent(p)}`).join('/');

const server = new McpServer({ name: 'jenkins-mcp', version: '0.1.3' });

server.tool(
  'list_jobs',
  'List Jenkins jobs (2 folder levels deep) with their last-build color (blue=success, red=failed, *_anime=building).',
  { folder: z.string().optional().describe('Folder path to list inside, e.g. "team" or "team/app". Empty = root.') },
  async ({ folder }) => {
    const prefix = folder ? `${jobPath(folder)}/` : '';
    const data = await jenkins(`${prefix}api/json?tree=jobs[name,color,jobs[name,color,jobs[name,color]]]`);
    return text(data.jobs ?? []);
  }
);

// Multibranch stores branch "feature/x" as item "feature%2Fx"; jobPath encodes it again, which is the URL Jenkins expects
const jobArg = z
  .string()
  .describe('Job full name incl. folders, e.g. "my-app-dev" or "team/my-app/main". A "/" inside a branch name is written %2F, e.g. "my-app/feature%2Flogin"');

const buildArg = z
  .string()
  .optional()
  .default('lastBuild')
  .describe('Build number or lastBuild / lastFailedBuild / lastSuccessfulBuild');

server.tool(
  'get_build',
  'Get status of a build (default: lastBuild) — result, building, duration, timestamp, changes, and pipeline stages.',
  {
    job: jobArg,
    build: buildArg,
  },
  async ({ job, build }) => {
    const base = `${jobPath(job)}/${encodeURIComponent(build)}`;
    const [b, stages] = await Promise.all([
      jenkins(`${base}/api/json?tree=number,result,building,timestamp,duration,url,changeSets[items[msg,author[fullName]]]`),
      // Stages via wfapi (Pipeline: REST API plugin) — absent on some installs, so optional
      jenkins(`${base}/wfapi/describe`)
        .then((d) => (d.stages ?? []).map((s) => ({ name: s.name, status: s.status, ms: s.durationMillis })))
        .catch(() => undefined),
    ]);
    return text({ ...b, stages });
  }
);

server.tool(
  'get_console_log',
  'Get the tail of a build console log. Use after get_build shows FAILURE to see why.',
  {
    job: jobArg,
    build: buildArg,
    tailChars: z.number().int().min(500).max(200000).optional().default(20000),
  },
  async ({ job, build, tailChars }) => {
    const log = await jenkins(`${jobPath(job)}/${encodeURIComponent(build)}/consoleText`, { json: false });
    return text(log.length > tailChars ? `...[truncated ${log.length - tailChars} chars]\n${log.slice(-tailChars)}` : log);
  }
);

await server.connect(new StdioServerTransport());
