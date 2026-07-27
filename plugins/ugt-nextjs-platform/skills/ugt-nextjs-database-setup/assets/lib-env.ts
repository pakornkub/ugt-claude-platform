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
    // (none yet — add NEXT_PUBLIC_* vars here as features need them)
  },

  /**
   * Explicit runtimeEnv mapping required by @t3-oss/env-nextjs.
   * Server vars are read via process.env; client vars must be listed
   * individually so Next.js can statically inline them at build time.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  },

  /**
   * Skip validation in CI or when explicitly requested.
   * Useful for builds that don't have all env vars available (e.g. frontend-only CI).
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
