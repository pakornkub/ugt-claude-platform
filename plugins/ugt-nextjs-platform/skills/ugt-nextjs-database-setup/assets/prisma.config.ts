// Prisma CLI config — the ONLY place the datasource url lives.
// (schema.prisma must NOT contain a url field — Prisma 7 + driver adapter.)
// Requires dev deps: prisma, tsx, dotenv.
// dotenv is required HERE even though the Prisma CLI auto-loads .env files —
// the CLI injects them only AFTER this config module is evaluated, so
// process.env would not see DATABASE_URL without it.
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local first (overrides .env)
config({ path: '.env.local' });
config();

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
  },
});
