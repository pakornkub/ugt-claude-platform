// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/lib/ldap.ts
// kit-hash: 8e0c19832960
// [METHOD: LDAP] — delete this file if LDAP login is not enabled.
import { Client } from 'ldapts';
import { env } from '@/lib/env';

export interface LDAPUser {
  dn: string;
  displayName: string;
  email: string;
  sAMAccountName: string;
}

/** Escape special characters in an LDAP filter value per RFC 4515. */
function escapeLdapFilterValue(value: string): string {
  return value
    .replaceAll('\\', String.raw`\5c`) // backslash must be escaped first
    .replaceAll('*', String.raw`\2a`)
    .replaceAll('(', String.raw`\28`)
    .replaceAll(')', String.raw`\29`)
    .replaceAll('\0', String.raw`\00`);
}

export async function ldapBind(username: string, password: string): Promise<LDAPUser> {
  // Note: prefer ldaps:// (TLS, port 636) whenever the AD server exposes it.
  // Plain ldap:// is acceptable only when the server sits on a private internal
  // network segment and traffic never leaves the corporate LAN.

  const client = new Client({
    url: env.LDAP_URL,
    connectTimeout: 5000,
  });

  // Bind as UPN (user@domain) — works on Active Directory without knowing the full DN.
  const userDN = `${username}@${env.LDAP_DOMAIN}`;

  try {
    await client.bind(userDN, password);

    // Look up the account the bind ACTUALLY authenticated — never the typed text
    // as a sAMAccountName. AD resolves `x@domain` to the account whose explicit
    // userPrincipalName is that value first; only when none exists does it fall
    // back to the implicit form (sAMAccountName x). Searching sAMAccountName=x
    // straight away can return a DIFFERENT person whose sAMAccountName happens to
    // equal the UPN prefix the user typed. Same order here as AD's.
    const attributes = ['displayName', 'mail', 'sAMAccountName'];
    const byUpn = await client.search(env.LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(&(objectCategory=person)(userPrincipalName=${escapeLdapFilterValue(userDN)}))`,
      attributes,
    });
    const entries =
      byUpn.searchEntries.length > 0
        ? byUpn.searchEntries
        : (
            await client.search(env.LDAP_BASE_DN, {
              scope: 'sub',
              filter: `(&(objectCategory=person)(sAMAccountName=${escapeLdapFilterValue(username)}))`,
              attributes,
            })
          ).searchEntries;

    if (entries.length !== 1) {
      throw new Error(
        entries.length === 0 ? 'Bound user not found in directory' : 'Bound user is ambiguous in directory'
      );
    }
    const entry = entries[0];
    // The directory's sAMAccountName is THE identity key (user upsert, HR lookup,
    // pending role) — without it there is nothing safe to key on.
    const sAMAccountName = entry['sAMAccountName'];
    if (typeof sAMAccountName !== 'string' || !sAMAccountName) {
      throw new Error('Bound user has no sAMAccountName');
    }

    return {
      dn: entry.dn,
      displayName: (entry['displayName'] as string) ?? sAMAccountName,
      email: (entry['mail'] as string) ?? `${sAMAccountName}@${env.LDAP_DOMAIN}`,
      sAMAccountName,
    };
  } finally {
    await client.unbind().catch(() => {});
  }
}
