// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/lib/ldap.ts
// kit-hash: 2489716bdbba
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

    const { searchEntries } = await client.search(env.LDAP_BASE_DN, {
      scope: 'sub',
      filter: `(sAMAccountName=${escapeLdapFilterValue(username)})`,
      attributes: ['displayName', 'mail', 'sAMAccountName'],
    });

    if (searchEntries.length === 0) {
      throw new Error('User not found in directory');
    }

    const entry = searchEntries[0];

    return {
      dn: entry.dn,
      displayName: (entry['displayName'] as string) ?? username,
      email: (entry['mail'] as string) ?? `${username}@${env.LDAP_DOMAIN}`,
      sAMAccountName: (entry['sAMAccountName'] as string) ?? username,
    };
  } finally {
    await client.unbind().catch(() => {});
  }
}
