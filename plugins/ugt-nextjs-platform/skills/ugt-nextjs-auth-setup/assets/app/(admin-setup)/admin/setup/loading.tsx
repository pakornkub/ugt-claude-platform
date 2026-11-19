// kit: ugt-nextjs-platform 4.97.0 · ugt-nextjs-auth-setup/app/(admin-setup)/admin/setup/loading.tsx
// kit-hash: 0ffb5f4ad5bc
// app/(admin-setup)/admin/setup/loading.tsx — skeleton ตามโครงหน้า: การ์ดกลางจอ (วงกลมไอคอน + ชื่อ +
// คำอธิบาย 2 บรรทัด + ปุ่มเต็มแถว) แบบเดียวกับ admin-setup-form.tsx · หน้านี้อยู่นอก app shell ไม่มี
// PageShell จึงไม่ใช้ preset (DESIGN.md §6 route loading — ทุก route มี loading.tsx)
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div aria-busy="true" className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center gap-2 px-(--card-spacing)">
          <Skeleton className="mb-2 size-14 rounded-full" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="px-(--card-spacing)">
          <Skeleton className="h-9 w-full" />
        </div>
      </Card>
    </div>
  );
}
