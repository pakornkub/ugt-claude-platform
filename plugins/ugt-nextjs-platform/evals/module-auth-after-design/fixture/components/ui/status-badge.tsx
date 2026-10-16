// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/ui/status-badge.tsx
// kit-hash: 7a340b661de7
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

/**
 * Semantic tone for a status badge — maps 1:1 to the org `--status-*` set of
 * seven (see `docs/DESIGN.md` §1 สีสถานะ 7 ตัว). Every tone renders on the
 * `outline` Badge variant; there is no secondary-variant fallback —
 * `neutral` uses `status-gray` for real color, not a gray no-op.
 *
 * | tone      | token           | meaning                        |
 * | --------- | --------------- | ------------------------------- |
 * | `success` | `status-emerald`| สำเร็จ / อนุมัติ / สุขภาพดี      |
 * | `warning` | `status-amber`  | รอดำเนินการ / เตือน / น่าสังเกต  |
 * | `danger`  | `status-red`    | ปฏิเสธ / ผิดพลาด / destructive   |
 * | `cancel`  | `status-coral`  | ขอยกเลิก                        |
 * | `info`    | `status-sky`    | ระบบ / ข้อมูล / สลับกะ           |
 * | `neutral` | `status-gray`   | ยกเลิก / ร่าง / ปิดใช้งาน        |
 * | `violet`  | `status-violet` | กลุ่มที่โปรเจคตั้งชื่อเอง — ใช้ได้เมื่อ DESIGN.md §10 มีมติบอกว่ากลุ่มไหน (มติ 2026-10-16 TK-VIO) |
 *
 * Convention: **status / state / severity** badges always pair a tone with a
 * leading icon (color + icon = dual cue, accessible for color-blind users).
 * Plain labels, categories, counts and identifiers stay text-only `<Badge>`.
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'cancel' | 'info' | 'neutral' | 'violet';

/**
 * Single source of truth for status colors — each tone maps to its
 * `--status-*` semantic token (light + dark values resolved via CSS
 * variables in `app/globals.css`). Exported so colored non-status labels
 * that must stay icon-free (e.g. raw-log IN/OUT) can reuse the exact same
 * tokens instead of re-declaring them inline.
 *
 * Formula (DESIGN.md §1): `border-status-x/40 bg-status-x/10 text-status-x-foreground`.
 */
export const TONE_STYLES: Record<StatusTone, string> = {
  success: 'border-status-emerald/40 bg-status-emerald/10 text-status-emerald-foreground',
  warning: 'border-status-amber/40 bg-status-amber/10 text-status-amber-foreground',
  danger: 'border-status-red/40 bg-status-red/10 text-status-red-foreground',
  cancel: 'border-status-coral/40 bg-status-coral/10 text-status-coral-foreground',
  info: 'border-status-sky/40 bg-status-sky/10 text-status-sky-foreground',
  neutral: 'border-status-gray/40 bg-status-gray/10 text-status-gray-foreground',
  violet: 'border-status-violet/40 bg-status-violet/10 text-status-violet-foreground',
};

interface StatusBadgeProps {
  /** Semantic tone — maps to a `--status-*` token. See the table above. */
  tone: StatusTone;
  /** Leading lucide icon — rendered bare (the Badge primitive sizes/spaces it). */
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
}

/**
 * Canonical status badge: a tone + a leading icon + a label. Use for any
 * single-dimension state (active/inactive, pending/approved/rejected, lock,
 * risk, error, …). Do NOT use for plain labels/counts — use `<Badge>` directly.
 */
export function StatusBadge({ tone, icon: Icon, className, children }: Readonly<StatusBadgeProps>) {
  return (
    <Badge variant="outline" className={cn(TONE_STYLES[tone], className)}>
      <Icon strokeWidth={2} />
      {children}
    </Badge>
  );
}
