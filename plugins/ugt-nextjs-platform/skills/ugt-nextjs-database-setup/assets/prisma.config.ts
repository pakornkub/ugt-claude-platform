// kit: ugt-nextjs-platform 4.61.4 · ugt-nextjs-database-setup/prisma.config.ts
// kit-hash: fc30d0c06530
// Prisma CLI config — the ONLY place the datasource url lives.
// (schema.prisma must NOT contain a url field — Prisma 7 + driver adapter.)
// Requires dev deps: prisma, tsx, dotenv.
// dotenv is required HERE even though the Prisma CLI auto-loads .env files —
// the CLI injects them only AFTER this config module is evaluated, so
// process.env would not see DATABASE_URL without it.
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local first (overrides .env). quiet: dotenv >= 17 otherwise prints
// "◇ injected env …" to STDOUT, which corrupts anything piped from the Prisma
// CLI — e.g. `migrate diff --script > migration.sql` (migrations.md §5).
config({ path: '.env.local', quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Uncomment when prisma/seed.ts exists — leaving it active without the
    // file makes `prisma migrate dev` fail.
    // seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // prisma.config.ts runs outside the app — direct process.env access is
    // allowed HERE ONLY. App code must import from '@/lib/env'.
    url: process.env['DATABASE_URL'],
    // Dev-only, used by `prisma migrate dev` (never by `migrate deploy`): the
    // app login on the shared org server cannot CREATE DATABASE, so Prisma
    // can't make its own shadow DB and migrate dev dies on a permission error
    // that never mentions the shadow database. Point this at a pre-created
    // EMPTY dev database — Prisma wipes it on every run.
    // Remove the line when the dev login may create databases itself.
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
