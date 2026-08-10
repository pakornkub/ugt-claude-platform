'use client';

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// เปิดจากเมนูโปรไฟล์ใน NavUser และแสดงเฉพาะบัญชี local เท่านั้น
// (บัญชี SSO/LDAP เปลี่ยนรหัสผ่านที่ directory ขององค์กร — ให้กล่องนี้กับเขา
// คือหลอกให้กรอกรหัสผ่านองค์กรลงในแอปที่เปลี่ยนอะไรไม่ได้)

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { newPasswordSchema, PASSWORD_POLICY_HINT } from '@/lib/password-policy';
import { changePasswordAction } from '@/lib/actions/password';

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function reset() {
    setCurrentPassword('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
      return;
    }
    setError(null);
    setIsLoading(true);
    const result = await changePasswordAction({ currentPassword, newPassword: password });
    setIsLoading(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    toast.success('เปลี่ยนรหัสผ่านเรียบร้อย อุปกรณ์อื่นที่ค้างไว้ถูกออกจากระบบแล้ว');
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เปลี่ยนรหัสผ่าน</DialogTitle>
          <DialogDescription>
            หลังเปลี่ยนสำเร็จ อุปกรณ์อื่นที่ยังเข้าระบบค้างไว้จะถูกออกจากระบบทั้งหมด
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="change-new-password">รหัสผ่านใหม่</Label>
            <Input
              id="change-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="change-confirm-password">ยืนยันรหัสผ่านใหม่</Label>
            <Input
              id="change-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              เปลี่ยนรหัสผ่าน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
