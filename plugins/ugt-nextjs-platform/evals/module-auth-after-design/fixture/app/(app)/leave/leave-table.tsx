'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatNumber } from '@/lib/format';
import { LEAVE_STATUS_LABEL_TH, LEAVE_STATUS_TONE } from '@/lib/leave-status';
import type { LeaveRequestListItem } from '@/lib/leave-requests';

const columns: ColumnDef<LeaveRequestListItem>[] = [
  { accessorKey: 'employeeName', header: 'ผู้ขอลา' },
  {
    accessorKey: 'totalDays',
    header: 'จำนวนวัน',
    // ตัวเลขชิดขวา tabular (DESIGN.md §2) · numeric = ไม่เข้าเกณฑ์กรองรายคอลัมน์
    meta: { numeric: true, headerClassName: 'text-right', cellClassName: 'text-right tabular-nums' },
    cell: ({ row }) => formatNumber(row.original.totalDays),
  },
  {
    accessorKey: 'status',
    header: 'สถานะ',
    cell: ({ row }) => {
      const { tone, icon } = LEAVE_STATUS_TONE[row.original.status];
      return (
        <StatusBadge tone={tone} icon={icon}>
          {LEAVE_STATUS_LABEL_TH[row.original.status]}
        </StatusBadge>
      );
    },
  },
];

/**
 * ข้อมูลคำขอลาเป็นชุด bounded (ดึงทั้งหมด) จึงใช้โหมด client ตามเกณฑ์ DESIGN.md §4
 * — ถ้าวันหนึ่งข้อมูลโตจนต้อง paginate ฝั่ง server ให้ย้ายไป `serverPagination` +
 * `serverQuery` ทั้งชุด ห้าม sort ฝั่ง client บนข้อมูลที่เห็นไม่ครบ
 */
export function LeaveTable({ data }: Readonly<{ data: LeaveRequestListItem[] }>) {
  return (
    <DataTable
      id="leave-requests"
      columns={columns}
      data={data}
      globalSearch
      filterPlaceholder="ค้นหาคำขอลา..."
      getRowId={(row) => String(row.id)}
      emptyTitle="ยังไม่มีคำขอลา"
      emptyDescription="คำขอลาที่พนักงานส่งเข้ามาจะแสดงที่นี่"
    />
  );
}
