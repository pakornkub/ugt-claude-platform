// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/ui/page-shell.tsx
// kit-hash: 67317cd51e65
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Page scaffolding per DESIGN.md §3: container + single header row
 * (title/desc left, actions right) that stacks on mobile with full-width
 * action buttons. Layout-only — no state, no strings (callers translate).
 *
 * ```tsx
 * <PageShell>
 *   <PageHeader>
 *     <PageHeaderText>
 *       <PageBackLink href="/requests">{t('backToRequests')}</PageBackLink>   // sub-page only
 *       <PageEyebrow>{t('groupName')}</PageEyebrow>                          // optional
 *       <PageTitle>{t('title')}</PageTitle>
 *       <PageDescription>{t('description')}</PageDescription>
 *     </PageHeaderText>
 *     <PageActions>
 *       <Button variant="soft" size="cta">…</Button>
 *       <Button size="cta">…</Button>
 *     </PageActions>
 *   </PageHeader>
 *   …
 *   <PageFormActions>                                                       // form page only
 *     <Button variant="outline" size="cta">{t('cancel')}</Button>
 *     <Button type="submit" size="cta">{t('save')}</Button>
 *   </PageFormActions>
 * </PageShell>
 * ```
 */
function PageShell({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="page-shell"
      // content cap 1536px centred (มติ 2026-10-16 A1) — the site-header outside stays full width.
      // v4 dropped max-w-screen-2xl, so the cap is written in rem.
      className={cn('mx-auto flex w-full max-w-[96rem] flex-col gap-6 px-4 py-6 md:p-6', className)}
      {...props}
    />
  );
}

function PageHeader({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="page-header"
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}
      {...props}
    />
  );
}

function PageHeaderText({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="page-header-text"
      className={cn('flex min-w-0 flex-col gap-1.5', className)}
      {...props}
    />
  );
}

/**
 * Small context line above PageTitle (the menu group / area the page belongs to).
 * Sentence case — never `uppercase` or wide tracking: Thai has no case and
 * tracking makes its vowels float (DESIGN.md §2, มติ 2026-10-16 B11).
 */
function PageEyebrow({ className, ...props }: Readonly<React.ComponentProps<'span'>>) {
  return (
    <span
      data-slot="page-eyebrow"
      className={cn('text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * "‹ <parent page name>" back-link at the top of a sub-page's PageHeaderText,
 * sized like the breadcrumb (12px, muted). `href` is the FIXED parent route —
 * never history.back(): a user who landed from a link or a refresh still goes
 * to the parent (มติ 2026-10-16 A10). Children = the parent page's name
 * (not "ย้อนกลับ" / "Back"), so the link says where it goes.
 */
function PageBackLink({
  href,
  className,
  children,
}: Readonly<{ href: string; className?: string; children: React.ReactNode }>) {
  return (
    <Link
      href={href}
      data-slot="page-back-link"
      className={cn(
        'mb-1 inline-flex w-fit items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
        className
      )}
    >
      <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden="true" />
      {children}
    </Link>
  );
}

function PageTitle({ className, ...props }: Readonly<React.ComponentProps<'h1'>>) {
  return (
    <h1
      data-slot="page-title"
      className={cn('text-xl font-semibold tracking-tight sm:text-2xl', className)}
      {...props}
    />
  );
}

function PageDescription({ className, ...props }: Readonly<React.ComponentProps<'p'>>) {
  return (
    <p
      data-slot="page-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function PageActions({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="page-actions"
      className={cn('flex flex-col gap-2 max-sm:*:w-full sm:flex-row sm:items-center', className)}
      {...props}
    />
  );
}

/**
 * The action bar at the end of a form page (DESIGN.md §4 ฟอร์มแยกหน้า). Children
 * = secondary (cancel/back, `outline`) FIRST, then the primary submit — both
 * `size="cta"`. Phones: pinned to the bottom edge, full width, grid
 * `[1fr_2fr]` (secondary │ primary). ≥sm: a plain right-aligned row.
 * No summary text in this bar — it holds the buttons only. A single button
 * spans the whole row on phones.
 */
function PageFormActions({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="page-form-actions"
      className={cn(
        'sticky bottom-0 z-10 -mx-4 grid grid-cols-[1fr_2fr] gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur *:only:col-span-2 sm:static sm:mx-0 sm:flex sm:justify-end sm:bg-transparent sm:px-0 sm:backdrop-blur-none',
        className
      )}
      {...props}
    />
  );
}

export {
  PageShell,
  PageHeader,
  PageHeaderText,
  PageEyebrow,
  PageBackLink,
  PageTitle,
  PageDescription,
  PageActions,
  PageFormActions,
};
