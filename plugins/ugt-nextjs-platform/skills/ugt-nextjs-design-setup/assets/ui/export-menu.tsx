'use client';
// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/ui/export-menu.tsx
// kit-hash: 6d7dc55a8cd0

// source: ugt-hrms components/ui/export-menu.tsx — installed by ugt-nextjs-design-setup (org UI kit)
// ปุ่ม export Excel/CSV สำหรับวางใน `toolbarExtra` ของ DataTable
// รูปทรงตามปุ่มตั้งค่าคอลัมน์ที่อยู่ข้าง ๆ กัน (outline + size icon + aria-label)
// เพื่อให้แถบเครื่องมือของทุกหน้าหน้าตาเหมือนกัน

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportMenuProps {
  /** URL ของ Route Handler ที่ทำ export (Route Handler เท่านั้น ไม่ใช่ Server Action) */
  endpoint: string;
  /** body ที่จะ POST ไป — ต้องส่ง filter/sort ชุดเดียวกับที่ตารางเห็นอยู่
   *  ไม่ใช่ filter เปล่า ๆ ไม่งั้นผู้ใช้จะได้ไฟล์คนละชุดกับที่อยู่ตรงหน้า */
  buildBody: (format: 'excel' | 'csv') => unknown;
  disabled?: boolean;
}

export function ExportMenu({ endpoint, buildBody, disabled }: Readonly<ExportMenuProps>) {
  const [exporting, setExporting] = useState<'excel' | 'csv' | null>(null);
  const t = useTranslations('kit.exportMenu');

  async function handleExport(format: 'excel' | 'csv') {
    setExporting(format);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(format)),
      });

      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        toast.error(
          (data as { error?: { message?: string } } | null)?.error?.message ?? t('failed')
        );
        return;
      }

      // ชื่อไฟล์มาจาก Content-Disposition ของ server — ฝั่ง client ไม่ตั้งเอง
      // จะได้ไม่มีวันหลุดจากชื่อจริงของไฟล์ที่ server สร้าง
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filename =
        /filename="([^"]+)"/.exec(disposition)?.[1] ??
        `export.${format === 'excel' ? 'xlsx' : 'csv'}`;

      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('success'));
    } catch {
      toast.error(t('failed'));
    } finally {
      setExporting(null);
    }
  }

  const busy = exporting !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon" disabled={disabled || busy} aria-label={t('trigger')} />
        }
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" strokeWidth={2} />
        ) : (
          <Download className="size-4" strokeWidth={2} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('excel')} disabled={busy}>
          <FileSpreadsheet className="size-4" strokeWidth={2} />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={busy}>
          <FileText className="size-4" strokeWidth={2} />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
