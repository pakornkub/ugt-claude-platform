// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';

/**
 * Height variants for FormDialogContent:
 * - 'auto'  — content drives height; no min/max (small dialogs: md, no scroll needed)
 * - 'fluid' — max-h-[85vh]; scrollable body grows up to 85vh (medium/large CRUD dialogs)
 * - 'fill'  — h-[90vh]; always full height (XL dialogs, e.g. calendar/schedule editors)
 */
const heightVariants = {
  auto: '',
  fluid: 'max-h-[85vh]',
  fill: 'h-[90vh]',
} as const;

type HeightVariant = keyof typeof heightVariants;

/**
 * Wrapper for DialogContent that enforces the flex-column + p-0 layout required
 * for border-separated header/footer with a scrollable body.
 *
 * Pass `height` to control the dialog's vertical sizing:
 * - 'auto'  (default): small dialogs where content determines height
 * - 'fluid': medium/large dialogs that need scroll (max-h-[85vh])
 * - 'fill':  XL full-height dialogs (h-[90vh])
 */
function FormDialogContent({
  className,
  height = 'fluid',
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  height?: HeightVariant;
}) {
  return (
    <DialogContent
      className={cn('flex flex-col gap-0 p-0', heightVariants[height], className)}
      {...props}
    />
  );
}

/**
 * Header section with a bottom border.
 * The built-in close button from DialogContent is absolute-positioned and will
 * appear over the top-right corner of this header automatically.
 */
function FormDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <DialogHeader className={cn('mx-0 shrink-0 border-b px-6 py-4', className)} {...props} />;
}

/**
 * Scrollable body area that fills remaining space between header and footer.
 * Override padding or max-height via className when needed.
 */
function FormDialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)} {...props} />;
}

/**
 * Footer section with a top border.
 * Inherits DialogFooter's sm:flex-row sm:justify-end layout.
 */
function FormDialogFooter({ className, ...props }: React.ComponentProps<typeof DialogFooter>) {
  return <DialogFooter className={cn('shrink-0 border-t px-6 py-4', className)} {...props} />;
}

export { FormDialogContent, FormDialogHeader, FormDialogBody, FormDialogFooter };
