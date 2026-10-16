// kit: ugt-nextjs-platform 4.79.4 · ugt-nextjs-design-setup/components/language-switcher.tsx
// kit-hash: 9c7c4a8e9778
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// requires next-intl — ship only when the project chose th+en
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/lib/actions/locale';

export function LanguageSwitcher() {
  const t = useTranslations('kit.languageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: 'en' | 'th') {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  // label = locale code (EN / TH) on every screen; the full language name stays as aria-label
  return (
    <div className="flex items-center overflow-hidden rounded-md border text-xs font-medium">
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        aria-label={t('english')}
        aria-pressed={locale === 'en'}
        lang="en"
        className={`px-2.5 py-1.5 transition-colors ${
          locale === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale('th')}
        disabled={isPending}
        aria-label={t('thai')}
        aria-pressed={locale === 'th'}
        lang="th"
        className={`px-2.5 py-1.5 transition-colors ${
          locale === 'th'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        TH
      </button>
    </div>
  );
}
