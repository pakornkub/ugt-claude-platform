import { createAuthClient } from 'better-auth/react';
import { genericOAuthClient } from 'better-auth/client/plugins'; // [METHOD: SSO] — remove if SSO not enabled

// Do NOT pass baseURL here. Better Auth's withPath() checks whether the URL already has
// a non-root pathname. If it does it returns the URL unchanged and never appends basePath.
// e.g. "http://localhost:3000/<base-path>" has a path, so passing it as baseURL would
// yield "…/<base-path>/get-session" (404) instead of "…/<base-path>/api/auth/get-session".
//
// Without baseURL the client runs in-browser and falls back to window.location.origin
// (a bare origin with no path) then appends basePath correctly:
//   http://localhost:3000  +  /<base-path>/api/auth  →  correct endpoint ✓
//
// Use process.env directly — reading NEXT_PUBLIC_BASE_PATH through a createEnv()
// wrapper (@t3-oss/env-nextjs) returns '' in the Turbopack client bundle (compile-time
// inlining is skipped when accessed through createEnv()). process.env inlining is
// always reliable.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const authClient = createAuthClient({
  basePath: `${BASE_PATH}/api/auth`,
  plugins: [genericOAuthClient()], // [METHOD: SSO] — remove if SSO not enabled
  fetchOptions: {
    onError(ctx) {
      // Broadcast session expiry so any listener (e.g. a session-expiry banner)
      // can react to a 401 from any auth-client call.
      if (ctx.response?.status === 401 && globalThis.window !== undefined) {
        globalThis.dispatchEvent(new CustomEvent('session-expired'));
      }
    },
  },
});

export const { signIn, signOut, signUp, useSession } = authClient;
