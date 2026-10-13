import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.hoisted: vi.mock is hoisted above the imports, so the spy must be created
// in a hoisted block or it is still in its temporal dead zone when the factory runs.
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { leaveRequest: { findMany } } }));

import { listLeaveRequests } from '@/lib/leave-requests';
import { LEAVE_STATUS_LABEL_TH, LEAVE_STATUS_TONE, leaveStatusSchema } from '@/lib/leave-status';

describe('leaveStatusSchema', () => {
  it('accepts the three stored values', () => {
    expect(leaveStatusSchema.parse('pending')).toBe('pending');
    expect(leaveStatusSchema.parse('approved')).toBe('approved');
    expect(leaveStatusSchema.parse('rejected')).toBe('rejected');
  });

  it('rejects anything else', () => {
    expect(leaveStatusSchema.safeParse('cancelled').success).toBe(false);
  });
});

describe('status presentation', () => {
  it('has a Thai label for every status', () => {
    expect(LEAVE_STATUS_LABEL_TH.pending).toBe('รออนุมัติ');
    expect(LEAVE_STATUS_LABEL_TH.approved).toBe('อนุมัติแล้ว');
    expect(LEAVE_STATUS_LABEL_TH.rejected).toBe('ไม่อนุมัติ');
  });

  it('pairs every status with a tone AND an icon (สีอย่างเดียวไม่พอ)', () => {
    for (const status of leaveStatusSchema.options) {
      expect(LEAVE_STATUS_TONE[status].tone).toBeTruthy();
      expect(LEAVE_STATUS_TONE[status].icon).toBeTruthy();
    }
  });
});

describe('listLeaveRequests', () => {
  beforeEach(() => {
    findMany.mockReset();
  });

  it('returns the rows as the UI expects them', async () => {
    findMany.mockResolvedValue([{ id: 1, employeeName: 'สมชาย', totalDays: 2, status: 'pending' }]);

    await expect(listLeaveRequests()).resolves.toEqual([
      { id: 1, employeeName: 'สมชาย', totalDays: 2, status: 'pending' },
    ]);
  });

  it('only asks for rows that are not soft-deleted', async () => {
    findMany.mockResolvedValue([]);

    await listLeaveRequests();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isDeleted: false } }));
  });

  it('falls back to pending when the column holds an unknown value', async () => {
    findMany.mockResolvedValue([
      { id: 2, employeeName: 'สมหญิง', totalDays: 1, status: 'something-else' },
    ]);

    const [row] = await listLeaveRequests();

    expect(row.status).toBe('pending');
  });
});
