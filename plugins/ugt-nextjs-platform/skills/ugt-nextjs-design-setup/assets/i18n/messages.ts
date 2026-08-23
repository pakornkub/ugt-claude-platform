// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/i18n/messages.ts
// kit-hash: 38f13ae13a66
// Every namespace the kit ships, merged per locale. A skill that adds its own
// catalog (auth, mail, upload) registers it here — one import + one spread.
// Project-owned strings belong in messages/app.*.ts, NOT in a kit namespace:
// kit files are overwritten wholesale on plugin update.
import { kitEn } from '@/messages/kit.en';
import { kitTh } from '@/messages/kit.th';
import type { AppLocale } from '@/lib/format';

export type { AppLocale };

export const messages: Record<AppLocale, Record<string, unknown>> = {
  th: { kit: kitTh },
  en: { kit: kitEn },
};

export const DEFAULT_LOCALE: AppLocale = 'th';
