// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/ui/detail-section.tsx
// kit-hash: 92244af0c23f
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
import * as React from 'react';

interface DetailSectionProps {
  /** Optional group label shown above the rows. */
  label?: string;
  children: React.ReactNode;
}

/**
 * Groups DetailRows into a titled section inside a detail dialog. Sections are
 * separated by a single hairline (the shell body wraps them in `divide-y`); rows
 * inside carry no divider. This replaces the old "one line per row" look —
 * fewer lines, clearer grouping.
 */
export function DetailSection({ label, children }: Readonly<DetailSectionProps>) {
  return (
    <section className="py-2.5">
      {label && <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>}
      {children}
    </section>
  );
}
