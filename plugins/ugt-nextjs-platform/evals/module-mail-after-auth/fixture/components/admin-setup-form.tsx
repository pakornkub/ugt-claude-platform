'use client';
// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/components/admin-setup-form.tsx
// kit-hash: 44b61c85f709

// components/admin-setup-form.tsx — one-click first-admin bootstrap.
import { useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Settings, Loader2 } from 'lucide-react';
import { initializeAdminAction } from '@/lib/actions/admin-setup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AdminSetupForm() {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('auth.adminSetup');
  const tErrors = useTranslations('auth.errors');

  function handleSetup() {
    startTransition(async () => {
      // สำเร็จ = action redirect('/admin/users') เอง — โค้ดหลัง await ไม่ได้รันต่อ
      const result = await initializeAdminAction();
      if (result?.code) {
        toast.error(t('setupFailedTitle'), { description: tErrors(result.code as Parameters<typeof tErrors>[0]) });
      }
    });
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        {/* วงกลมไอคอน hero — สเปคตายตัวใน DESIGN.md §4 (shadcn ไม่มีของกลางให้;
            EmptyMedia เป็นสี่เหลี่ยมของ empty state) ห้ามแก้ค่าเอง */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Settings className="size-7 text-primary" strokeWidth={2} />
        </div>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>
          {t('descriptionLine1')}
          <br />
          {t('descriptionLine2')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" disabled={isPending} onClick={handleSetup}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" strokeWidth={2} />
              {t('loading')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
