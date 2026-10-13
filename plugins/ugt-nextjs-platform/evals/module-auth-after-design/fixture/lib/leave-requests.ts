// Data access for คำขอลา — the only place the LeaveRequests table is read.
// Migrated 2026-10-13 from the prototype's hard-coded REQUESTS array in
// app/page.tsx (see docs/project-context/decisions.md).
import 'server-only';
import { prisma } from '@/lib/prisma';
import { leaveStatusSchema, type LeaveStatus } from '@/lib/leave-status';

export type LeaveRequestListItem = {
  id: number;
  employeeName: string;
  totalDays: number;
  status: LeaveStatus;
};

/** Active (not soft-deleted) leave requests, newest first. */
export async function listLeaveRequests(): Promise<LeaveRequestListItem[]> {
  const rows = await prisma.leaveRequest.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: 'desc' },
    select: { id: true, employeeName: true, totalDays: true, status: true },
  });

  return rows.map((row) => ({
    ...row,
    // The column is a plain NVarChar: anything unrecognised is shown as pending
    // rather than crashing the page.
    status: leaveStatusSchema.catch('pending').parse(row.status),
  }));
}
