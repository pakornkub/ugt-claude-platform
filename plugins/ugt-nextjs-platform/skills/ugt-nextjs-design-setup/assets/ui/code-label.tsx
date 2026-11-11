// kit: ugt-nextjs-platform 4.88.0 · ugt-nextjs-design-setup/ui/code-label.tsx
// kit-hash: c728466b4efc
// source: ugt-hrms components/ui/code-label.tsx — installed by ugt-nextjs-design-setup (org UI kit)
// มติ ugt-hrms DESIGN §10 2026-10-28 "รหัส+คำอธิบาย" (แบบ B) · DESIGN.md §4 ตาราง Badge
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * รหัส master สั้น ๆ (`O`, `DM`, `OT_M600`) คู่กับความหมายของมันเสมอ — รหัสเป็น `Badge`
 * outline ตัว mono (ป้ายตัวระบุตามตาราง Badge — ไม่ใช่ `secondary` ซึ่งเป็น chip ตัวกรอง)
 * + คำอธิบายข้าง ๆ · ผู้ใช้หน้างานอ่านรหัสเปล่าไม่ออก (ugt-hrms HR เทส 2026-10-27).
 *
 * ไม่มีคำอธิบาย = รหัสอย่างเดียว · ไม่มีรหัส = `-` (ค่าว่างตาม §5) — ใน `DetailRow` ที่อยากข้ามแถว
 * ส่ง `{code && <CodeLabel … />}` แทน. ข้อความทั้งสองมาจากผู้เรียก (แปลเองฝั่งผู้เรียก).
 *
 * ```tsx
 * <CodeLabel code={row.shiftCode} description={row.shiftName} />
 * ```
 */
export function CodeLabel({
  code,
  description,
  className,
}: Readonly<{
  code: string | null | undefined;
  description?: string | null;
  className?: string;
}>) {
  if (!code) return <span className={cn('text-muted-foreground', className)}>-</span>;
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      <Badge variant="outline" className="font-mono">
        {code}
      </Badge>
      {description ? <span className="truncate">{description}</span> : null}
    </span>
  );
}
