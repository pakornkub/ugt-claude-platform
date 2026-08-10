import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { genericOAuth, keycloak } from 'better-auth/plugins'; // [METHOD: SSO] — remove import if SSO not enabled
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { sendTemplatedMail } from '@/lib/email'; // [METHOD: LOCAL] — needs ugt-nextjs-mail-setup; remove with sendResetPassword

// Derive a unique cookie prefix from NEXT_PUBLIC_BASE_PATH (e.g. '/__BASE_PATH__' → '__BASE_PATH__').
// This prevents cross-app cookie collisions when multiple apps share the same domain
// (two apps both using Better Auth would otherwise create identically-named cookies at
// path=/, causing an infinite redirect loop — ERR_TOO_MANY_REDIRECTS — via HMAC mismatch
// in the auth-guard layout).
// Falls back to 'better-auth' when no BASE_PATH is configured (local dev, single app).
// MUST stay in sync with proxy.ts (getSessionCookie) and lib/actions/auth.ts (SESSION_COOKIE_NAME).
const cookiePrefix = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    // Scope all auth cookies to this app's base path prefix.
    // Cookie names become e.g. "__BASE_PATH__.session_token" or "__Secure-__BASE_PATH__.session_token".
    cookiePrefix,
  },
  trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').filter(Boolean),
  database: prismaAdapter(prisma, {
    provider: 'sqlserver', // adjust to your DB provider (matches ugt-nextjs-database-setup)
  }),
  // Email/password provider — keep this block for EVERY method selection (do NOT delete it;
  // admin-created local accounts and password reset depend on it).
  // Rule: set enabled: false when Local login is not selected in the interview.
  emailAndPassword: {
    enabled: true, // ← set to false when Local login is not selected
    // `enabled: true` also publishes POST /api/auth/sign-up/email — open
    // self-registration on an internal app. Accounts are created by an admin on
    // /admin/users, so close it. `createLocalUserAction` writes the user +
    // credential rows itself (with `hashPassword` from better-auth/crypto), so
    // nothing on our side depends on the sign-up endpoint.
    disableSignUp: true,
    minPasswordLength: 8, // MUST match PASSWORD_MIN_LENGTH in lib/password-policy.ts
    // Complexity rules (uppercase, lowercase, digit, special) live in
    // lib/password-policy.ts — one schema shared by reset / change / admin-create.

    // [METHOD: LOCAL] Password reset. Delete this whole block when local login
    // is off; delete only `sendResetPassword` when ugt-nextjs-mail-setup was not
    // installed (Better Auth then refuses the request with RESET_PASSWORD_DISABLED,
    // which is the honest behaviour — a reset link nobody can receive is worse
    // than no reset at all).
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour — org standard
    // A reset usually means "I think someone else is in my account". Leaving
    // that someone's session alive would make the reset pointless.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      // Build the link ourselves from `token` instead of using Better Auth's
      // `url`: its callback URL is computed WITHOUT the Next.js basePath (same
      // trap as the Keycloak redirectURI below), so the mailed link would 404
      // on any app deployed under a base path.
      const resetUrl = `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH}/reset-password?token=${token}`;
      await sendTemplatedMail({
        templateKey: 'auth.password-reset',
        to: user.email,
        // No session here — the request comes from a logged-out visitor, so the
        // dev-mode redirect cannot apply.
        actor: { hasDevMode: false, email: null },
        vars: {
          appName: env.NEXT_PUBLIC_APP_NAME ?? '',
          recipientName: user.name,
          resetUrl,
          expiresInMinutes: '60',
        },
      });
    },
    // Fires after a successful reset — the only place that still knows which
    // user the (already consumed) token belonged to.
    onPasswordReset: async ({ user }) => {
      await prisma.activityLog
        .create({
          data: {
            userId: user.id,
            action: 'password.reset',
            detail: JSON.stringify({ authType: 'local' }),
          },
        })
        .catch(() => {});
    },
  },
  rateLimit: {
    storage: 'database', // requires the rateLimit model (see schema-auth.prisma)
    customRules: {
      // [METHOD: LOCAL] — stricter window for email sign-in: 5 attempts per 60 seconds.
      // Remove this rule when Local login is not selected (emailAndPassword.enabled: false).
      '/api/auth/sign-in/email': { window: 60, max: 5 },
      // [METHOD: LOCAL] — each success sends a real email; 3 per 15 minutes.
      // The Server Action limits by IP too, but this also covers direct API calls.
      '/api/auth/request-password-reset': { window: 15 * 60, max: 3 },
    },
  },
  session: {
    expiresIn: 8 * 60 * 60, // 8 hours — org standard
    updateAge: 30 * 60, // refresh if 30 min remaining — org standard
  },
  // [METHOD: SSO] — allow Keycloak SSO to link with existing accounts (LDAP/local) by email.
  // Safe because the org Keycloak has already verified the email against the directory.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['keycloak'],
    },
  },
  // [METHOD: SSO] — Keycloak via genericOAuth + keycloak() helper.
  // Guard: only register the plugin when all required env vars are present.
  // At build time with SKIP_ENV_VALIDATION=1 these are undefined — the keycloak() helper
  // internally calls .replace() on the issuer which would crash the build.
  plugins:
    env.KEYCLOAK_ISSUER && env.KEYCLOAK_CLIENT_ID && env.KEYCLOAK_CLIENT_SECRET
      ? [
          genericOAuth({
            config: [
              {
                ...keycloak({
                  clientId: env.KEYCLOAK_CLIENT_ID,
                  clientSecret: env.KEYCLOAK_CLIENT_SECRET,
                  issuer: env.KEYCLOAK_ISSUER,
                  pkce: true,
                  // redirectURI must include the basePath — Better Auth alone would
                  // compute it without the Next.js basePath segment.
                  redirectURI: `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH}/api/auth/oauth2/callback/keycloak`,
                  overrideUserInfo: true, // refresh user fields on every SSO login
                }),
                mapProfileToUser: (profile: Record<string, unknown>) => {
                  const loginName = profile.preferred_username as string | undefined;
                  if (!loginName) return {};

                  // EXTENSION POINT: enrich the user from your own directory / HR source here
                  // (e.g. look up employee master data by loginName and return extra custom
                  // user fields). NOTE: Better Auth does NOT reliably persist custom fields
                  // returned from mapProfileToUser — only standard fields (name, email, image)
                  // propagate via overrideUserInfo. Persist custom fields in the
                  // databaseHooks.session.create.after hook below instead.
                  return { ldapUsername: loginName, authType: 'sso' };
                },
              },
            ],
          }),
        ]
      : [],
  // ─── Database hooks — SSO user sync + login audit log ────────────────────
  // LDAP and local login audit logs are written in lib/actions/auth.ts (they
  // have access to ip/userAgent). SSO (Keycloak) is handled entirely by
  // Better Auth so we intercept session creation here instead.
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          const keycloakAccount = await prisma.account
            .findFirst({
              where: { userId: session.userId, providerId: 'keycloak' },
              select: { id: true },
            })
            .catch(() => null);

          if (keycloakAccount) {
            // Fetch user's ldapUsername (set by a prior LDAP login) and email
            // (fallback: derive directory username from email prefix, user@domain → user)
            const userData = await prisma.user
              .findUnique({
                where: { id: session.userId },
                select: { ldapUsername: true, email: true },
              })
              .catch(() => null);

            const loginName = userData?.ldapUsername ?? userData?.email?.split('@')[0] ?? null;

            // EXTENSION POINT: this hook runs on every SSO session creation — the reliable
            // place to sync custom user fields (employee code, department, job title, …)
            // from your directory / HR source into the user row.
            await prisma.user
              .update({
                where: { id: session.userId },
                data: {
                  authType: 'sso',
                  // Set ldapUsername if not already stored (SSO-first users)
                  ...(loginName && !userData?.ldapUsername ? { ldapUsername: loginName } : {}),
                },
              })
              .catch(() => {});

            await prisma.activityLog
              .create({
                data: {
                  userId: session.userId,
                  action: 'login.success',
                  detail: JSON.stringify({ authType: 'sso' }),
                },
              })
              .catch(() => {});
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
