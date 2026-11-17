#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
import {
  McpServer,
  StdioServerTransport,
  apiUrl,
  basicAuth,
  env,
  external_exports,
  getJson,
  requireConfig,
  text
} from "./chunk-CCITLQEC.mjs";

// ../../plugins/ugt-devops-mcp/src/jenkins.mjs
requireConfig("jenkins-mcp", ["JENKINS_URL", "JENKINS_USER", "JENKINS_TOKEN"]);
var HOST = env("JENKINS_URL");
var AUTH = basicAuth(env("JENKINS_USER"), env("JENKINS_TOKEN"));
var jenkins = (path, opts) => getJson(apiUrl(HOST, path), AUTH, opts);
var jobPath = (name) => name.split("/").filter(Boolean).map((p) => `job/${encodeURIComponent(p)}`).join("/");
var server = new McpServer({ name: "jenkins-mcp", version: "0.1.6" });
server.tool(
  "list_jobs",
  "List Jenkins jobs (2 folder levels deep) with their last-build color (blue=success, red=failed, *_anime=building).",
  { folder: external_exports.string().optional().describe('Folder path to list inside, e.g. "team" or "team/app". Empty = root.') },
  async ({ folder }) => {
    const prefix = folder ? `${jobPath(folder)}/` : "";
    const data = await jenkins(`${prefix}api/json?tree=jobs[name,color,jobs[name,color,jobs[name,color]]]`);
    return text(data.jobs ?? []);
  }
);
var jobArg = external_exports.string().describe('Job full name incl. folders, e.g. "my-app-dev" or "team/my-app/main". A "/" inside a branch name is written %2F, e.g. "my-app/feature%2Flogin"');
var buildArg = external_exports.string().optional().default("lastBuild").describe("Build number or lastBuild / lastFailedBuild / lastSuccessfulBuild");
server.tool(
  "get_build",
  "Get status of a build (default: lastBuild) \u2014 result, building, duration, timestamp, changes, and pipeline stages.",
  {
    job: jobArg,
    build: buildArg
  },
  async ({ job, build }) => {
    const base = `${jobPath(job)}/${encodeURIComponent(build)}`;
    const [b, stages] = await Promise.all([
      jenkins(`${base}/api/json?tree=number,result,building,timestamp,duration,url,changeSets[items[msg,author[fullName]]]`),
      // Stages via wfapi (Pipeline: REST API plugin) — absent on some installs, so optional
      jenkins(`${base}/wfapi/describe`).then((d) => (d.stages ?? []).map((s) => ({ name: s.name, status: s.status, ms: s.durationMillis }))).catch(() => void 0)
    ]);
    return text({ ...b, stages });
  }
);
server.tool(
  "get_console_log",
  "Get the tail of a build console log. Use after get_build shows FAILURE to see why.",
  {
    job: jobArg,
    build: buildArg,
    tailChars: external_exports.number().int().min(500).max(2e5).optional().default(2e4)
  },
  async ({ job, build, tailChars }) => {
    const log = await jenkins(`${jobPath(job)}/${encodeURIComponent(build)}/consoleText`, { json: false });
    return text(log.length > tailChars ? `...[truncated ${log.length - tailChars} chars]
${log.slice(-tailChars)}` : log);
  }
);
await server.connect(new StdioServerTransport());
