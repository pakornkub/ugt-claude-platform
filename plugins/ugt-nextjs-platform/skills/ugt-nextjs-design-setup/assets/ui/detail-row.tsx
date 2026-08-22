// kit: ugt-nextjs-platform 4.30.0 · ugt-nextjs-design-setup/ui/detail-row.tsx
// kit-hash: a0ee111707a6
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface DetailRowProps {
  /**
   * Optional leading lucide icon. Rows that carry no meaningful icon simply
   * omit it — the label then starts at the edge.
   */
  icon?: LucideIcon;
  label: string;
  /** Row value. Falsy value ⇒ the whole row is skipped (no empty label left behind). */
  children?: React.ReactNode;
}

/**
 * Canonical read-only detail row for detail dialogs / detail views.
 *
 * Layout follows DESIGN.md §4 label–value: flex justify-between, centred,
 * gap ≥16px and a ~24px min row height so a StatusBadge value cannot collide
 * with the label. Stacks to label-on-top on mobile.
 * Labels are sentence case — no `uppercase` / `tracking-*` eyebrow, which breaks
 * Thai text (`docs/DESIGN.md` § Typography).
 *
 * Renders nothing when `children` is empty, so call sites can pass optional data
 * straight through without wrapping each row in its own guard.
 */
export function DetailRow({ icon: Icon, label, children }: Readonly<DetailRowProps>) {
  if (!children) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1 sm:min-h-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex shrink-0 items-center gap-1.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} />}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="min-w-0 text-xs sm:text-right">{children}</div>
    </div>
  );
}
