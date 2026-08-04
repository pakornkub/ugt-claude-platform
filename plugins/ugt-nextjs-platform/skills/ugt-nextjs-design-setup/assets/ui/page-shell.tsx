// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Page scaffolding per design pattern ส่วน 1 (docs/DESIGN.md):
 * container + single header row (title/desc left, actions right) that stacks
 * on mobile with full-width action buttons. Layout-only — no state.
 */
function PageShell({ className, ...props }: Readonly<React.ComponentProps<'div'>>) {
  return (
    <div
      data-slot="page-shell"
      className={cn('flex flex-col gap-6 px-4 py-6 md:p-6', className)}
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

export { PageShell, PageHeader, PageHeaderText, PageTitle, PageDescription, PageActions };
