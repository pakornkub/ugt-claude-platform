'use client';
// kit: ugt-nextjs-platform 4.44.0 · ugt-nextjs-upload-setup/components/file-upload.tsx
// kit-hash: 818460894311
// ต้องมี org UI kit จาก ugt-nextjs-design-setup ก่อน — ไฟล์นี้ import
// ui/icon-action กับ lib/format (formatFileSize) ซึ่ง kit เป็นคนติดตั้ง
import * as React from 'react';
import { Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconAction } from '@/components/ui/icon-action';
import { formatFileSize } from '@/lib/format';

export interface AttachmentSummary {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

/**
 * Attachment field for a record. Posts to `/api/files`, which scans before
 * storing — so the failure the user sees ("ตรวจพบไวรัส", "ระบบตรวจไวรัสไม่พร้อม")
 * is the truth from the server, never a guess made here.
 *
 * Downloads go through the guarded route, so the link is a plain href to
 * `/api/files/<id>` and the server decides whether it is allowed.
 */
export function FileUpload({
  entityType,
  entityId,
  items,
  onChange,
  disabled,
}: Readonly<{
  entityType: string;
  entityId: string;
  items: AttachmentSummary[];
  onChange: (next: AttachmentSummary[]) => void;
  disabled?: boolean;
}>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

  async function upload(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('entityType', entityType);
      body.append('entityId', entityId);

      const response = await fetch(`${basePath}/api/files`, { method: 'POST', body });
      // Check `ok` before parsing — a 500 returning an HTML error page would
      // otherwise surface as a confusing JSON parse failure.
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.error?.message ?? 'อัปโหลดไม่สำเร็จ');
        return;
      }
      const payload = await response.json();
      onChange([...items, payload.data as AttachmentSummary]);
      toast.success('อัปโหลดไฟล์แล้ว');
    } catch (error) {
      console.error('upload failed', error);
      toast.error('อัปโหลดไม่สำเร็จ');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload strokeWidth={2} aria-hidden />
        {busy ? 'กำลังอัปโหลด…' : 'แนบไฟล์'}
      </Button>

      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
            >
              <Paperclip strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={`${basePath}/api/files/${item.id}`}
                className="min-w-0 flex-1 truncate underline-offset-2 hover:underline"
              >
                {item.fileName}
              </a>
              <span className="shrink-0 text-muted-foreground">{formatFileSize(item.fileSize)}</span>
              {!disabled && (
                <IconAction
                  label="ลบไฟล์แนบ"
                  tone="danger"
                  onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                >
                  <Trash2 strokeWidth={2} aria-hidden />
                </IconAction>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
