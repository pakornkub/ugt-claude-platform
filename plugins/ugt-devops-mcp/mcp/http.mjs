// Shared bits for the Jenkins/SonarQube MCP servers.

// userConfig values arrive as env vars; an unset one may come through empty or as the literal placeholder
export const env = (name) => {
  const v = process.env[name]?.trim();
  return v && !v.startsWith('${') ? v : undefined;
};

// Relative join: new URL('/api/x', base) drops a base path like /jenkins/ or /sonar/ behind a reverse proxy
export const apiUrl = (base, path) => new URL(path.replace(/^\/+/, ''), base.endsWith('/') ? base : `${base}/`);

export const basicAuth = (user, pass) => `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;

// Node's fetch throws a bare "fetch failed" — the real reason (TLS, DNS, refused) is only on err.cause
export function fetchError(err, url) {
  const why = err.cause?.code ?? err.cause?.message;
  const tls = /CERT|SIGNATURE|SELF_SIGNED/.test(why ?? '')
    ? ' — server cert not trusted (often: server omits its intermediate cert). Plugin sets --use-system-ca (needs Node >= 22.15) so certs in the Windows store count; else NODE_EXTRA_CA_CERTS=<intermediate+root .pem>, or have the server send its full chain'
    : '';
  return new Error(`${err.message}${why ? ` (${why})` : ''} — ${url.origin}${tls}`);
}

export async function getJson(url, authHeader, { json = true } = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { Authorization: authHeader }, signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    throw fetchError(err, url);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Jenkins error pages are full HTML (with a CSRF crumb) — only JSON/text bodies help the caller
    const detail = body.trimStart().startsWith('<') ? '' : `: ${body.slice(0, 500)}`;
    throw new Error(`${res.status} ${res.statusText} — ${url.pathname}${detail}`);
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
