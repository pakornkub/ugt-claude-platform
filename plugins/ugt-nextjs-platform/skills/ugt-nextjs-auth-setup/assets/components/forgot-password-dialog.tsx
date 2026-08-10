'use client';

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL] + ต้องมี ugt-nextjs-mail-setup
// เป็น dialog ไม่ใช่หน้าใหม่ — flow นี้มีช่องเดียวและจบในตัว ไม่คุ้มกับอีกหนึ่ง route
// ลบไฟล์นี้พร้อมลิงก์ใน login-form.tsx เมื่อไม่ได้ติดตั้ง mail (ลิงก์ที่ส่งไม่ถึงใคร
// แย่กว่าไม่มีปุ่มให้กด)

import { useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordAction } from '@/lib/actions/password';

export function ForgotPasswordDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const result = await forgotPasswordAction({ email });
    setIsLoading(false);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    // ข้อความยืนยันไม่บอกว่าอีเมลนี้มีอยู่จริงหรือไม่ — ถ้าบอก หน้านี้จะกลายเป็น
    // เครื่องมือไล่เช็คว่าใครเป็นผู้ใช้ของระบบ
    setSent(true);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setSent(false);
      setEmail('');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ลืมรหัสผ่าน</DialogTitle>
          <DialogDescription>
            กรอกอีเมลของบัญชี ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <>
            <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
              <MailCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <p>
                หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว
                ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 60 นาที
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>ปิด</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="forgot-email">อีเมล</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                ส่งลิงก์
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
