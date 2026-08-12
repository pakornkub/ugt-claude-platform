// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/app/api/auth/[...all]/route.ts
// kit-hash: 09357f75bfb1
// app/api/auth/[...all]/route.ts — Better Auth catch-all handler
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
