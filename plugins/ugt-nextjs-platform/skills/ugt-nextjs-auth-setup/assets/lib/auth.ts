// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/lib/auth.ts
// kit-hash: 744f6697b77e
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { genericOAuth, keycloak } from 'better-auth/plugins'; // [METHOD: SSO] — remove import if SSO not enabled
import { APIError, createAuthMiddleware } from 'better-auth/api'; // [METHOD: LOCAL] — the org-email sign-in guard below
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { isOrgEmail, orgEmailVariants, toCanonicalEmail } from '@/lib/org-email';
import { sendTemplatedMail } from '@/lib/email'; // [METHOD: LOCAL] — needs ugt-nextjs-mail-setup; remove with sendResetPassword
// [METHOD: SSO] — remove with the enrichment in the session hook below when the
// project has no central employee directory to read from
import { directoryUserFields, getDirectoryPerson } from '@/lib/directory';
import { afterOrgLogin } from '@/lib/after-login'; // [METHOD: SSO]

// Derive a unique cookie prefix from NEXT_PUBLIC_BASE_PATH (e.g. '/expense-portal' → 'expense-portal').
// This prevents cross-app cookie collisions when multiple apps share the same domain
// (two apps both using Better Auth would otherwise create identically-named cookies at
// path=/, causing an infinite redirect loop — ERR_TOO_MANY_REDIRECTS — via HMAC mismatch
// in the auth-guard layout).
// Falls back to 'better-auth' when no BASE_PATH is configured (local dev, single app).
// MUST stay in sync with proxy.ts (getSessionCookie) and lib/actions/auth.ts (SESSION_COOKIE_NAME).
const cookiePrefix = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';

// [METHOD: SSO] — Keycloak's fixed OIDC endpoints under the realm issuer (the same values its
// discovery document returns). genericOAuth fetches discovery ONCE in init and, if that fetch
// fails (Keycloak/proxy blip while the container starts), SKIPS the provider for the life of
// the process — every login then answers 404 PROVIDER_NOT_FOUND until a restart. Passing the
// endpoints keeps the provider registered. Trade-off: on a run where discovery FAILED, genericOAuth
// has no issuer/JWKS, so id_token signature/nonce/iss checks are skipped and identity comes from the
// token response alone (closed intranet + NODE_TLS_REJECT_UNAUTHORIZED=0 — accepted, see auth-flows.md).
// Restart the container once Keycloak is reachable to get the verified path back.
function keycloakEndpoints(issuer: string) {
  const base = `${issuer.replace(/\/$/, '')}/protocol/openid-connect`;
  return {
    authorizationUrl: `${base}/auth`,
    tokenUrl: `${base}/token`,
    userInfoUrl: `${base}/userinfo`,
  };
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    // Scope all auth cookies to this app's base path prefix.
    // Cookie names become e.g. "expense-portal.session_token" or "__Secure-expense-portal.session_token".
    cookiePrefix,
  },
  trustedOrigins: (env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',').filter(Boolean),
  // Auth errors land on the login page (which exists in every deployment)
  // instead of Better Auth's default /api/auth/error. That default is computed
  // WITHOUT the Next.js basePath — the same trap as redirectURI and the mailed
  // reset link — so under a shared domain it 404s at the proxy and the user
  // sees a blank nginx page instead of the error code. login-form.tsx maps
  // ?error=<code> to a Thai message.
  onAPIError: {
    errorURL: `${env.NEXT_PUBLIC_BASE_PATH}/login`,
    onError: (error) => {
      // The redirect carries only the error code; the real cause (Prisma
      // constraint, missing field, hook throw) is only visible here — this log
      // is the first thing to read when SSO fails (docker logs <container>).
      console.error('[auth] API error:', error);
    },
  },
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
            action: AUDIT_ACTIONS.PASSWORD_RESET,
            detail: JSON.stringify({ authType: 'local' }),
          },
        })
        .catch(() => {});
    },
  },
  // [METHOD: LOCAL] — org mailboxes (ORG_EMAIL_DOMAINS) sign in through SSO/LDAP
  // only. A local password on an org email is the shared-account hole: whoever
  // holds it gets the employee's row — and, once SSO links into it, their role.
  // createLocalUserAction refuses to create one; this refuses to sign one in
  // (covers rows made before the rule, and direct calls that skip the Server
  // Action). localLoginAction checks first so the user sees ORG_EMAIL_USE_SSO.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return;
      const email: unknown = ctx.body?.email;
      if (typeof email === 'string' && isOrgEmail(email)) {
        throw new APIError('FORBIDDEN', { message: 'ORG_EMAIL_USE_SSO' });
      }
    }),
  },
  rateLimit: {
    storage: 'database', // requires the rateLimit model (see schema-auth.prisma)
    // Keys are the endpoint path RELATIVE to Better Auth's own basePath — the
    // library strips `/api/auth` (its basePath) from the request path before
    // matching, so a key written as '/api/auth/sign-in/email' never matches and
    // the rule silently does nothing (the default limit applies instead).
    customRules: {
      // [METHOD: LOCAL] — stricter window for email sign-in: 5 attempts per 60 seconds.
      // Remove this rule when Local login is not selected (emailAndPassword.enabled: false).
      '/sign-in/email': { window: 60, max: 5 },
      // [METHOD: LOCAL] — each success sends a real email; 3 per 15 minutes.
      // The Server Action limits by IP too, but this also covers direct API calls.
      '/request-password-reset': { window: 15 * 60, max: 3 },
    },
  },
  session: {
    expiresIn: 8 * 60 * 60, // 8 hours — org standard
    updateAge: 30 * 60, // refresh if 30 min remaining — org standard
  },
  // [METHOD: SSO] — declared so the value mapProfileToUser returns is STORED on
  // the row Better Auth creates at the first SSO login (undeclared fields are
  // dropped). It is the AD login Keycloak vouched for (preferred_username) and
  // the key every later step uses: directory refresh, pre-assigned role, LDAP
  // upsert. `input: false` — no client request can set it.
  user: {
    additionalFields: {
      ldapUsername: { type: 'string', required: false, input: false },
    },
  },
  // [METHOD: SSO] — allow Keycloak SSO to link into the existing row of the SAME
  // AD identity (an LDAP-first user) by email. Linking is scoped by
  // mapProfileToUser below: it hands Better Auth the email of the row whose
  // ldapUsername matches, and refuses when the email belongs to any other row
  // not linked to this Keycloak subject (a Local account, a different AD user)
  // — so SSO can never be linked into a Local account.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['keycloak'],
      // better-auth ≥1.6.11 blocks implicit linking into a local row unless
      // emailVerified is true (nOAuth fix). Our LDAP upsert / admin-create DO
      // set emailVerified: true, but the flag stays relaxed so linking never
      // hinges on that invariant holding across every code path (e.g. a row
      // written before that fix, or a future writer that forgets). Safe HERE ONLY
      // because (1) self-registration is closed and pre-assignment creates no
      // rows (มติ 2026-08-11, amended 2026-10-14) — every row is admin- or
      // directory-created — and (2) mapProfileToUser only ever links into the
      // row of the same AD username.
      requireLocalEmailVerified: false,
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
                  // pkce defaults to true since better-auth 1.7 — kept explicit
                  // because Keycloak's client config (keycloak-client.md) must
                  // also have PKCE=S256 set, and this is the line that documents why.
                  pkce: true,
                  // redirectURI must include the basePath — Better Auth alone would
                  // compute it without the Next.js basePath segment. Path is
                  // `/api/auth/callback/:id` (not `/api/auth/oauth2/callback/:id`)
                  // since better-auth 1.7 folded generic OAuth into the core social
                  // provider callback route — must match keycloak-client.md exactly.
                  redirectURI: `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH}/api/auth/callback/keycloak`,
                  overrideUserInfo: true, // refresh user fields on every SSO login
                }),
                ...keycloakEndpoints(env.KEYCLOAK_ISSUER), // survives a failed discovery — see above
                mapProfileToUser: async (profile: Record<string, unknown>) => {
                  const loginName = typeof profile.preferred_username === 'string' ? profile.preferred_username : '';
                  const subject = typeof profile.sub === 'string' ? profile.sub : '';
                  if (!loginName || !subject) {
                    // No AD login = no identity to resolve and nothing to check the
                    // email clash against — refuse (fail closed, same path as the
                    // clash below) instead of handing Better Auth an email to link by.
                    throw new Error(
                      'SSO login refused: the Keycloak profile has no preferred_username/sub — check the "profile" scope of the Keycloak client',
                    );
                  }

                  // Identity is the AD username, not the email. The AD email and the
                  // stored email can drift apart (e.g. user@company.com in AD vs
                  // user@company.co.th in an LDAP-created row) — letting the AD email
                  // through makes Better Auth "create" instead of "link", and the
                  // create dies on the ldapUsername unique constraint
                  // (unable_to_create_user). Resolve the existing row first and let
                  // ITS email win (see references/auth-flows.md §SSO).
                  const existing = await prisma.user
                    .findUnique({ where: { ldapUsername: loginName }, select: { email: true } })
                    .catch(() => null);
                  // A new identity's email goes onto the canonical org domain
                  // (ORG_EMAIL_DOMAINS) before it is stored; an existing row keeps
                  // its stored email here (Better Auth finds the row by it) and the
                  // session hook below canonicalizes it.
                  const profileEmail = profile.email as string | undefined;
                  const email = existing?.email ?? (profileEmail ? toCanonicalEmail(profileEmail) : undefined);
                  if (!email) {
                    // No stored row AND Keycloak sent no email (client missing the
                    // "email" scope, or the AD account has no mail attribute) —
                    // creation would fail anyway; fail with a findable log message
                    // instead of a bare unable_to_create_user.
                    throw new Error(
                      `SSO profile for "${loginName}" has no email — check the Keycloak client's "email" scope and the AD account's mail attribute`,
                    );
                  }
                  if (!existing) {
                    // First SSO login of this AD identity. Better Auth links by email,
                    // so a row that already holds this mailbox but is NOT this identity
                    // (a Local account on an org email, another AD user, a row from
                    // before ORG_EMAIL_DOMAINS) would be handed to whoever logs in here —
                    // and its password holder keeps signing in as the employee. Refuse
                    // (fail closed — no .catch). Only a row already linked to THIS
                    // Keycloak subject is the same person; a row carrying another AD
                    // identity's Keycloak account is refused too. An admin resolves the
                    // other row — references/troubleshooting-sso.md, the row starting
                    // "SSO ends in an error and the log says `SSO login for …refused`".
                    const clash = await prisma.user.findFirst({
                      where: {
                        email: { in: orgEmailVariants(email) },
                        accounts: { none: { providerId: 'keycloak', accountId: subject } },
                      },
                      select: { id: true },
                    });
                    if (clash) {
                      throw new Error(
                        `SSO login for "${loginName}" refused: ${email} already belongs to user ${clash.id}, which is not this AD identity — linking would share one account between two people`,
                      );
                    }
                  }

                  // ldapUsername is stored because user.additionalFields declares it.
                  // Any other custom field returned here is dropped — persist those in
                  // the databaseHooks.session.create.after hook below (where the
                  // directory fields are written).
                  return { email, ldapUsername: loginName };
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
            // ldapUsername = the AD login Keycloak sent (stored at the first SSO
            // login via user.additionalFields) or a prior LDAP login. NEVER derived
            // from the email: a mailbox local part is not an AD login, and matching
            // on it hands one person another's HR record and pending role.
            const userData = await prisma.user
              .findUnique({
                where: { id: session.userId },
                select: { ldapUsername: true, email: true },
              })
              .catch(() => null);

            const loginName = userData?.ldapUsername ?? null; // null → no directory lookup, no pending role

            // This hook runs on every SSO session creation — the reliable place to
            // refresh the directory fields (Better Auth does NOT persist custom
            // fields returned from mapProfileToUser). The LDAP path does the same
            // thing in ldapLoginAction, from the same helper, so an SSO user and an
            // AD user end up with the same columns filled.
            const person = loginName ? await getDirectoryPerson(loginName) : null;

            await prisma.user
              .update({
                where: { id: session.userId },
                data: {
                  authType: 'sso',
                  ...directoryUserFields(person),
                },
              })
              .catch(() => {});

            // Stored email onto the canonical org domain — its own update so a
            // unique clash (a legacy row on the other spelling) cannot take the
            // directory refresh above down with it.
            const canonicalEmail = userData?.email ? toCanonicalEmail(userData.email) : null;
            if (canonicalEmail && canonicalEmail !== userData?.email) {
              await prisma.user
                .update({ where: { id: session.userId }, data: { email: canonicalEmail } })
                .catch(() => {});
            }

            // Pre-assigned role + "no role yet" admin notice — never throws.
            await afterOrgLogin({ userId: session.userId, loginName, person });

            await prisma.activityLog
              .create({
                data: {
                  userId: session.userId,
                  action: AUDIT_ACTIONS.LOGIN_SUCCESS,
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
