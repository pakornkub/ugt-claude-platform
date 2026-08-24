// kit: ugt-nextjs-platform 4.48.1 · ugt-nextjs-design-setup/lib/actions-locale.ts
// kit-hash: 1ec34279dd66
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// ship only when the project chose th+en · standalone on purpose — no
// session guard, so it must never import @/lib/auth (a th+en project may
// not have ugt-nextjs-auth-setup installed at all)
'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

// Security: z.enum enforces allowed locales at runtime (TypeScript types are erased).
const localeSchema = z.enum(['en', 'th']);

export async function setLocale(locale: 'en' | 'th') {
  // No session guard by design: this action mutates only the caller's OWN
  // locale cookie — an unauthenticated POST can change nothing but its own
  // browser's language, so there is no cross-user surface to protect and
  // the มติ 2.6 privileged-action chain (session → permission → audit)
  // does not apply.
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
