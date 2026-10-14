// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-database-setup/lib/env.ts
// kit-hash: 5a6ed3abd1c4
// lib/env.ts — type-safe env validation via @t3-oss/env-nextjs + zod.
// App code MUST import env from here — never read process.env directly.
// (Non-Next.js Node projects: swap to @t3-oss/env-core and drop the client block.)
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Server-side environment variables — never exposed to the browser.
   */
  server: {
    // Database
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    // ── Auth (ugt-nextjs-auth-setup) ─────────────────────────────────────
    BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 chars'),
    // REQUIRED, never optional: Better Auth picks the __Secure- cookie prefix from
    // this URL's scheme — unset in production = cookie-name mismatch = redirect loop
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    // Org mail domains, comma list, canonical first (ube.co.th,ube.com)
    ORG_EMAIL_DOMAINS: z.string().optional(),
    // SSO (Keycloak) — primary login
    KEYCLOAK_ISSUER: z.url(),
    KEYCLOAK_CLIENT_ID: z.string().min(1),
    KEYCLOAK_CLIENT_SECRET: z.string().min(1),
    // AD/LDAP — fallback when Keycloak is down
    LDAP_URL: z.string().min(1),
    LDAP_BASE_DN: z.string().min(1),
    LDAP_DOMAIN: z.string().min(1),

    // ── EXTENSION POINT ──────────────────────────────────────────────────
    // Other feature vars (SMTP, monitoring, ...) slot in here, grouped with a comment.
    // ─────────────────────────────────────────────────────────────────────

    // Node.js built-ins
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },

  /**
   * Client-side environment variables — exposed to the browser.
   * Must be prefixed with NEXT_PUBLIC_.
   */
  client: {
    // basePath the app is served under ('/leave-request' in prod,
    // '/leave-request-dev' in dev, '' at a domain root). Missing value silently
    // falls back to the default cookie prefix → ERR_TOO_MANY_REDIRECTS on a
    // shared domain, so it is required to exist (empty string is valid).
    NEXT_PUBLIC_BASE_PATH: z.string().default(''),
    NEXT_PUBLIC_APP_NAME: z.string().default('ระบบคำขอลา'),
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },

  /**
   * Explicit runtimeEnv mapping required by @t3-oss/env-nextjs.
   * Server vars are read via process.env; client vars must be listed
   * individually so Next.js can statically inline them at build time.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_TRUSTED_ORIGINS: process.env.BETTER_AUTH_TRUSTED_ORIGINS,
    ORG_EMAIL_DOMAINS: process.env.ORG_EMAIL_DOMAINS,
    KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
    KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
    KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
    LDAP_URL: process.env.LDAP_URL,
    LDAP_BASE_DN: process.env.LDAP_BASE_DN,
    LDAP_DOMAIN: process.env.LDAP_DOMAIN,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation in CI or when explicitly requested.
   * Useful for builds that don't have all env vars available (e.g. frontend-only CI).
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
