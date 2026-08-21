'use client';
// kit: ugt-nextjs-platform 4.24.0 · ugt-nextjs-auth-setup/components/audit-logs-table.tsx
// kit-hash: 9d317cefcacc
// components/audit-logs-table.tsx — client half of /admin/audit-logs:
// DataTable โหมด server — ทุก filter/sort/page อยู่ใน URL ทั้งหมด แชร์ลิงก์แล้ว
// เห็นหน้าเดียวกัน refresh ไม่หลุด · toolbar filter (ชื่อผู้ใช้ → ช่วงวันที่ → action
// เรียงกว้าง→แคบ มติ 2026-08-11) push URL เอง ส่วน page/sort DataTable push ให้ ·
// ต้องมี org UI kit จาก ugt-nextjs-design-setup ก่อน — โปรเจคที่ไม่มี kit ดู SKILL.md §4
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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

const ALL_ACTIONS = '__all__'; // Radix Select rejects an empty-string item value

type AuditLogRow = {
  id: number;
  createdAt: string;
  userName: string;
  action: string;
  detail: string | null;
};

// URL อาจถูกแก้มือ (แชร์ลิงก์พิมพ์ผิด/ตัดครึ่ง) — parse ไม่ขึ้นต้อง fallback เป็น
// undefined เงียบ ๆ ไม่ปล่อย Invalid Date ไหลเข้า DateRangePicker
function parseDateParam(value: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// อ่านส่วนวัน/เดือน/ปีแบบ local เท่านั้น (ห้าม toISOString) — toISOString แปลงเป็น
// UTC ก่อนเสมอ ในโซน UTC+ (เช่น Asia/Bangkok) เที่ยงคืน local ของวันที่เลือกจะกลาย
// เป็นเย็นวันก่อนหน้า แล้ววันที่เลื่อนถอยหนึ่งวันตอน round-trip ผ่าน parseDateParam
function toDateParam(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

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
  filters: { q: string; from: string; to: string; action: string };
}>) {
  const router = useRouter();
  const pathname = usePathname();
  const [draftQ, setDraftQ] = useState(filters.q);
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  // filter เปลี่ยน = เงื่อนไขใหม่ → กลับหน้า 1 เสมอ (ลบ page ทิ้ง ให้ server default)
  function applyFilters(next: Partial<{ q: string; from: string; to: string; action: string }>) {
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
      header: 'เวลา',
      meta: { cellClassName: 'whitespace-nowrap tabular-nums' },
      // instant จริง → เวลาไทยผ่าน lib/format.ts เท่านั้น (DESIGN.md §5)
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    { accessorKey: 'userName', header: 'ผู้ใช้' },
    { accessorKey: 'action', header: 'การกระทำ', meta: { cellClassName: 'font-mono text-xs' } },
    {
      accessorKey: 'detail',
      header: 'รายละเอียด',
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
          '—'
        ),
    },
  ];

  return (
    <>
      <DataTable
        id="audit-logs"
        columns={columns}
        data={rows}
        searchable
        serverPagination={{ pageIndex, pageSize, totalItems }}
        serverQuery={{ query, baseParams, fields }}
        toolbarFilters={
          <>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
              />
              <Input
                value={draftQ}
                placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล..."
                className="w-56 pl-8"
                onChange={(e) => setDraftQ(e.target.value)}
                // ค้นฝั่ง server — apply ตอน Enter/ออกจากช่อง ไม่ยิงทุก keystroke
                onBlur={() => {
                  if (draftQ.trim() !== filters.q) applyFilters({ q: draftQ.trim() });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilters({ q: draftQ.trim() });
                }}
              />
            </div>
            <DateRangePicker
              from={parseDateParam(filters.from)}
              to={parseDateParam(filters.to)}
              onFromChange={(d) => applyFilters({ from: d ? toDateParam(d) : '' })}
              onToChange={(d) => applyFilters({ to: d ? toDateParam(d) : '' })}
            />
            <Select
              value={filters.action || ALL_ACTIONS}
              onValueChange={(value) => applyFilters({ action: value === ALL_ACTIONS ? '' : value })}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="ทุก action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACTIONS}>ทุก action</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
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
            <DialogTitle>รายละเอียด</DialogTitle>
          </DialogHeader>
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 font-mono text-xs break-all whitespace-pre-wrap">
            {prettyDetail(openDetail)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
