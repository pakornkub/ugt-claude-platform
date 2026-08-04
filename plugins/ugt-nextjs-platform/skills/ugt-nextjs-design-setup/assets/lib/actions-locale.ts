// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// ship only when the project chose th+en · requires lib/auth (ugt-nextjs-auth-setup) — session guard on the Server Action
'use server';

import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// Security: z.enum enforces allowed locales at runtime (TypeScript types are erased).
const localeSchema = z.enum(['en', 'th']);

export async function setLocale(locale: 'en' | 'th') {
  // Security: Server Actions are reachable without a session via direct POST —
  // the proxy 401 guard only applies to /api/* paths, not page-URL action endpoints.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;

  const parsed = localeSchema.safeParse(locale);
  if (!parsed.success) return;

  const cookieStore = await cookies();
  cookieStore.set('locale', parsed.data, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false, // NOSONAR typescript:S2092 — intentional; JS must read locale cookie for language switcher
  });
}
