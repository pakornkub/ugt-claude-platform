// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/stat-card.tsx
// kit-hash: 9baa8cda5731
// source: ugt-hrms components/ui/stat-card.tsx (radix-mira era) — re-built on the base-mira Card by ugt-nextjs-design-setup
// มติ 2026-10-16 B1 (platform docs/backlog.md §14) · DESIGN.md §3 dashboard · §4

import * as React from 'react';
import Link from 'next/link';
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import type { StatusTone } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

/**
 * สีของกล่องไอคอน — คำศัพท์เดียวกับ `StatusBadge` (สถานะ 7 ตัว) + `primary` (การ์ดเด่นใบเดียวของแถว)
 * + `cat-1..8` (การ์ดที่นับ "หมวด" ซึ่งมีสีประจำตัวอยู่แล้วที่อื่น เช่น จุดสีกลุ่ม/series กราฟ — ไม่ใช่สถานะ)
 */
export type StatCardTone = StatusTone | 'primary' | `cat-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

// literal classes เท่านั้น (Tailwind ต้องเห็นชื่อเต็ม) · สถานะ = พื้นจาง /15 + ตัวอักษร foreground
// ของ token เดียวกับ StatusBadge · cat = พื้นทึบ + ไอคอนขาว (สัญญา --cat-*: ขาวบนสีผ่าน 4.5:1)
const TILE_STYLES: Record<StatCardTone, string> = {
  success: 'bg-status-emerald/15 text-status-emerald-foreground',
  warning: 'bg-status-amber/15 text-status-amber-foreground',
  danger: 'bg-status-red/15 text-status-red-foreground',
  cancel: 'bg-status-coral/15 text-status-coral-foreground',
  info: 'bg-status-sky/15 text-status-sky-foreground',
  neutral: 'bg-status-gray/15 text-status-gray-foreground',
  violet: 'bg-status-violet/15 text-status-violet-foreground',
  primary: 'bg-primary/10 text-primary',
  'cat-1': 'bg-cat-1 text-white',
  'cat-2': 'bg-cat-2 text-white',
  'cat-3': 'bg-cat-3 text-white',
  'cat-4': 'bg-cat-4 text-white',
  'cat-5': 'bg-cat-5 text-white',
  'cat-6': 'bg-cat-6 text-white',
  'cat-7': 'bg-cat-7 text-white',
  'cat-8': 'bg-cat-8 text-white',
};

type DeltaDirection = 'up' | 'down' | 'flat';
type DeltaTone = 'positive' | 'negative' | 'neutral';

const DELTA_ICONS: Record<DeltaDirection, LucideIcon> = { up: TrendingUp, down: TrendingDown, flat: Minus };
// ทิศ ≠ ดี/ร้ายเสมอ (ยอดสายเพิ่ม = แย่) — ค่าเริ่มต้น up=ดี down=แย่ ส่ง `tone` เมื่อกลับกัน
const DEFAULT_DELTA_TONE: Record<DeltaDirection, DeltaTone> = { up: 'positive', down: 'negative', flat: 'neutral' };
const DELTA_STYLES: Record<DeltaTone, string> = {
  positive: 'text-status-emerald-foreground',
  negative: 'text-status-red-foreground',
  neutral: 'text-muted-foreground',
};

export type StatCardDelta = Readonly<{
  /** ผลต่างที่ format แล้ว เช่น `+3` · `-12%` — ผู้เรียก format ผ่าน `lib/format` เอง */
  text: string;
  /** บรรทัดกำกับ muted ต่อท้าย เช่น "เทียบเดือนก่อน" */
  note?: string;
  /** กำหนดไอคอน (ลูกศรขึ้น/ลง/ขีด) — สีเลือกจากนี้ถ้าไม่ส่ง `tone` · default `flat` */
  direction?: DeltaDirection;
  /** ทับสีเมื่อทิศขึ้น "แย่" — เช่น จำนวนครั้งที่สาย */
  tone?: DeltaTone;
}>;

type StatCardBaseProps = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: StatCardTone;
  delta?: StatCardDelta;
  /** ข้อความรองใต้ตัวเลข (เกณฑ์ · คำอธิบาย · ยอดย่อย) — muted 12px */
  hint?: React.ReactNode;
  className?: string;
};

/** การ์ดเฉย ๆ · การ์ดลิงก์ (`href` — dashboard: กดแล้วไปหน้าที่เกี่ยว) · การ์ดกรอง (`onClick` + `active`) */
type StatCardInteraction =
  | { href?: undefined; onClick?: undefined; active?: undefined }
  | { href: string; onClick?: undefined; active?: undefined }
  | { href?: undefined; onClick: () => void; active?: boolean };

export type StatCardProps = Readonly<StatCardBaseProps & StatCardInteraction>;

// ปุ่ม/ลิงก์จริงคือ "ป้าย" ที่ยืด ::after คลุมทั้งการ์ด (stretched target) — การ์ดยังเป็น <div>
// (button ห่อ div ไม่ได้ตาม HTML) และไม่ต้องใช้ role="button" บน div (Sonar S6819)
const TARGET_CLASS =
  'text-left text-xs text-muted-foreground outline-none after:absolute after:inset-0 after:rounded-lg';

/**
 * การ์ดตัวเลขสรุป (KPI) — ป้าย + กล่องไอคอนสีตาม tone + ตัวเลขใหญ่ + delta/hint · ใช้แทนการ์ดตัวเลข
 * ที่ประกอบเองทุกที่ (มติ 2026-10-16 B1)
 *
 * - เงา/ขอบมาจาก `Card` (shadow-xs ring-1) — **ห้ามห่อ StatCard ด้วย `Card` อีกชั้น** (เงาซ้อน) · แถว
 *   StatCard วางบน grid เปล่า: `grid grid-cols-2 gap-3 lg:grid-cols-4` (`references/dashboard.md`)
 * - การ์ดกรอง: `onClick` + `active` → ปุ่ม toggle จริง (`aria-pressed`) · กดซ้ำ = ล้างตัวกรอง (ผู้เรียกทำ)
 *   · ตัวที่เลือก = ring primary
 * - การ์ดลิงก์: `href` → `next/link` · ใน dashboard ทุกใบควรพาไปหน้าที่เกี่ยว
 * - ไม่มี state → server component ได้ (การ์ดกรองต้องอยู่ใน client component อยู่แล้วเพราะมี handler)
 *
 * ```tsx
 * <StatCard label={t('pending')} value={formatNumber(summary.pending)} icon={Hourglass} tone="warning"
 *   active={filter === 'PENDING'} onClick={() => setFilter(filter === 'PENDING' ? 'ALL' : 'PENDING')} />
 * ```
 */
export function StatCard(props: StatCardProps) {
  const { label, value, icon: Icon, tone = 'info', delta, hint, className } = props;
  const valueId = React.useId();
  const direction = delta?.direction ?? 'flat';
  const DeltaIcon = DELTA_ICONS[direction];
  const interactive = props.href !== undefined || props.onClick !== undefined;
  const active = props.onClick !== undefined && props.active === true;

  let labelEl: React.ReactNode;
  if (props.href !== undefined) {
    labelEl = (
      <Link href={props.href} data-slot="stat-card-target" aria-describedby={valueId} className={TARGET_CLASS}>
        {label}
      </Link>
    );
  } else if (props.onClick === undefined) {
    labelEl = <span className="text-xs text-muted-foreground">{label}</span>;
  } else {
    labelEl = (
      <button
        type="button"
        data-slot="stat-card-target"
        aria-pressed={active}
        aria-describedby={valueId}
        onClick={props.onClick}
        className={TARGET_CLASS}
      >
        {label}
      </button>
    );
  }

  return (
    <Card
      size="sm"
      data-slot="stat-card"
      data-active={active || undefined}
      className={cn(
        'relative gap-2',
        interactive &&
          'cursor-pointer transition-colors hover:ring-primary/40 has-[[data-slot=stat-card-target]:focus-visible]:ring-2 has-[[data-slot=stat-card-target]:focus-visible]:ring-ring/50',
        active && 'ring-2 ring-primary hover:ring-primary',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 px-3">
        {labelEl}
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', TILE_STYLES[tone])}>
          <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
        </span>
      </div>
      <div className="px-3">
        <div id={valueId} className="text-2xl leading-tight font-semibold tabular-nums">
          {value}
        </div>
        {delta && (
          <div className={cn('mt-1 flex items-center gap-1 text-xs', DELTA_STYLES[delta.tone ?? DEFAULT_DELTA_TONE[direction]])}>
            <DeltaIcon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span className="tabular-nums">{delta.text}</span>
            {delta.note && <span className="text-muted-foreground">{delta.note}</span>}
          </div>
        )}
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </div>
    </Card>
  );
}
