// kit: ugt-nextjs-platform 4.52.0 · ugt-nextjs-auth-setup/lib/auth-client.ts
// kit-hash: 8165069d94b4
import { createAuthClient } from 'better-auth/react';

// Do NOT pass baseURL here. Better Auth's withPath() checks whether the URL already has
// a non-root pathname. If it does it returns the URL unchanged and never appends basePath.
// e.g. "http://localhost:3000/expense-portal" has a path, so passing it as baseURL would
// yield "…/expense-portal/get-session" (404) instead of "…/expense-portal/api/auth/get-session".
//
// Without baseURL the client runs in-browser and falls back to window.location.origin
// (a bare origin with no path) then appends basePath correctly:
//   http://localhost:3000  +  /expense-portal/api/auth  →  correct endpoint ✓
//
// Use process.env directly — reading NEXT_PUBLIC_BASE_PATH through a createEnv()
// wrapper (@t3-oss/env-nextjs) returns '' in the Turbopack client bundle (compile-time
// inlining is skipped when accessed through createEnv()). process.env inlining is
// always reliable.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const authClient = createAuthClient({
  basePath: `${BASE_PATH}/api/auth`,
  // [METHOD: SSO] — no client plugin needed. better-auth 1.7 rewired generic
  // OAuth (Keycloak) as a first-class social provider: the SSO button below
  // calls the base client's signIn.social({ provider: 'keycloak' }) directly.
  fetchOptions: {
    onError(ctx) {
      // Broadcast session expiry — received by SessionExpiredDialog
      // (components/session-expired-dialog.tsx, mounted in the protected
      // layout) which forces a re-login. query-provider (design kit)
      // dispatches the same event for 401s from React Query.
      if (ctx.response?.status === 401 && globalThis.window !== undefined) {
        globalThis.dispatchEvent(new CustomEvent('session-expired'));
      }
    },
  },
});

export const { signIn, signOut, signUp, useSession } = authClient;
