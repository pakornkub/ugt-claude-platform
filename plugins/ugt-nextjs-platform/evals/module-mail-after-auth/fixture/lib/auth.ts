// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/lib/auth.ts
// kit-hash: 1249dde70440
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { genericOAuth, keycloak } from 'better-auth/plugins';
// APIError: the SSO refusal redirect + the org-email sign-in guard (Local);
// createAuthMiddleware: that guard only
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { AUDIT_ACTIONS } from '@/lib/audit-actions';
import { isOrgEmail, orgEmailVariants, toCanonicalEmail } from '@/lib/org-email';
// Employee directory enrichment in the session hook (HRLINK.HRMS.dbo.vw_EmployeeAll)
import { directoryUserFields, getDirectoryPerson } from '@/lib/directory';
import { afterOrgLogin } from '@/lib/after-login';

// Derive a unique cookie prefix from NEXT_PUBLIC_BASE_PATH (e.g. '/leave-request' → 'leave-request').
// This prevents cross-app cookie collisions when multiple apps share the same domain
// (two apps both using Better Auth would otherwise create identically-named cookies at
// path=/, causing an infinite redirect loop — ERR_TOO_MANY_REDIRECTS — via HMAC mismatch
// in the auth-guard layout). prod (/leave-request) and dev (/leave-request-dev) share
// apps.ugt.local, so this is what keeps their sessions apart.
// Falls back to 'better-auth' when no BASE_PATH is configured (local dev, single app).
// MUST stay in sync with middleware.ts (getSessionCookie) and lib/actions/auth.ts (SESSION_COOKIE_NAME).
const cookiePrefix = (env.NEXT_PUBLIC_BASE_PATH || '').replace(/^\//, '') || 'better-auth';

// Keycloak's fixed OIDC endpoints under the realm issuer (the same values its
// discovery document returns). genericOAuth fetches discovery ONCE in init and, if that fetch
// fails (Keycloak/proxy blip while the container starts), SKIPS the provider for the life of
// the process — every login then answers 404 PROVIDER_NOT_FOUND until a restart. Passing the
// endpoints keeps the provider registered. Trade-off: on a run where discovery FAILED, genericOAuth
// has no issuer/JWKS, so id_token signature/nonce/iss checks are skipped and identity comes from the
// token response alone (closed intranet + NODE_TLS_REJECT_UNAUTHORIZED=0 — accepted, see auth-flows.md).
// Restart the container once Keycloak is reachable to get the verified path back.
// Refusing an SSO login. A plain Error thrown from mapProfileToUser
// escapes the OAuth callback as a bare 500 (the callback has no try/catch and
// onAPIError.errorURL is not used for it); a 302 APIError lands the user on the
// login page, which shows sso_refused. The real reason is only in this log.
function refuseSso(reason: string): never {
  console.error(`[auth] SSO login refused: ${reason}`); // NOSONAR typescript:S106 — server-side log only
  throw new APIError('FOUND', undefined, {
    Location: `${env.BETTER_AUTH_URL}${env.NEXT_PUBLIC_BASE_PATH || ''}/login?error=sso_refused`,
  });
}

// The AD login (preferred_username) from the Keycloak id_token
// Better Auth stored on the account. Better Auth verified it at sign-in (JWKS)
// and rewrites it on every SSO sign-in, so this is the value Keycloak vouched
// for THIS login. Decoding only — the signature was already checked.
function preferredUsernameFromIdToken(idToken: string | null | undefined): string | null {
  const payload = idToken?.split('.')[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
    return typeof claims.preferred_username === 'string' && claims.preferred_username ? claims.preferred_username : null;
  } catch {
    return null;
  }
}

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
    // Cookie names become e.g. "leave-request.session_token" or "__Secure-leave-request.session_token".
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
    provider: 'sqlserver',
  }),
  // Email/password provider — Local login for external contractors without an AD account.
  emailAndPassword: {
    enabled: true,
    // `enabled: true` also publishes POST /api/auth/sign-up/email — open
    // self-registration on an internal app. Accounts are created by an admin on
    // /admin/users, so close it. `createLocalUserAction` writes the user +
    // credential rows itself (with `hashPassword` from better-auth/crypto), so
    // nothing on our side depends on the sign-up endpoint.
    disableSignUp: true,
    minPasswordLength: 8, // MUST match PASSWORD_MIN_LENGTH in lib/password-policy.ts
    // Complexity rules (uppercase, lowercase, digit, special) live in
    // lib/password-policy.ts — one schema shared by reset / change / admin-create.

    // Password reset. `sendResetPassword` is NOT installed yet — ugt-nextjs-mail-setup
    // comes in the next session (pass two, SKILL.md §3 Q7). Until then Better Auth
    // refuses the request with RESET_PASSWORD_DISABLED, which is the honest
    // behaviour — a reset link nobody can receive is worse than no reset at all.
    // Recovery meanwhile = an admin uses "ตั้งรหัสผ่าน" on /admin/users.
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour — org standard
    // A reset usually means "I think someone else is in my account". Leaving
    // that someone's session alive would make the reset pointless.
    revokeSessionsOnPasswordReset: true,
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
  // Org mailboxes (ORG_EMAIL_DOMAINS) sign in through SSO/LDAP
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
    storage: 'database', // requires the rateLimit model (see schema.prisma)
    // Keys are the endpoint path RELATIVE to Better Auth's own basePath — the
    // library strips `/api/auth` (its basePath) from the request path before
    // matching, so a key written as '/api/auth/sign-in/email' never matches and
    // the rule silently does nothing (the default limit applies instead).
    customRules: {
      // Stricter window for email sign-in: 5 attempts per 60 seconds.
      '/sign-in/email': { window: 60, max: 5 },
      // Each success sends a real email (once mail-setup is installed); 3 per 15 minutes.
      // The Server Action limits by IP too, but this also covers direct API calls.
      '/request-password-reset': { window: 15 * 60, max: 3 },
    },
  },
  session: {
    expiresIn: 8 * 60 * 60, // 8 hours — org standard
    updateAge: 30 * 60, // refresh if 30 min remaining — org standard
  },
  // Allow Keycloak SSO to link into the existing row of the SAME
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
  // Keycloak via genericOAuth + keycloak() helper.
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
                    refuseSso(
                      'the Keycloak profile has no preferred_username/sub — the client needs the "profile" scope (and, on Keycloak 25+, "basic", which carries sub)',
                    );
                  }

                  // Identity is the AD username, not the email. The AD email and the
                  // stored email can drift apart (e.g. user@ube.com in AD vs
                  // user@ube.co.th in an LDAP-created row) — letting the AD email
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
                      refuseSso(
                        `"${loginName}": ${email} already belongs to user ${clash.id}, which is not this AD identity — linking would share one account between two people`,
                      );
                    }
                  }

                  // Custom fields returned here are NOT stored (Better Auth keeps
                  // only standard fields from a provider profile) — ldapUsername and
                  // the directory fields are written by the session hook below.
                  return { email };
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
              // newest first: a re-created Keycloak user links a second account row by email
              orderBy: { updatedAt: 'desc' },
              select: { id: true, idToken: true },
            })
            .catch(() => null);

          if (keycloakAccount) {
            const userData = await prisma.user
              .findUnique({
                where: { id: session.userId },
                select: { ldapUsername: true, email: true },
              })
              .catch(() => null);

            // The AD login comes from THIS sign-in's id_token (preferred_username),
            // never from the email (a mailbox local part is not an AD login — it
            // would hand one person another's HR record and pending role) and
            // never from a value stored earlier that the token contradicts.
            // Written onto User.ldapUsername here: first SSO login, an AD rename,
            // and legacy rows filled from the email all converge on the IdP value.
            // Unknown, or held by another row (P2002) → loginName null: no HR
            // lookup, no pending role (fail closed); the login itself goes on.
            let loginName = preferredUsernameFromIdToken(keycloakAccount.idToken);
            if (!loginName) {
              console.error('[auth] SSO session without preferred_username in the id_token:', session.userId); // NOSONAR typescript:S106 — server-side log only
            } else if (loginName !== userData?.ldapUsername) {
              try {
                await prisma.user.update({ where: { id: session.userId }, data: { ldapUsername: loginName } });
              } catch (error) {
                const taken = (error as { code?: string }).code === 'P2002';
                console.error(
                  taken
                    ? `[auth] AD login "${loginName}" is already held by another user — ldapUsername of ${session.userId} left unchanged`
                    : `[auth] could not store ldapUsername for ${session.userId}`,
                  taken ? '' : error,
                ); // NOSONAR typescript:S106 — server-side log only
                loginName = null;
              }
            }

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

            // Pre-assigned role (+ "no role yet" admin notice once mail is installed) — never throws.
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
