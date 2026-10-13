// kit: ugt-nextjs-platform 4.76.0 · ugt-nextjs-design-setup/components/dev-environment-bar.tsx
// kit-hash: 1f1066a198ba
// source: ugt-voice-platform (2026-10-09) — installed by ugt-nextjs-design-setup (org UI kit)
// Full-width banner at the very top of EVERY page of the dev deployment —
// login page included, which is why it mounts in app/layout.tsx (outside the
// shell and its site-header), not inside the shell. NOT sticky on purpose: it
// scrolls away instead of covering a sticky top bar; the site-header's `DEV`
// badge stays as the compact reminder. The layout decides WHEN to render it
// (`{isDevEnvironment() && <DevEnvironmentBar />}`); this component only draws.
import { FlaskConical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { TONE_STYLES } from '@/components/ui/status-badge';

export function DevEnvironmentBar({
  note,
  className,
}: Readonly<{
  /**
   * Optional extra clause after the standard text — resolved by the caller from
   * the project's own catalog (messages/app.*.ts), never from the kit namespace.
   * Use it when ugt-nextjs-mail-setup dev mode is installed, e.g.
   * "every email goes back to the person who triggered it" — true only then.
   */
  note?: string;
  className?: string;
}>) {
  const t = useTranslations('kit.devEnvironment');
  return (
    <output
      className={cn(
        'flex w-full items-center justify-center gap-2 border-b px-4 py-1.5 text-center text-xs font-medium',
        TONE_STYLES.warning,
        className
      )}
    >
      <FlaskConical className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>
        {t('label')} — {t('message')}
        {note ? ` · ${note}` : ''}
      </span>
    </output>
  );
}
