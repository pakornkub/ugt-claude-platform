// Shared bits for the Jenkins/SonarQube MCP servers.

// userConfig values arrive as env vars; an unset one may come through empty or as the literal placeholder
export const env = (name) => {
  const v = process.env[name]?.trim();
  return v && !v.startsWith('${') ? v : undefined;
};

// Relative join: new URL('/api/x', base) drops a base path like /jenkins/ or /sonar/ behind a reverse proxy
export const apiUrl = (base, path) => new URL(path.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`);

export const basicAuth = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

export async function getJson(url, authHeader, { json = true } = {}) {
  const res = await fetch(url, { headers: { Authorization: authHeader } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${url.pathname}: ${body.slice(0, 500)}`);
  }
  return json ? res.json() : res.text();
}

export const text = (obj) => ({
  content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }],
});

export function requireConfig(server, names) {
  const missing = names.filter((n) => !env(n));
  if (missing.length) {
    console.error(
      `${server}: missing ${missing.join(', ')} — set them in /plugin → ugt-devops-mcp → configure, then restart Claude Code.`
    );
    process.exit(1);
  }
}
