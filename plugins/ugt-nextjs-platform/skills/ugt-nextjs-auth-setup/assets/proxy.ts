// kit: ugt-nextjs-platform 4.40.0 · ugt-nextjs-auth-setup/proxy.ts
// kit-hash: dddb3b0085d0
// proxy.ts — Next.js 16 edge route protection (Next.js 16 uses proxy.ts, not middleware.ts).
// Cookie-presence check only (Edge-safe, no DB call) + CSP nonce injection
// + the standard security headers on every response (see applySecurityHeaders).
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Paths that only unauthenticated users should access.
// Authenticated users visiting these will be sent to the dashboard.
// [METHOD: LOCAL] '/reset-password' MUST be listed — someone who cannot log in
// also cannot reach a protected page, so leaving it out makes the reset link in
// the email bounce straight back to /login. Remove it only when local login is off.
const AUTH_ONLY_PATHS = ['/login', '/reset-password'];

/**
 * Generate a cryptographically-random base64 nonce suitable for CSP.
 * Uses Web Crypto (available in Edge runtime — no Node.js Buffer needed).
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Build the Content-Security-Policy header value for this request.
 * script-src uses the nonce + 'strict-dynamic' — no 'unsafe-inline'.
 * style-src keeps 'unsafe-inline' because Tailwind/Next.js inject inline styles.
 * object-src 'none' blocks Flash/plugin embedding (OWASP A05).
 * base-uri 'self' prevents <base> tag hijacking.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  return [
    "default-src 'self'",
    // React dev mode requires 'unsafe-eval' for call stack reconstruction — production never uses eval()
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // Dev overlay + HMR websocket require additional connect-src in development
    `connect-src 'self'${isDev ? ' ws://localhost:* http://localhost:*' : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Security headers every response carries. CSP is built per-request (it holds the
 * nonce); the rest are constants.
 * - X-Frame-Options: clickjacking guard for browsers that ignore the
 *   `frame-ancestors` in the CSP above. Keep the two in sync.
 * - X-Content-Type-Options: no MIME sniffing — an uploaded .txt never gets
 *   executed as script just because its bytes look like one.
 * - Referrer-Policy: full URL to our own origin, bare origin to anyone else —
 *   ids and tokens sitting in a path never reach a third party's referrer log.
 * - Permissions-Policy: switch off device APIs this app does not use, so injected
 *   script cannot prompt for them.
 * - Strict-Transport-Security: https only, for a year. Sent ONLY on an https
 *   request — pinning http://localhost to https would break dev permanently
 *   (the browser caches it and there is no https dev server to fall back to).
 *   No `includeSubDomains` and no `preload`: both are org-wide, hard-to-undo
 *   commitments (preload is baked into browser builds), and on a shared domain
 *   includeSubDomains forces https on every sibling app too. Add them only after
 *   whoever owns the domain says so.
 */
function applySecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  nonce: string
): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // Behind a TLS-terminating reverse proxy the request arrives as http, so the
  // forwarded header is the only truthful source; fall back to the URL scheme.
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0].trim() ||
    request.nextUrl.protocol.replace(':', '');
  if (proto === 'https') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  }

  return response;
}

export function proxy(request: NextRequest) {
  // Next.js 16 + Turbopack includes basePath in request.nextUrl.pathname
  // (e.g. "/expense-portal/login", not "/login"). Strip it so the route checks below
  // are basePath-agnostic. The guard makes this a no-op when the prefix is
  // already absent, so it stays correct regardless of that behaviour.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const rawPathname = request.nextUrl.pathname;
  const pathname =
    basePath && rawPathname.startsWith(basePath)
      ? rawPathname.slice(basePath.length) || '/'
      : rawPathname;

  // Generate a fresh nonce for every response that renders HTML.
  const nonce = generateNonce();

  // Always pass through Next.js internals, static assets, and the public auth API.
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/health') || // Health check — must bypass auth for monitoring tools
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf|css|js|map)$/i.test(pathname)
  ) {
    return applySecurityHeaders(NextResponse.next(), request, nonce);
  }

  // Derive the same cookie prefix used by lib/auth.ts — must stay in sync.
  // NEXT_PUBLIC_* vars are statically inlined by Next.js and are available in Edge runtime.
  const sessionCookiePrefix =
    (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';

  const sessionCookie = getSessionCookie(request, { cookiePrefix: sessionCookiePrefix });
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  // Authenticated user visiting /login → redirect to dashboard.
  // Use the basePath-relative path — Next re-adds basePath to a cloned nextUrl.
  // NEVER assign `basePath + '/...'` here — that duplicates the basePath in the redirect URL.
  if (isAuthOnlyPath && sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return applySecurityHeaders(NextResponse.redirect(url), request, nonce);
  }

  // Unauthenticated user visiting a protected page → redirect to /login.
  // For API routes return 401 JSON instead of a redirect.
  if (!isAuthOnlyPath && !sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        request,
        nonce
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return applySecurityHeaders(NextResponse.redirect(url), request, nonce);
  }

  // Forward the nonce to server components via a request header so that
  // layouts can read it with headers() and pass it to <Script nonce={nonce}>.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  return applySecurityHeaders(response, request, nonce);
}

export const proxyConfig = {
  // Exclude only Next.js internals and static assets — /api/* is included
  // so protected API routes return 401 instead of leaking data to unauthenticated users.
  // The /api/auth/* path is whitelisted inside the proxy() function itself.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|eot|otf)).*)',
  ],
};
