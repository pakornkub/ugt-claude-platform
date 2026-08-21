'use client';
// kit: ugt-nextjs-platform 4.25.0 · ugt-nextjs-auth-setup/components/admin-setup-form.tsx
// kit-hash: 97fe46c7ef3f

// components/admin-setup-form.tsx — one-click first-admin bootstrap.
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Settings, Loader2 } from 'lucide-react';
import { initializeAdminAction } from '@/lib/actions/admin-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminSetupForm() {
  const [isPending, startTransition] = useTransition();

  function handleSetup() {
    startTransition(async () => {
      // สำเร็จ = action redirect('/admin/users') เอง — โค้ดหลัง await ไม่ได้รันต่อ
      const result = await initializeAdminAction();
      if (result?.error) {
        toast.error('ตั้งค่าไม่สำเร็จ', { description: result.error });
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Settings className="size-7 text-primary" strokeWidth={2} />
        </div>
        <CardTitle className="text-2xl">ตั้งค่าผู้ดูแลระบบครั้งแรก</CardTitle>
        <CardDescription>
          กดปุ่มด้านล่างเพื่อสร้าง role ผู้ดูแลระบบ (Administrator)
          พร้อมสิทธิ์ทั้งหมด และกำหนดให้บัญชีของคุณเป็นผู้ดูแลระบบคนแรก
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" disabled={isPending} onClick={handleSetup}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
              กำลังตั้งค่า...
            </>
          ) : (
            'เริ่มตั้งค่าผู้ดูแลระบบ'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
