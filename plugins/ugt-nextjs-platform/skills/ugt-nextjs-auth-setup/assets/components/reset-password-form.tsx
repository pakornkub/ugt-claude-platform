'use client';

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// ปลายทางของลิงก์ในอีเมล: app/(auth)/reset-password/page.tsx ส่ง token จาก
// searchParams เข้ามา (ดู SKILL.md §5.5)

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { newPasswordSchema, PASSWORD_POLICY_HINT } from '@/lib/password-policy';
import { resetPasswordAction } from '@/lib/actions/password';

export function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // ลิงก์ที่ถูกตัด/แก้ระหว่างทาง — บอกตั้งแต่ยังไม่ให้กรอก ดีกว่าให้ตั้งรหัสเสร็จแล้วค่อยพัง
  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-sm">
        <p>ลิงก์นี้ไม่ถูกต้องหรือไม่สมบูรณ์ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ</p>
        <Button render={<Link href="/login" />}>กลับไปหน้าเข้าสู่ระบบ</Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // ตรวจด้วย schema เดียวกับฝั่ง server — ผู้ใช้เห็นข้อความเดียวกันทั้งสองฝั่ง
    const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง');
      return;
    }
    setError(null);
    setIsLoading(true);
    const result = await resetPasswordAction({ token, password });
    if ('error' in result) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    toast.success('ตั้งรหัสผ่านใหม่เรียบร้อย กรุณาเข้าสู่ระบบอีกครั้ง');
    router.push('/login');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        ตั้งรหัสผ่านใหม่
      </Button>
    </form>
  );
}
