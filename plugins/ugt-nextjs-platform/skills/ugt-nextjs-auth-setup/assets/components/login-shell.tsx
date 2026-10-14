// kit: ugt-nextjs-platform 4.78.0 · ugt-nextjs-auth-setup/components/login-shell.tsx
// kit-hash: cc79574750d2
// components/login-shell.tsx — two-column login page (DESIGN.md §3 "หน้า login")
// installed by ugt-nextjs-auth-setup · Server Component (reads the filesystem + env)
//
//   LEFT  = hero <aside>, from `lg` up only (mobile shows the form alone):
//           primary panel · optional photo (public/login-hero.webp) under a
//           bg-primary/65 overlay · 3 rows: long logo → app name + description +
//           feature rows → footer line
//   RIGHT = whatever form the page passes as children (kit <LoginForm>, or the
//           project's own form in preserve mode — §5.7), centred on bg-muted/30
//
// **No copy lives here** — every visible string comes from the project through
// `hero` (the page builds it from its own messages/app.*.ts catalog). Kit files
// are overwritten on update; a project's wording must not be. Omit `hero` and the
// page is the plain centred form.
//
// Do not wrap in <main>: the root layout already gives the login route one.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

export type LoginHeroContent = {
  /** App name — the hero heading (the form keeps the page's single <h1>) */
  title: string;
  /** One line under the heading */
  description: string;
  /** 3–4 rows: lucide icon + short title + one muted line */
  features: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }>;
  /** Small line at the bottom, e.g. "© 2026 UBE · Develop by SW" */
  footer?: string;
};

// Optional photo: no file → plain primary panel, never a broken-image icon.
// Checked once per server process — public/ is baked into the image at build
// (cicd Dockerfile copies /app/public), so it cannot appear later at runtime.
const HAS_PHOTO = existsSync(join(process.cwd(), 'public', 'login-hero.webp'));

export async function LoginShell({
  hero,
  children,
}: Readonly<{ hero?: LoginHeroContent; children: React.ReactNode }>) {
  const t = await getTranslations('auth.login');
  // next/image does NOT prefix /public paths with the basePath — and neither
  // does a CSS mask url(); both carry it explicitly
  const basePath = env.NEXT_PUBLIC_BASE_PATH;

  return (
    <div className={cn('min-h-svh', hero && 'lg:grid lg:grid-cols-2')}>
      {hero && (
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
          {HAS_PHOTO && (
            <Image src={`${basePath}/login-hero.webp`} alt="" fill priority sizes="50vw" className="object-cover" />
          )}
          <div aria-hidden className="absolute inset-0 bg-primary/65" />

          {/* long logo (with tagline) on login/landing — CSS mask so it takes the
              token colour; never <img> (DESIGN.md §3) */}
          <div className="relative">
            <span
              role="img"
              aria-label={t('orgLogoLabel')}
              className="block h-10 w-40 bg-primary-foreground [mask-position:left] [mask-repeat:no-repeat] [mask-size:contain]"
              style={{ maskImage: `url(${basePath}/brand/ube-logo-long.svg)` }}
            />
          </div>

          <div className="relative max-w-lg space-y-8">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight">{hero.title}</h2>
              <p className="text-lg text-primary-foreground/80">{hero.description}</p>
            </div>
            <ul className="space-y-5">
              {hero.features.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-primary-foreground/70">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-sm text-primary-foreground/60">{hero.footer}</p>
        </aside>
      )}

      <section
        className={cn(
          'flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10',
          hero && 'lg:min-h-0'
        )}
      >
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </div>
  );
}
