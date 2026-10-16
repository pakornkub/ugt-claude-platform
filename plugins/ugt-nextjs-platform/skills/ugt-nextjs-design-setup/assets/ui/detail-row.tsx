// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/detail-row.tsx
// kit-hash: 2ef92a0dc727
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// layout: มติ 2026-10-16 B6 (platform docs/backlog.md §14 รุ่น 3) — hrms DESIGN §10 2026-09-30
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

interface DetailRowProps {
  /**
   * Optional leading lucide icon. Rows that carry no meaningful icon simply
   * omit it — the label then starts at the edge.
   */
  icon?: LucideIcon;
  label: string;
  /**
   * Row value. Empty (`null` / `undefined` / `false` / `''`) ⇒ the whole row is
   * skipped (no empty label left behind). `0` is a value and renders.
   */
  children?: React.ReactNode;
}

/**
 * Canonical read-only detail row for detail dialogs / detail views.
 *
 * Layout: **label column fixed on the left (8rem) · value on the right, left-aligned**,
 * top-aligned so a multi-line value (list, long note) reads down from the label;
 * stacks label-on-top on mobile. Label 12px muted · value 14px foreground — the
 * value is what the reader came for, so it is the larger of the two.
 * Labels are sentence case — no `uppercase` / `tracking-*` eyebrow, which breaks
 * Thai text (`docs/DESIGN.md` § Typography).
 *
 * Renders nothing when `children` is empty, so call sites can pass optional data
 * straight through without wrapping each row in its own guard.
 */
export function DetailRow({ icon: Icon, label, children }: Readonly<DetailRowProps>) {
  if (children == null || children === false || children === '') return null;
  return (
    <div data-slot="detail-row" className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-start sm:gap-3">
      <div className="flex shrink-0 items-center gap-1.5 sm:w-32 sm:pt-0.5">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden="true" />}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}
