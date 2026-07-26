// Health endpoint hit by the Dockerfile HEALTHCHECK and both compose healthchecks.
// Without this file the container never reports healthy → the Deploy stage
// fails at the docker-inspect poll every time.
//
// Must be reachable without login — ugt-auth-setup's proxy.ts already bypasses
// this path.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // [DB]

// Force dynamic — otherwise Next.js prerenders it static and the status
// freezes at its build-time value.
export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};

  // [DB] start — delete this whole block (and the import above) if the project has no database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }
  // [DB] end

  // No checks at all (project without a DB) → every() on an empty array is true → ok
  const ok = Object.values(checks).every((status) => status === 'ok');

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      // Never include version / framework / commit sha — this endpoint is public,
      // and that information tells outsiders which exploits to try.
      checks,
    },
    { status: ok ? 200 : 503 }
  );
}
