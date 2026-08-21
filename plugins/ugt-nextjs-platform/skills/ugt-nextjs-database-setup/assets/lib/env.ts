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

    // ── EXTENSION POINT ──────────────────────────────────────────────────
    // Auth vars (secrets, issuers, LDAP, SSO) belong to the ugt-nextjs-auth-setup
    // skill — add them here when that skill is applied. Other feature vars
    // (SMTP, monitoring, ...) also slot in here, grouped with a comment.
    // ─────────────────────────────────────────────────────────────────────

    // Node.js built-ins
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  },

  /**
   * Client-side environment variables — exposed to the browser.
   * Must be prefixed with NEXT_PUBLIC_.
   */
  client: {
    // ── EXTENSION POINT ──────────────────────────────────────────────────
    // NEXT_PUBLIC_* vars go HERE (not in `server`) **and** must be listed in
    // runtimeEnv below, or they are undefined at runtime. auth-setup's
    // NEXT_PUBLIC_BASE_PATH is the critical one — missing it silently falls
    // back to the default cookie prefix → ERR_TOO_MANY_REDIRECTS on a shared
    // domain. Example:
    //   NEXT_PUBLIC_BASE_PATH: z.string().default(''),
    //   NEXT_PUBLIC_APP_NAME: z.string().optional(),
    // ─────────────────────────────────────────────────────────────────────
  },

  /**
   * Explicit runtimeEnv mapping required by @t3-oss/env-nextjs.
   * Server vars are read via process.env; client vars must be listed
   * individually so Next.js can statically inline them at build time.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    // EXTENSION POINT: every client var above must appear here too, e.g.
    //   NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
  },

  /**
   * Skip validation in CI or when explicitly requested.
   * Useful for builds that don't have all env vars available (e.g. frontend-only CI).
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
