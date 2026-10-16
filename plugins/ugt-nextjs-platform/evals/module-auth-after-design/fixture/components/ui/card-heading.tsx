// kit: ugt-nextjs-platform 4.81.0 · ugt-nextjs-design-setup/ui/card-heading.tsx
// kit-hash: f228afd341e6
// source: ugt-hrms components/ui/card.tsx (CardHeading, radix-mira era) — split into its own kit file by ugt-nextjs-design-setup
// มติ 2026-10-16 B2 (platform docs/backlog.md §14) · DESIGN.md §3 page patterns / §4 ฟอร์มแยกหน้า
import * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface CardHeadingProps {
  /** ไอคอน lucide แบบ outline หน้าชื่อ — สี primary เสมอ */
  icon: LucideIcon;
  /** ชื่อการ์ด/section — ผู้เรียกแปลเอง (kit ไม่ถือข้อความ) */
  title: React.ReactNode;
  /** ต่อท้ายชื่อ นอก truncate — จำนวนนับ/`Badge` จึงไม่ถูกตัด */
  badge?: React.ReactNode;
  /** ช่องขวา: ลิงก์ "ดูทั้งหมด", `ViewToggle`, หมายเหตุสั้น — สูงไม่เกิน 28px แถบจึงสูงเท่าเดิม */
  action?: React.ReactNode;
  /** ระดับหัวข้อ ให้ outline ของหน้าไม่ข้ามขั้น: h2 ใต้ PageTitle (h1) · h3 เมื่อซ้อนใต้ h2 อีกชั้น */
  as?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/**
 * หัวการ์ดมาตรฐานตัวเดียวทั้งแอป — แถบสูงตายตัว `h-11` + เส้นล่าง · ไอคอน primary +
 * ชื่อตัวหนา · ช่อง `badge` / `action` · วางเป็น**ลูกตรงตัวแรก**ของ `Card`:
 * `card.tsx` ที่ผ่าน sanctioned edit ตัด `pt` ของการ์ดให้เอง (`primitive-edits.md`)
 * จึงไม่ต้องใส่ `py-0`/`pt-0` เอง · padding ซ้ายขวาตาม `--card-spacing` ของการ์ด
 * (`size="sm"` ก็แคบตาม)
 *
 * ```tsx
 * <Card>
 *   <CardHeading icon={CalendarDays} title={t('periodTitle')} action={<ViewToggle … />} />
 *   <CardContent>…</CardContent>
 * </Card>
 * ```
 *
 * ห้ามห่อ `DataTable` ด้วย `Card` + `CardHeading` — DataTable เป็นการ์ดในตัวอยู่แล้ว
 * (ขอบสองชั้น) · การ์ดที่มีชื่อทุกใบใช้ตัวนี้ ไม่ hand-roll แถวหัวการ์ดเอง
 */
export function CardHeading({
  icon: Icon,
  title,
  badge,
  action,
  as: Heading = 'h2',
  className,
}: Readonly<CardHeadingProps>) {
  return (
    <div
      data-slot="card-heading"
      className={cn('flex h-11 shrink-0 items-center justify-between gap-2 border-b px-(--card-spacing)', className)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="size-4 shrink-0 text-primary" strokeWidth={2} aria-hidden="true" />
        <Heading className="min-w-0 truncate text-sm font-semibold">{title}</Heading>
        {badge && <span className="flex shrink-0 items-center">{badge}</span>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}
