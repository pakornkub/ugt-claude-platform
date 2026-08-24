// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/messages/auth.en.ts
// kit-hash: 9da3ee51495c
import type { authTh } from './auth.th';

// Named alias (rather than an inline mapped type on `authEn` itself) so
// scripts/check-i18n.mjs's catalog-parity check — which locates the object
// literal by scanning for the first brace after the export statement — lands
// on the value, not the type.
type AuthCatalog = { [K in keyof typeof authTh]: Record<keyof (typeof authTh)[K], string> };

export const authEn: AuthCatalog = {
  errors: {
    UNAUTHORIZED: 'Please sign in to continue.',
    FORBIDDEN: "You don't have permission for this action.",
    INVALID_INPUT: 'Please check the information you entered.',
    ALREADY_INITIALIZED: 'Admin setup has already been completed.',
    TOO_MANY_ATTEMPTS: 'Too many attempts. Please try again later.',
    INVALID_AD_CREDENTIALS: 'Invalid username or password.',
    INVALID_LOCAL_CREDENTIALS: 'Invalid email or password.',
    CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role.',
    EMAIL_IN_USE: 'This email is already in use.',
    USER_NOT_FOUND: 'User not found.',
    SSO_LDAP_NO_RESET: 'This account signs in through SSO/LDAP — change the password there instead.',
    NO_PASSWORD_SET: 'This account has no password set.',
    ROLE_NAME_REQUIRED: 'Please enter a role name.',
    ROLE_NOT_FOUND: 'Role not found.',
    SYSTEM_ROLE_EDIT_BLOCKED: 'System roles cannot be edited.',
    SYSTEM_ROLE_DELETE_BLOCKED: 'System roles cannot be deleted.',
    RESET_LINK_RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
    RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
    RESET_LINK_INVALID: 'This link has expired or was already used. Please request a new one.',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
    CHANGE_PASSWORD_FAILED: 'Could not change your password.',
    WRONG_CURRENT_PASSWORD: 'Your current password is incorrect.',
    CURRENT_PASSWORD_REQUIRED: 'Please enter your current password.',
    PASSWORD_TOO_SHORT: 'Password must be at least {min} characters.',
    PASSWORD_TOO_LONG: 'Password must be at most {max} characters.',
    PASSWORD_NEED_LOWER: 'Must include at least one lowercase letter.',
    PASSWORD_NEED_UPPER: 'Must include at least one uppercase letter.',
    PASSWORD_NEED_DIGIT: 'Must include at least one digit.',
    PASSWORD_MISMATCH: "The two passwords don't match.",
    USER_NAME_REQUIRED: 'Please enter a name.',
    EMAIL_REQUIRED: 'Please enter an email.',
    EMAIL_INVALID: 'Please enter a valid email.',
    PASSWORD_REQUIRED: 'Please enter a password.',
    AD_USERNAME_REQUIRED: 'Please enter your AD username.',
  },
  passwordPolicy: {
    hint: 'At least {min} characters, including lowercase, uppercase, and a digit.',
  },
  login: {
    ssoConnectFailed: "Couldn't connect to SSO. Please try again.",
    ssoTitle: 'Sign in with your organization account (Single Sign-On)',
    ssoConnecting: 'Connecting...',
    submit: 'Sign in',
    passwordLabel: 'Password',
    emailLabel: 'Email',
    forgotPasswordLink: 'Forgot password?',
    sessionExpiredBanner: 'Your session has expired. Please sign in again.',
    ssoErrorUnableToCreateUser: 'Signed in, but the account could not be created. Please contact your administrator. (unable_to_create_user)',
    ssoErrorAccountNotLinked: "This account isn't linked yet. Please contact your administrator. (account_not_linked)",
    ssoErrorGeneric: 'Sign-in failed. Please contact your administrator. ({code})',
    subtitle: 'Sign in to continue',
    orSeparator: 'or',
    tabAd: 'AD account',
    tabEmail: 'Email',
  },
};
