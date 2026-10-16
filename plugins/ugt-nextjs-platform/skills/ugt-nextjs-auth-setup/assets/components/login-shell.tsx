// kit: ugt-nextjs-platform 4.83.0 · ugt-nextjs-auth-setup/components/login-shell.tsx
// kit-hash: 29fcd3180aaf
// components/login-shell.tsx — the org login page (DESIGN.md §3 "หน้า login")
// installed by ugt-nextjs-auth-setup · Server Component (reads the filesystem + env)
//
//   ≥ lg  LEFT  = dark hero <aside>: optional photo (public/login-hero.webp) with a
//                 slow Ken Burns zoom, long logo → app name + description + glass
//                 feature tiles
//         RIGHT = <main>: whatever form the page passes as children (kit <LoginForm>,
//                 or the project's own form in preserve mode — §5.7) on bg-background
//   < lg  the same dark panel fills the screen BEHIND the form; the form sits on a
//         frosted-glass card (bg-card/90 — not white, so dark mode stays readable)
//
// The panel is dark in BOTH themes, so its colours are fixed palette steps
// (indigo-950 + white), not theme tokens — the one sanctioned exception
// (มติ A4 2026-10-16, ที่มา ugt-hrms DESIGN.md 2026-09-24). The form side keeps the
// normal tokens. Re-tinting the panel = change `indigo-950` in PANEL_* below only.
//
// Motion: the photo (or the CSS fallback) zooms 1 → 1.08 over 30 s, alternating —
// `motion-safe:` only, and the global reduced-motion block in globals.css stops it
// too. The keyframes ship inside this component (<style> React hoists into <head>),
// so globals.css needs no addition. No 3D / JS animation library — this is the page
// every user loads first.
//
// **No copy lives here** — every visible string comes from the project through
// `hero` (the page builds it from its own messages/app.*.ts catalog). Kit files
// are overwritten on update; a project's wording must not be. Omit `hero` and the
// page is the plain centred form.
//
// The form column IS the page's <main> landmark — the root layout renders none
// (only the (admin) shell does), so the login page must not add another.
// Headings: the form carries the page's single <h1>; the hero title is styled
// text, not a heading, so no <h2> comes before the <h1> in document order.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

export type LoginHeroContent = {
  /** App name — large hero text; deliberately not a heading (the form owns the <h1>) */
  title: string;
  /** One line under the heading */
  description: string;
  /** 3–4 tiles: lucide icon + short title + one muted line */
  features: ReadonlyArray<{ icon: LucideIcon; title: string; text: string }>;
  /** Small line under the form, e.g. "© 2026 UBE · Developed by SW" */
  footer?: string;
};

// Optional photo: no file → the CSS fallback below, never a broken-image icon.
// Checked once per server process — public/ is baked into the image at build
// (cicd Dockerfile copies /app/public), so it cannot appear later at runtime.
const HAS_PHOTO = existsSync(join(process.cwd(), 'public', 'login-hero.webp'));

// Fixed panel colour (dark in light AND dark mode) — see header
const PANEL_BG = 'bg-indigo-950';
const PANEL_SHADE_Y = 'bg-linear-to-b from-indigo-950/55 via-indigo-950/10 to-indigo-950/90';
const PANEL_SHADE_X = 'bg-linear-to-r from-indigo-950/40 to-transparent';

// No photo: two soft light pools (indigo-500 · indigo-300 — one brand hue, no
// second accent colour) + a faint grid on the dark panel — a hero is the one
// place a gradient is allowed (contract: gradient only on hero/banner)
const FALLBACK_ART =
  'bg-[radial-gradient(60%_50%_at_20%_15%,rgb(99_102_241/0.55),transparent_70%),radial-gradient(55%_45%_at_85%_80%,rgb(165_180_252/0.22),transparent_70%),linear-gradient(rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-size-[100%_100%,100%_100%,48px_48px,48px_48px]';

const KEN_BURNS = 'motion-safe:animate-[ugt-login-kenburns_30s_ease-in-out_infinite_alternate]';
const KEN_BURNS_KEYFRAMES =
  '@keyframes ugt-login-kenburns{from{transform:scale(1)}to{transform:scale(1.08) translate(-1%,-1%)}}';

export async function LoginShell({
  hero,
  children,
}: Readonly<{ hero?: LoginHeroContent; children: React.ReactNode }>) {
  if (!hero) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    );
  }

  const t = await getTranslations('auth.login');
  // next/image does NOT prefix /public paths with the basePath — and neither
  // does a CSS mask url(); both carry it explicitly
  const basePath = env.NEXT_PUBLIC_BASE_PATH || '';
  // long logo (with tagline) on login/landing — CSS mask, never <img> (DESIGN.md §3);
  // white because it always sits on the dark panel. No display utility in here —
  // each copy sets its own (a `block` here would beat the desktop copy's `hidden`)
  const logoClass = 'h-10 w-40 bg-white [mask-position:left] [mask-repeat:no-repeat] [mask-size:contain]';
  const logoStyle = { maskImage: `url(${basePath}/brand/ube-logo-long.svg)` };

  return (
    <div className="relative min-h-svh lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* href + precedence: React hoists this into <head> once, however often it renders */}
      <style href="ugt-login-kenburns" precedence="default">
        {KEN_BURNS_KEYFRAMES}
      </style>

      {/* full-screen backdrop below lg, left column from lg */}
      <aside className={cn('absolute inset-0 overflow-hidden text-white lg:relative lg:flex lg:flex-col lg:p-10 xl:p-14', PANEL_BG)}>
        {HAS_PHOTO ? (
          // decorative (alt=""): the panel's text says what the app is.
          // eager + high priority: it is visible on every screen size now
          <Image
            src={`${basePath}/login-hero.webp`}
            alt=""
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            loading="eager"
            fetchPriority="high"
            className={cn('object-cover', KEN_BURNS)}
          />
        ) : (
          <div aria-hidden className={cn('absolute inset-0', FALLBACK_ART, KEN_BURNS)} />
        )}
        <div aria-hidden className={cn('absolute inset-0', PANEL_SHADE_Y)} />
        <div aria-hidden className={cn('absolute inset-0', PANEL_SHADE_X)} />

        <span role="img" aria-label={t('orgLogoLabel')} className={cn('relative hidden lg:block', logoClass)} style={logoStyle} />

        {/* hero text: desktop only — on a phone the form is the page */}
        <div className="relative mt-auto hidden max-w-2xl flex-col gap-6 lg:flex">
          <div className="flex flex-col gap-3">
            <p className="text-3xl leading-tight font-semibold tracking-tight text-balance drop-shadow-md xl:text-4xl">
              {hero.title}
            </p>
            <p className="max-w-[60ch] text-base leading-relaxed text-white/85">{hero.description}</p>
          </div>
          {/* 2 columns; an odd last tile (3 features) spans the row instead of leaving a hole */}
          <ul className="grid grid-cols-2 gap-3 [&>li:last-child:nth-child(odd)]:col-span-2">
            {hero.features.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-md"
              >
                <Icon aria-hidden className="size-5 text-indigo-200" />
                <span className="text-sm font-medium">{title}</span>
                <span className="text-xs leading-snug text-white/75">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex min-h-svh flex-col gap-6 px-4 py-6 sm:p-10 lg:min-h-0 lg:bg-background">
        <span role="img" aria-label={t('orgLogoLabel')} className={cn('block lg:hidden', logoClass)} style={logoStyle} />
        <div className="flex flex-1 items-center justify-center">
          {/* glass card over the photo below lg · plain column from lg */}
          <div className="w-full max-w-sm max-lg:rounded-lg max-lg:border max-lg:border-white/30 max-lg:bg-card/90 max-lg:p-6 max-lg:text-card-foreground max-lg:shadow-2xl max-lg:backdrop-blur-xl max-lg:backdrop-saturate-150">
            {children}
          </div>
        </div>
        {hero.footer && <p className="text-center text-xs text-white/80 lg:text-muted-foreground">{hero.footer}</p>}
      </main>
    </div>
  );
}
