// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/components/language-switcher.tsx
// kit-hash: 75530cd66697
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// requires next-intl — ship only when the project chose th+en
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/lib/actions/locale';

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: 'en' | 'th') {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center overflow-hidden rounded-md border text-xs font-medium">
      <button
        onClick={() => switchLocale('en')}
        disabled={isPending}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === 'en'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        {t('english')}
      </button>
      <button
        onClick={() => switchLocale('th')}
        disabled={isPending}
        className={`px-2.5 py-1.5 transition-colors ${
          locale === 'th'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        {t('thai')}
      </button>
    </div>
  );
}
