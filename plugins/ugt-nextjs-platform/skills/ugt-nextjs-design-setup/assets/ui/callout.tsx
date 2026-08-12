// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/ui/callout.tsx
// kit-hash: 8d7b0a55734d
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
import * as React from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { TONE_STYLES } from '@/components/ui/status-badge';

/**
 * Semantic tone ของ Callout — subset ของ StatusTone (ใช้ token `--status-*`
 * สูตรเดียวกับ StatusBadge). ใช้แทนกล่องแจ้งสีที่เคยเขียนเองทุกจุด และเป็น
 * banner ระดับหน้า (ใส่ `action` เป็นปุ่มขวา เช่น stale-banner รีเฟรช).
 */
export type CalloutTone = 'info' | 'warning' | 'success' | 'danger';

const DEFAULT_ICONS: Record<CalloutTone, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  success: CircleCheck,
  danger: CircleAlert,
};

interface CalloutProps {
  tone: CalloutTone;
  /** override icon default ของ tone */
  icon?: LucideIcon;
  /** บรรทัดหัวเรื่อง (optional) — ตัวหนาเหนือเนื้อหา */
  title?: string;
  /** slot ชิดขวา (optional) — เช่น ปุ่มรีเฟรชของ banner */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** กล่องแจ้งในหน้า/banner มาตรฐาน (pattern กลุ่ม 3 + 14) — enter ด้วย CSS fade+slide (motion #8). */
export function Callout({
  tone,
  icon,
  title,
  action,
  className,
  children,
}: Readonly<CalloutProps>) {
  const Icon = icon ?? DEFAULT_ICONS[tone];
  return (
    <output
      className={cn(
        'flex animate-in items-start gap-2.5 rounded-lg border px-3 py-2.5 duration-200 fade-in-0 slide-in-from-top-1',
        TONE_STYLES[tone],
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="text-sm font-medium">{title}</p>}
        <div className="text-xs/relaxed">{children}</div>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </output>
  );
}
