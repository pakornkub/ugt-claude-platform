// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/ui/detail-dialog-shell.tsx
// kit-hash: 50a0c216bb92
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
// anatomy: มติ 2026-10-16 B6 (platform docs/backlog.md §14 รุ่น 3) — hrms DESIGN §10 2026-09-30
'use client';

import type { LucideIcon } from 'lucide-react';
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  FormDialogBody,
  FormDialogContent,
  FormDialogFooter,
  FormDialogHeader,
} from '@/components/ui/form-dialog';

interface DetailDialogShellProps {
  open: boolean;
  onClose: () => void;
  /** ชนิดของรายการ — วาดเป็นกล่องไอคอน primary หน้าชื่อ */
  titleIcon?: LucideIcon;
  /** รายการนี้คืออะไร (ไม่ใช่ "รายละเอียด") */
  title: React.ReactNode;
  /** บรรทัด muted ใต้ชื่อ — ข้อมูลสำคัญที่ไม่ซ้ำกับเนื้อหา (ช่วงวันที่ · ประเภท) */
  description?: React.ReactNode;
  /** สถานะของรายการ (`StatusBadge`) — อยู่มุมขวาของหัว อ่านเป็นอย่างแรก ไม่ใช่แถวในเนื้อ */
  status?: React.ReactNode;
  /** ปุ่ม action (อนุมัติ/ปฏิเสธ) — ไม่ส่ง = ไม่มีโซนท้าย ปิดด้วย ✕ */
  footer?: React.ReactNode;
  /** `DetailHighlights` (ถ้ามี) แล้วตามด้วย `DetailSection` ทีละกลุ่ม */
  children: React.ReactNode;
}

/**
 * เปลือก dialog ดูรายละเอียด read-only — 3 โซนของ FormDialog:
 *
 * - **หัว** (เส้นล่าง): กล่องไอคอน + ชื่อ 16px หนา + คำอธิบายบรรทัดเดียว + สถานะชิดขวา
 *   (`pr-12` เว้นที่ให้ปุ่ม ✕ ของ DialogContent)
 * - **เนื้อ** (เลื่อนได้): `DetailHighlights` ตัวเลขเด่น 2–3 ช่อง → `DetailSection` การ์ดอ่อนต่อกลุ่ม
 *   ห่างกัน 12px — ไม่มีเส้นคั่นรายแถว
 * - **ท้าย** (เส้นบน + `bg-muted/40`): เฉพาะเมื่อมี action — dialog ดูอย่างเดียวไม่มีโซนท้าย ปิดด้วย ✕
 *   ห้ามใส่ footer ที่มีแต่ปุ่ม "ปิด" (มติ 2026-10-16 A8)
 *
 * ตัวอักษร: ชื่อ 16px · หัวการ์ด 14px · ค่า 14px · ป้าย/บรรทัดรอง 12px
 */
export function DetailDialogShell({
  open,
  onClose,
  titleIcon: TitleIcon,
  title,
  description,
  status,
  footer,
  children,
}: Readonly<DetailDialogShellProps>) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <FormDialogContent className="sm:max-w-md">
        <FormDialogHeader className="flex-row items-start gap-3 pr-12">
          {TitleIcon && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TitleIcon className="size-4" strokeWidth={2} aria-hidden="true" />
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
          {status && <div className="shrink-0 pt-0.5">{status}</div>}
        </FormDialogHeader>
        <FormDialogBody className="flex flex-col gap-3 py-4">{children}</FormDialogBody>
        {footer && <FormDialogFooter>{footer}</FormDialogFooter>}
      </FormDialogContent>
    </Dialog>
  );
}
