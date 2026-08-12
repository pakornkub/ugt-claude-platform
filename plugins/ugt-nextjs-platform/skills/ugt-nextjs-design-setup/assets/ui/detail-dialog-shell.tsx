// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/ui/detail-dialog-shell.tsx
// kit-hash: 55720c5c3888
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogTitle } from '@/components/ui/dialog';
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from '@/components/ui/form-dialog';

interface DetailDialogShellProps {
  open: boolean;
  onClose: () => void;
  titleIcon?: LucideIcon;
  title: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Shared shell for read-only detail modals (e.g. approval/record detail views).
 * Built on FormDialog so header (border-b), scrollable body, and footer action zone
 * (border-t) match the project's canonical dialog pattern.
 * Content is grouped into <DetailSection> blocks — no per-row dividers.
 */
export function DetailDialogShell({
  open,
  onClose,
  titleIcon: TitleIcon,
  title,
  footer,
  children,
}: Readonly<DetailDialogShellProps>) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <FormDialogContent className="sm:max-w-md">
        <FormDialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            {TitleIcon && <TitleIcon className="size-4 text-muted-foreground" />}
            {title}
          </DialogTitle>
        </FormDialogHeader>
        <FormDialogBody className="py-2">
          <div className="divide-y">{children}</div>
        </FormDialogBody>
        {footer && <FormDialogFooter>{footer}</FormDialogFooter>}
      </FormDialogContent>
    </Dialog>
  );
}
