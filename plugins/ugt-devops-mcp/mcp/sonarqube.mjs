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

// ../../plugins/ugt-devops-mcp/src/sonarqube.mjs
requireConfig("sonarqube-mcp", ["SONARQUBE_URL", "SONARQUBE_TOKEN"]);
var HOST = env("SONARQUBE_URL");
var AUTH = basicAuth(env("SONARQUBE_TOKEN"), "");
function sonar(path, params) {
  const url = apiUrl(HOST, path);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== void 0 && value !== null && value !== "") url.searchParams.set(key, value);
  }
  return getJson(url, AUTH);
}
var projectKey = external_exports.string().describe("SonarQube project key, e.g. my-app or my-app-dev");
var server = new McpServer({ name: "sonarqube-mcp", version: "0.1.6" });
server.tool(
  "list_issues",
  "List open SonarQube issues for a project (bugs, vulnerabilities, code smells). Use to see what is failing the Quality Gate.",
  {
    projectKey,
    severities: external_exports.string().optional().describe("Comma-separated: BLOCKER,CRITICAL,MAJOR,MINOR,INFO"),
    types: external_exports.string().optional().describe("Comma-separated: BUG,VULNERABILITY,CODE_SMELL"),
    resolved: external_exports.boolean().optional().describe("false = only unresolved issues (default)"),
    pageSize: external_exports.number().int().min(1).max(500).optional().default(100)
  },
  async ({ projectKey: projectKey2, severities, types, resolved, pageSize }) => {
    const data = await sonar("api/issues/search", {
      components: projectKey2,
      // componentKeys is deprecated since SonarQube 10.2
      severities,
      types,
      resolved: resolved ?? false,
      ps: pageSize
    });
    const issues = (data.issues ?? []).map((i) => ({
      key: i.key,
      rule: i.rule,
      severity: i.severity,
      type: i.type,
      component: i.component,
      line: i.line,
      message: i.message,
      status: i.status
    }));
    return text({ total: data.total, count: issues.length, issues });
  }
);
server.tool(
  "get_quality_gate_status",
  "Get the pass/fail Quality Gate status for a SonarQube project, with per-condition breakdown (e.g. new_coverage, new_violations).",
  { projectKey },
  async ({ projectKey: projectKey2 }) => {
    const data = await sonar("api/qualitygates/project_status", { projectKey: projectKey2 });
    return text(data.projectStatus);
  }
);
await server.connect(new StdioServerTransport());
