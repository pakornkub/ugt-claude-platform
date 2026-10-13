// สถานะคำขอลา — ประกาศที่เดียวของทั้งโดเมน (DESIGN.md §4 บังคับ: mapping
// สถานะ→tone อยู่ไฟล์เดียวต่อ domain). ไฟล์นี้ไม่ใช่ server-only โดยตั้งใจ —
// ทั้งตาราง (client) และ data access (server) อ่านชุดเดียวกัน
import { CircleCheck, CircleX, Clock, type LucideIcon } from 'lucide-react';
import { z } from 'zod';
import type { StatusTone } from '@/components/ui/status-badge';

/** MSSQL ไม่มี enum — ค่าที่ยอมรับอยู่ที่นี่ คู่กับ @db.NVarChar(20) ใน schema.prisma */
export const leaveStatusSchema = z.enum(['pending', 'approved', 'rejected']);
export type LeaveStatus = z.infer<typeof leaveStatusSchema>;

export const LEAVE_STATUS_LABEL_TH: Record<LeaveStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
};

/** tone + icon บังคับคู่กันเสมอ — สีอย่างเดียวคนตาบอดสีอ่านไม่ออก (DESIGN.md §0.7) */
export const LEAVE_STATUS_TONE: Record<LeaveStatus, { tone: StatusTone; icon: LucideIcon }> = {
  pending: { tone: 'warning', icon: Clock },
  approved: { tone: 'success', icon: CircleCheck },
  rejected: { tone: 'danger', icon: CircleX },
};
