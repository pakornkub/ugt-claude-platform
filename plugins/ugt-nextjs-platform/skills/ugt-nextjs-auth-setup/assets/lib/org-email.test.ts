// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/lib/org-email.test.ts
// kit-hash: c2f57aac2809
// installed by ugt-nextjs-auth-setup alongside lib/org-email.ts
import { describe, expect, it } from 'vitest';
import { isOrgEmail, orgEmailVariants, parseOrgDomains, toCanonicalEmail } from './org-email';

const domains = parseOrgDomains(' ube.com, @UBE.co.th ,');

describe('org email domains', () => {
  it('parses the env list — first entry is canonical', () => {
    expect(domains).toEqual(['ube.com', 'ube.co.th']);
  });

  it('treats an unset/empty list as "off"', () => {
    expect(parseOrgDomains(undefined)).toEqual([]);
    expect(parseOrgDomains('  ')).toEqual([]);
  });

  it('refuses a malformed list instead of silently disabling the protection', () => {
    expect(() => parseOrgDomains('ube.com;ube.co.th')).toThrow(/ORG_EMAIL_DOMAINS/);
    expect(() => parseOrgDomains('ube.com ube.co.th')).toThrow(/ORG_EMAIL_DOMAINS/);
    expect(() => parseOrgDomains('ube.com,user@ube.co.th')).toThrow(/ORG_EMAIL_DOMAINS/);
    expect(() => parseOrgDomains('ube')).toThrow(/ORG_EMAIL_DOMAINS/);
    expect(() => parseOrgDomains('-ube.com')).toThrow(/ORG_EMAIL_DOMAINS/);
  });

  it('recognises every org domain, case-insensitively', () => {
    expect(isOrgEmail('a@ube.com', domains)).toBe(true);
    expect(isOrgEmail('a@UBE.CO.TH', domains)).toBe(true);
    expect(isOrgEmail('a@gmail.com', domains)).toBe(false);
    expect(isOrgEmail('a@sub.ube.com', domains)).toBe(false); // subdomain is not the org mailbox
    expect(isOrgEmail('not-an-email', domains)).toBe(false);
  });

  it('is a no-op when ORG_EMAIL_DOMAINS is unset', () => {
    expect(isOrgEmail('a@ube.com', [])).toBe(false);
    expect(toCanonicalEmail(' A@ube.co.th ', [])).toBe('A@ube.co.th');
  });

  it('moves org mail onto the canonical domain, lowercased', () => {
    expect(toCanonicalEmail('Somchai.J@UBE.co.th', domains)).toBe('somchai.j@ube.com');
    expect(toCanonicalEmail('somchai.j@ube.com', domains)).toBe('somchai.j@ube.com');
    expect(toCanonicalEmail('Vendor@Partner.com', domains)).toBe('Vendor@Partner.com');
  });

  it('lists every equivalent form for lookups', () => {
    expect(orgEmailVariants('A@ube.co.th', domains).sort()).toEqual(['A@ube.co.th', 'a@ube.co.th', 'a@ube.com'].sort());
    expect(orgEmailVariants('x@partner.com', domains)).toEqual(['x@partner.com']);
  });
});
