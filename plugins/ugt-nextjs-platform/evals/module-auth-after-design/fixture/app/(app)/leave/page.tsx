import type { Metadata } from 'next';

import {
  PageHeader,
  PageHeaderText,
  PageShell,
  PageTitle,
  PageDescription,
} from '@/components/ui/page-shell';
import { listLeaveRequests } from '@/lib/leave-requests';
import { LeaveTable } from './leave-table';

export const metadata: Metadata = { title: 'คำขอลา' };

export default async function LeavePage() {
  const requests = await listLeaveRequests();

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>คำขอลา</PageTitle>
          <PageDescription>รายการคำขอลาทั้งหมดและสถานะการอนุมัติ</PageDescription>
        </PageHeaderText>
      </PageHeader>
      <LeaveTable data={requests} />
    </PageShell>
  );
}
