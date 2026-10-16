// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/detail-section.tsx
// kit-hash: be5b70b883fe
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// anatomy: มติ 2026-10-16 B6 (platform docs/backlog.md §14 รุ่น 3) — hrms DESIGN §10 2026-09-30
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DetailSectionProps {
  /** Optional group label shown as the section heading. */
  label?: string;
  /** Leading heading icon (primary) — only with `label`. */
  icon?: LucideIcon;
  /** Right side of the heading — usually the group's own `StatusBadge`. */
  action?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * One group of `DetailRow`s inside a detail dialog, drawn as a soft card
 * (`rounded-lg border bg-muted/30`) so groups read apart without a hairline per
 * row. The heading (icon + 14px semibold label + optional `action`) sits on a
 * bottom hairline — never smaller than the 14px values under it.
 *
 * A section with no heading whose every row rendered `null` hides itself
 * (`empty:hidden`) — no hollow card. A section WITH a heading is never empty, so
 * guard it at the call site when all its rows may be missing.
 */
export function DetailSection({ label, icon: Icon, action, children }: Readonly<DetailSectionProps>) {
  return (
    <section data-slot="detail-section" className="rounded-lg border bg-muted/30 px-3 py-2 empty:hidden">
      {(label || action) && (
        <div className="mb-1 flex items-center gap-1.5 border-b pb-1.5">
          {Icon && <Icon className="size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />}
          {label && <p className="text-sm font-semibold text-foreground">{label}</p>}
          {action && <div className="ml-auto shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type HighlightTone = 'primary' | 'success' | 'neutral';

const HIGHLIGHT_TONE: Record<HighlightTone, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-status-emerald/10 text-status-emerald-foreground',
  neutral: 'border bg-card text-foreground',
};

export type DetailHighlightItem = Readonly<{
  label: string;
  value: React.ReactNode;
  /** Small line under the value — e.g. the previous value struck through. */
  sub?: React.ReactNode;
  tone?: HighlightTone;
}>;

/**
 * The 2–3 numbers a reader looks for first (time · duration · amount), large and
 * tinted, above the `DetailSection`s (no `opacity-*` on the small lines — faded
 * tinted text drops under AA). Items with an empty value are skipped; none
 * left ⇒ renders nothing. Values arrive formatted (`lib/format`) by the caller.
 */
export function DetailHighlights({ items }: Readonly<{ items: ReadonlyArray<DetailHighlightItem> }>) {
  const shown = items.filter((i) => i.value != null && i.value !== '');
  if (shown.length === 0) return null;
  return (
    <div data-slot="detail-highlights" className={cn('grid gap-2', shown.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
      {shown.map((i) => (
        <div key={i.label} className={cn('rounded-lg px-3 py-2', HIGHLIGHT_TONE[i.tone ?? 'neutral'])}>
          <p className="text-xs">{i.label}</p>
          <p className="text-base font-semibold tabular-nums">{i.value}</p>
          {i.sub && <p className="text-xs tabular-nums">{i.sub}</p>}
        </div>
      ))}
    </div>
  );
}
