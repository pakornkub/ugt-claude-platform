// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/i18n/request.ts
// kit-hash: 248d1b85c62a
// Cookie-based locale — no [locale] segment in the URL. The cookie is written
// by lib/actions/locale.ts (session-guarded Server Action); this only reads it.
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, messages, type AppLocale } from '@/i18n/messages';

const SUPPORTED: readonly AppLocale[] = ['th', 'en'];

function isSupported(value: string | undefined): value is AppLocale {
  return value !== undefined && (SUPPORTED as readonly string[]).includes(value);
}

export default getRequestConfig(async () => {
  // An unknown or absent cookie falls back rather than throwing: a stale cookie
  // from an older deploy must not 500 every page.
  const cookieValue = (await cookies()).get('locale')?.value;
  const locale: AppLocale = isSupported(cookieValue) ? cookieValue : DEFAULT_LOCALE;
  return { locale, messages: messages[locale] };
});
