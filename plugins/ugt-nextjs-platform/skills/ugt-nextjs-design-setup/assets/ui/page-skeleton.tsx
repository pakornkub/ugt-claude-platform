// kit: ugt-nextjs-platform 4.88.0 · ugt-nextjs-design-setup/ui/page-skeleton.tsx
// kit-hash: 2b67d8008073
// source: ugt-hrms components/ui/page-skeleton.tsx (radix-mira era) — re-built on the kit PageShell / base-mira Card by ugt-nextjs-design-setup
// มติ ugt-hrms DESIGN §10 2026-09-30 "skeleton ตามโครงหน้า" · DESIGN.md §6
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { PageActions, PageFormActions, PageHeader, PageHeaderText, PageShell } from '@/components/ui/page-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Loading skeletons built from the REAL page parts (`PageShell` / `PageHeader` / `PageActions` /
 * `PageFormActions` / `Card`) — the box, gaps and breakpoints are the page's own, so nothing
 * jumps when the content arrives. Server-safe (no hooks, no strings) — compose them in each
 * route's `loading.tsx`; counts (stat cards, tabs, columns, form cards) = the real page's.
 *
 * ```tsx
 * // app/(app)/requests/loading.tsx
 * export default function Loading() {
 *   return <TablePageSkeleton eyebrow actions={1} stats={4} columns={6} />;
 * }
 * ```
 *
 * Skeleton = first load only — a background refetch keeps the old content on screen.
 */

/** Stable string ids for skeleton lists — no array index in JSX keys (S6479). */
function ids(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i}`);
}

const BAR_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-1/3', 'w-5/6'];

/** `PageShell` itself, marked busy. */
export function PageSkeleton({ className, children }: Readonly<{ className?: string; children?: React.ReactNode }>) {
  return (
    <PageShell aria-busy="true" className={className}>
      {children}
    </PageShell>
  );
}

/** Mirrors `PageHeader`: optional back-link / eyebrow, title, description, `actions` × `cta` buttons. */
export function SkeletonHeader({
  back = false,
  eyebrow = false,
  description = true,
  actions = 0,
}: Readonly<{ back?: boolean; eyebrow?: boolean; description?: boolean; actions?: number }>) {
  return (
    <PageHeader>
      <PageHeaderText>
        {back && <Skeleton className="mb-1 h-3 w-20" />}
        {eyebrow && <Skeleton className="my-0.5 h-3 w-24" />}
        <Skeleton className="my-0.5 h-6 w-56 sm:h-7" />
        {description && <Skeleton className="my-0.5 h-4 w-80 max-w-full" />}
      </PageHeaderText>
      {actions > 0 && (
        <PageActions>
          {ids('action', actions).map((id) => (
            // size="cta" = h-11 on phones, h-9 from sm
            <Skeleton key={id} className="h-11 sm:h-9 sm:w-32" />
          ))}
        </PageActions>
      )}
    </PageHeader>
  );
}

/** One `StatCard` (Card size sm: label + icon tile, big number). */
function SkeletonStatCard() {
  return (
    <Card size="sm" className="gap-2">
      <div className="flex items-start justify-between gap-2 px-3">
        <Skeleton className="mt-0.5 h-3 w-20" />
        <Skeleton className="size-8 shrink-0" />
      </div>
      <div className="px-3">
        <Skeleton className="my-0.5 h-6 w-16" />
      </div>
    </Card>
  );
}

/** Row of `StatCard` skeletons. `cols` = the real page's grid classes (default by count). */
export function SkeletonStatCards({
  count = 4,
  cols,
  className,
}: Readonly<{ count?: number; cols?: string; className?: string }>) {
  const columns = cols ?? (count === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4');
  return (
    <div className={cn('grid gap-3', columns, className)}>
      {ids('stat', count).map((id) => (
        <SkeletonStatCard key={id} />
      ))}
    </div>
  );
}

/**
 * Mirrors the kit `DataTable` card (same surface classes): toolbar, header row, rows,
 * pagination. Phones keep the first column only — the real table is a row list there.
 */
export function SkeletonTableCard({
  rows = 8,
  columns = 5,
  toolbar = true,
  footer = true,
  card = true,
  className,
}: Readonly<{
  rows?: number;
  columns?: number;
  toolbar?: boolean;
  footer?: boolean;
  /** false = no card surface — inside a Dialog/Sheet or an existing Card (same as DataTable `card={false}`) */
  card?: boolean;
  className?: string;
}>) {
  const cellIds = ids('col', columns);
  return (
    <div
      className={cn('flex flex-col', card && 'overflow-clip rounded-lg bg-card shadow-xs ring-1 ring-border', className)}
    >
      {toolbar && (
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Skeleton className="h-9 w-full sm:w-80" />
          <Skeleton className="h-9 w-28 max-sm:hidden" />
          <Skeleton className="h-9 w-24 sm:ml-auto" />
        </div>
      )}
      <div className="flex h-10 items-center gap-4 bg-muted px-3 max-sm:hidden">
        {cellIds.map((cellId) => (
          <Skeleton key={`head-${cellId}`} className="h-3 flex-1 bg-muted-foreground/15" />
        ))}
      </div>
      {ids('row', rows).map((rowId) => (
        <div key={rowId} className="flex h-14 items-center gap-4 border-b px-3 last:border-b-0">
          {cellIds.map((cellId, c) => (
            // the column takes the flex share; the bar inside keeps its ragged width
            <div key={`${rowId}-${cellId}`} className={c === 0 ? 'flex-[2]' : 'flex-1 max-sm:hidden'}>
              <Skeleton className={cn('h-4', BAR_WIDTHS[c % BAR_WIDTHS.length])} />
            </div>
          ))}
        </div>
      ))}
      {footer && (
        <div className="flex items-center justify-between border-t p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
      )}
    </div>
  );
}

/** A month grid card: toolbar, 7 weekday heads, 5 rows of `min-h-20` day cells. */
export function SkeletonCalendarCard({ toolbar = true, className }: Readonly<{ toolbar?: boolean; className?: string }>) {
  return (
    <div className={cn('overflow-clip rounded-lg bg-card shadow-xs ring-1 ring-border', className)}>
      {toolbar && (
        <div className="flex flex-col gap-2 border-b p-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-28 sm:ml-auto" />
        </div>
      )}
      <div className="grid grid-cols-7 border-b bg-muted/50 py-2">
        {ids('wd', 7).map((id) => (
          <Skeleton key={id} className="mx-auto h-3 w-8" />
        ))}
      </div>
      <div className="grid grid-cols-7">
        {ids('day', 35).map((id) => (
          <div key={id} className="min-h-20 border-r border-b p-1.5 nth-[7n]:border-r-0">
            <Skeleton className="h-4 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Line-variant tabs strip (`count` = the real page's tabs). */
export function SkeletonTabs({ count = 2 }: Readonly<{ count?: number }>) {
  return (
    <div className="flex h-9 items-center gap-6 overflow-hidden border-b">
      {ids('tab', count).map((id) => (
        <Skeleton key={id} className="h-4 w-20 shrink-0" />
      ))}
    </div>
  );
}

/**
 * Titled card: a `CardHeading`-shaped bar (`data-slot="card-heading"` so the sanctioned
 * `card.tsx` edit drops the card's top padding, as for the real heading) + body.
 * `heading={false}` = bare card body.
 */
export function SkeletonCard({
  heading = true,
  className,
  children,
}: Readonly<{ heading?: boolean; className?: string; children?: React.ReactNode }>) {
  return (
    <Card className={className}>
      {heading && (
        <div data-slot="card-heading" className="flex h-11 shrink-0 items-center gap-2 border-b px-(--card-spacing)">
          <Skeleton className="size-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="px-(--card-spacing)">{children}</div>
    </Card>
  );
}

/** Label + input pairs. `cols` = extra grid classes (e.g. `sm:grid-cols-2`). */
export function SkeletonFields({ count = 3, cols }: Readonly<{ count?: number; cols?: string }>) {
  return (
    <div className={cn('grid gap-4', cols)}>
      {ids('field', count).map((id) => (
        <div key={id} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

/*
 * Presets for the three page patterns (DESIGN.md §3) — a `loading.tsx` stays one line.
 * `children` = a page-specific block (a period navigator, a banner), placed where noted.
 */

/** Data page: header → tabs → (children) → stat cards → DataTable card. */
export function TablePageSkeleton({
  back = false,
  eyebrow = false,
  actions = 0,
  tabs = 0,
  stats = 0,
  statsCols,
  rows,
  columns,
  children,
}: Readonly<{
  back?: boolean;
  eyebrow?: boolean;
  actions?: number;
  tabs?: number;
  stats?: number;
  statsCols?: string;
  rows?: number;
  columns?: number;
  children?: React.ReactNode;
}>) {
  return (
    <PageSkeleton>
      <SkeletonHeader back={back} eyebrow={eyebrow} actions={actions} />
      {tabs > 0 && <SkeletonTabs count={tabs} />}
      {children}
      {stats > 0 && <SkeletonStatCards count={stats} cols={statsCols} />}
      <SkeletonTableCard rows={rows} columns={columns} />
    </PageSkeleton>
  );
}

/** Calendar page: header → stat cards → (children) → month grid card. */
export function CalendarPageSkeleton({
  eyebrow = false,
  actions = 0,
  stats = 0,
  statsCols,
  children,
}: Readonly<{ eyebrow?: boolean; actions?: number; stats?: number; statsCols?: string; children?: React.ReactNode }>) {
  return (
    <PageSkeleton>
      <SkeletonHeader eyebrow={eyebrow} actions={actions} />
      {stats > 0 && <SkeletonStatCards count={stats} cols={statsCols} />}
      {children}
      <SkeletonCalendarCard />
    </PageSkeleton>
  );
}

/** Form page: back header → (children) → one card per section → `PageFormActions` bar. */
export function FormPageSkeleton({
  cards = 3,
  fieldsPerCard = 3,
  footer = true,
  children,
}: Readonly<{ cards?: number; fieldsPerCard?: number; footer?: boolean; children?: React.ReactNode }>) {
  return (
    <PageSkeleton>
      <SkeletonHeader back />
      {children}
      {ids('card', cards).map((id) => (
        <SkeletonCard key={id}>
          <SkeletonFields count={fieldsPerCard} cols="sm:grid-cols-3" />
        </SkeletonCard>
      ))}
      {footer && (
        <PageFormActions>
          <Skeleton className="h-11 sm:h-9 sm:w-24" />
          <Skeleton className="h-11 sm:h-9 sm:w-32" />
        </PageFormActions>
      )}
    </PageSkeleton>
  );
}
