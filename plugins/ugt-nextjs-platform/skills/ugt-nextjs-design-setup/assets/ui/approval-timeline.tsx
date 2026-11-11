// kit: ugt-nextjs-platform unreleased · ugt-nextjs-design-setup/ui/approval-timeline.tsx
// kit-hash: 1cb8f750a95c
// source: ugt-hrms components/ui/approval-timeline.tsx — re-built as a data-in component on the kit DetailSection by ugt-nextjs-design-setup
// มติ ugt-hrms DESIGN §10 2026-10-28 "การ์ดสถานะการอนุมัติเป็นเส้นเวลาเดียวกันทุก dialog" (แบบ A)
import * as React from 'react';
import { Ban, Check, CheckCircle2, Clock, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { DetailSection } from '@/components/ui/detail-section';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, type AppLocale } from '@/lib/format';
import { cn } from '@/lib/utils';

export type ApprovalStepState = 'done' | 'waiting' | 'rejected' | 'cancelled';

/**
 * One dot on the timeline — DATA only; the words are built here from `kit.approvalTimeline`,
 * so every workflow in the app reads the same ("รอ {ชื่อ}" · "อนุมัติโดย {ชื่อ}").
 */
export type ApprovalStep = Readonly<{
  /** `submitted` = filed · `decision` = one approval stage · `cancelled` = withdrawn */
  event: 'submitted' | 'decision' | 'cancelled';
  state: ApprovalStepState;
  /** `cancel` = a step of a cancellation request on an approved item (default `request`) */
  stage?: 'request' | 'cancel';
  /** multi-level workflow → "ขั้น N · …" prefix + the number in the dot */
  level?: number;
  /**
   * `decision`: who decided — or, while `waiting`, everyone who may decide (several = any one
   * of them) · `submitted`: who filed on the owner's behalf (empty = the owner did) ·
   * `cancelled`: who withdrew it. Display names, already in the reader's language.
   */
  names?: readonly string[];
  /** when it happened (ISO / Date) — none for a step still waiting */
  at?: string | Date | null;
  /** the decider's comment — a rejection reason shows in a red box */
  note?: string | null;
  /** a later stage not reached yet → dashed dot, muted title */
  upcoming?: boolean;
  /** project-specific line under the step (an amount the approver changed, a past-deadline tag) */
  extra?: React.ReactNode;
}>;

// tones = the StatusBadge set: done emerald · waiting amber · rejected red · cancelled gray
const DOT: Record<ApprovalStepState, string> = {
  done: 'bg-status-emerald/15 text-status-emerald-foreground',
  waiting: 'bg-status-amber/15 text-status-amber-foreground',
  rejected: 'bg-status-red/15 text-status-red-foreground',
  cancelled: 'bg-muted text-muted-foreground',
};

const STATE_ICON = { done: Check, waiting: Clock, rejected: X, cancelled: Ban } as const;

/** `kit.approvalTimeline` key of a decision step: [no name, with {name}] per state × stage */
const DECISION_KEYS = {
  request: {
    waiting: ['waitingAnyone', 'waiting'],
    rejected: ['rejected', 'rejectedBy'],
    done: ['approved', 'approvedBy'],
  },
  cancel: {
    waiting: ['cancelWaitingAnyone', 'cancelWaiting'],
    rejected: ['cancelRejected', 'cancelRejectedBy'],
    done: ['cancelApproved', 'cancelApprovedBy'],
  },
} as const;

/** The step's title as [message key, name] — e.g. "รอ {name}" / "อนุมัติโดย {name}". */
function stepTitleKey(step: ApprovalStep, name: string) {
  if (step.event === 'submitted') return step.stage === 'cancel' ? 'cancelRequested' : 'submitted';
  if (step.event === 'cancelled') return name ? 'cancelledBy' : 'cancelled';
  // a decision marked `cancelled` (the item was withdrawn mid-stage) reads as withdrawn
  if (step.state === 'cancelled') return 'cancelled';
  return DECISION_KEYS[step.stage ?? 'request'][step.state][name ? 1 : 0];
}

/**
 * "สถานะการอนุมัติ" as one timeline — filed → each approval stage → a cancellation request —
 * saying who it waits on and who decided, as a `DetailSection` card in every detail dialog
 * of every workflow (the same card everywhere, never a per-page list of approvers).
 *
 * The caller loads the steps (an action / query keyed by the item) and passes them in:
 * `undefined` = still loading (skeleton lines) · `[]` / `null` = nothing to show (renders nothing).
 *
 * ```tsx
 * const { data } = useQuery({ queryKey: ['approval-steps', id], queryFn: () => getApprovalSteps(id) });
 * <ApprovalTimeline steps={data} />
 * ```
 */
export function ApprovalTimeline({
  steps,
  label,
}: Readonly<{
  steps: readonly ApprovalStep[] | null | undefined;
  /** section heading — default `kit.approvalTimeline.title` ("สถานะการอนุมัติ") */
  label?: string;
}>) {
  const t = useTranslations('kit.approvalTimeline');
  const locale = useLocale() as AppLocale;
  if (steps !== undefined && !steps?.length) return null;

  return (
    <DetailSection label={label ?? t('title')} icon={CheckCircle2}>
      {steps ? (
        <ol className="py-1">
          {steps.map((step, i) => {
            const Icon = STATE_ICON[step.state];
            const name = (step.names ?? []).join(', ');
            const level =
              step.event === 'decision' && step.level ? `${t('level', { level: step.level })} · ` : '';
            const title = level + t(stepTitleKey(step, name), { name });
            const filedBy = step.event === 'submitted' && name ? t('filedBy', { name }) : null;
            const meta = [step.at ? formatDateTime(step.at, locale) : null, filedBy, step.upcoming ? t('upcoming') : null]
              .filter(Boolean)
              .join(' · ');
            const key = `${step.stage ?? 'request'}-${step.event}-${step.level ?? 0}-${i}`; // NOSONAR typescript:S6479 — steps มี id ไม่ได้และไม่สลับลำดับ
            return (
              <li key={key} className="relative flex gap-2.5 pb-3 last:pb-0">
                {i < steps.length - 1 && (
                  <span className="absolute top-5 bottom-0 left-2.5 w-px bg-border" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'relative flex size-5 shrink-0 items-center justify-center rounded-full',
                    DOT[step.state],
                    step.upcoming && 'border border-dashed bg-transparent text-muted-foreground'
                  )}
                >
                  {step.event === 'decision' && step.level ? (
                    <span className="text-[11px] font-semibold tabular-nums">{step.level}</span>
                  ) : (
                    <Icon className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className={cn('font-medium', step.upcoming && 'text-muted-foreground')}>{title}</p>
                  {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
                  {step.extra}
                  {step.note && (
                    <p
                      className={cn(
                        'mt-1 text-xs',
                        step.state === 'rejected'
                          ? 'rounded-md bg-status-red/10 px-2 py-1 text-status-red-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {step.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="space-y-2 py-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      )}
    </DetailSection>
  );
}
