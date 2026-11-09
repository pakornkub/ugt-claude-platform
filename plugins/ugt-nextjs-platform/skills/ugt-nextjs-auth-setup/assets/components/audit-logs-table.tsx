'use client';
// kit: ugt-nextjs-platform 4.86.0 · ugt-nextjs-auth-setup/components/audit-logs-table.tsx
// kit-hash: 3c9a30782b0b
// components/audit-logs-table.tsx — client half of /admin/audit-logs:
// DataTable โหมด server — ทุก filter/sort/page อยู่ใน URL ทั้งหมด แชร์ลิงก์แล้ว
// เห็นหน้าเดียวกัน refresh ไม่หลุด · ช่องค้นหาเป็นของ DataTable (prop `serverSearch`
// โหมด server — หน้านี้ไม่วาด Input เอง ตาม DESIGN.md §3) ส่วน filter ที่เหลือ
// (action) push URL เอง · ช่วงวันที่ = ตัวกรองคอลัมน์ "เวลา" ของ DataTable (ปฏิทินเลือกช่วง
// → `f_createdAt`) แทน DateRangePicker บน toolbar ที่เคยมี ·
// ต้องมี org UI kit จาก ugt-nextjs-design-setup ก่อน — โปรเจคที่ไม่มี kit ดู SKILL.md §4
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/format';
import type { TableFields, TableQuery } from '@/lib/table-query';

const ALL_ACTIONS = '__all__'; // Base UI Select ถือว่า value="" คือ "ยังไม่เลือก" — ดู ugt-nextjs-pitfalls

type AuditLogRow = {
  id: number;
  createdAt: string;
  userName: string;
  action: string;
  detail: string | null;
};

function prettyDetail(detail: string | null): string {
  if (!detail) return '';
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail; // detail ไม่ใช่ JSON ก็แสดงดิบ ๆ — ห้ามทำหน้า error
  }
}

export function AuditLogsTable({
  rows,
  pageIndex,
  pageSize,
  totalItems,
  query,
  fields,
  baseParams,
  actionOptions,
  filters,
}: Readonly<{
  rows: AuditLogRow[];
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  query: TableQuery;
  fields: TableFields;
  baseParams: string;
  actionOptions: string[];
  filters: { q: string; action: string };
}>) {
  const t = useTranslations('auth');
  const router = useRouter();
  const pathname = usePathname();
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  // filter เปลี่ยน = เงื่อนไขใหม่ → กลับหน้า 1 เสมอ (ลบ page ทิ้ง ให้ server default)
  function applyFilters(next: Partial<{ q: string; action: string }>) {
    const params = new URLSearchParams(baseParams);
    params.delete('page');
    for (const [key, value] of Object.entries({ ...filters, ...next })) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const columns: ColumnDef<AuditLogRow>[] = [
    {
      accessorKey: 'createdAt',
      header: t('auditLogsTable.colTime'),
      // dateFilter: true — หน้าที่กรองแล้วไม่มีแถวยังต้องเป็นปฏิทิน (ตรวจจากแถวไม่ได้)
      meta: { cellClassName: 'whitespace-nowrap tabular-nums', dateFilter: true },
      // instant จริง → เวลาไทยผ่าน lib/format.ts เท่านั้น (DESIGN.md §5)
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    { accessorKey: 'userName', header: t('auditLogsTable.colActor') },
    { accessorKey: 'action', header: t('auditLogsTable.colAction'), meta: { cellClassName: 'font-mono text-xs' } },
    {
      accessorKey: 'detail',
      header: t('auditLogsTable.colDetail'),
      cell: ({ row }) =>
        row.original.detail ? (
          // JSON ย่อบรรทัดเดียวในตาราง กดเพื่อเปิดฉบับเต็มใน dialog — ห้ามซ่อน
          // ข้อมูลไว้ใน tooltip อย่างเดียว (มือถือไม่มี hover)
          <button
            type="button"
            title={row.original.detail}
            className="block max-w-md cursor-pointer truncate text-left font-mono text-xs underline-offset-2 hover:underline"
            onClick={() => setOpenDetail(row.original.detail)}
          >
            {row.original.detail}
          </button>
        ) : (
          '-' // ค่าว่าง = '-' (DESIGN.md §5)
        ),
    },
  ];

  return (
    <>
      {/* ค้นหาฝั่ง server: DataTable หน่วงการพิมพ์ให้แล้วส่งคำค้นกลับมาที่ applyFilters */}
      <DataTable
        id="audit-logs"
        columns={columns}
        data={rows}
        filterPlaceholder={t('auditLogsTable.searchPlaceholder')}
        serverSearch={{ value: filters.q, onChange: (q) => applyFilters({ q }) }}
        serverPagination={{ pageIndex, pageSize, totalItems }}
        serverQuery={{ query, baseParams, fields }}
        toolbarFilters={
          <Select
              // items: without it Base UI renders the raw value in <SelectValue> (a cuid, "__all__")
              items={[
                { value: ALL_ACTIONS, label: t('auditLogsTable.allActions') },
                ...actionOptions.map((a) => ({ value: a, label: a })),
              ]}
              value={filters.action || ALL_ACTIONS}
              onValueChange={(value) => applyFilters({ action: !value || value === ALL_ACTIONS ? '' : value })}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder={t('auditLogsTable.allActions')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACTIONS}>{t('auditLogsTable.allActions')}</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
        }
      />

      <Dialog
        open={openDetail !== null}
        onOpenChange={(open) => {
          if (!open) setOpenDetail(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('auditLogsTable.detailDialogTitle')}</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs break-all whitespace-pre-wrap">
            {prettyDetail(openDetail)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
