// kit: ugt-nextjs-platform 4.76.0 · ugt-nextjs-design-setup/lib/environment.ts
// kit-hash: 158f7a85efbd
// source: ugt-voice-platform (2026-10-09) — installed by ugt-nextjs-design-setup (org UI kit)
// lib/environment.ts — which deployment this build is.
// develop → dev deploys at basePath `/<project>-dev`, main → prod at `/<project>`
// (ugt-nextjs-cicd-setup; NEXT_PUBLIC_BASE_PATH is a build arg, baked in at build time).
// Both live on one host and look identical, so the basePath is the only signal
// the app has — and the only one it needs: no extra env var.
//
// SERVER-ONLY: import it from Server Components (app/layout.tsx) — a client
// component cannot use the `@/lib/env` wrapper (empty in the client bundle under
// Turbopack, see ugt-nextjs-auth-setup gotchas); site-header.tsx reads
// process.env.NEXT_PUBLIC_BASE_PATH itself for that reason.
import { env } from '@/lib/env';

/**
 * True on the dev deployment (basePath ending in `-dev`).
 * `?? ''` must stay: CI builds set SKIP_ENV_VALIDATION, so zod adds no default
 * and the value is `undefined` — without it `next build` dies with
 * "Cannot read properties of undefined (reading 'endsWith')".
 */
export const isDevEnvironment = (): boolean => (env.NEXT_PUBLIC_BASE_PATH ?? '').endsWith('-dev');
