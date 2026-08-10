'use client';

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// ทางเข้าเดียวของบัญชี local: แอดมินสร้างให้ ไม่มีหน้าสมัครสมาชิก
// ลบไฟล์นี้พร้อมสองแอ็กชันใน lib/actions/admin-users.ts เมื่อไม่ได้เปิด local login

import { useState, useTransition } from 'react';
import { KeyRound, Loader2, Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PASSWORD_POLICY_HINT } from '@/lib/password-policy';
import { createLocalUserAction, sendUserPasswordResetAction } from '@/lib/actions/admin-users';

const NO_ROLE = '__none__'; // Select ห้าม value="" (ดู ugt-nextjs-pitfalls)

export function CreateUserDialog({
  roles,
}: Readonly<{ roles: { id: string; name: string }[] }>) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(NO_ROLE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const result = await createLocalUserAction({
      name,
      email,
      password,
      roleId: roleId === NO_ROLE ? null : roleId,
    });
    setIsLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    // รหัสผ่านตั้งต้นนี้ไม่ถูกเก็บไว้ที่ไหนอีก — แจ้งผู้ใช้แล้วให้เขาเปลี่ยนเอง
    toast.success('สร้างผู้ใช้แล้ว — แจ้งรหัสผ่านตั้งต้นให้เจ้าตัวและให้เปลี่ยนทันที');
    setOpen(false);
    setName('');
    setEmail('');
    setPassword('');
    setRoleId(NO_ROLE);
    setError(null);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={2} />
        สร้างผู้ใช้
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>สร้างผู้ใช้ (บัญชี local)</DialogTitle>
            <DialogDescription>
              บัญชี SSO/LDAP ไม่ต้องสร้างที่นี่ — เกิดเองเมื่อเจ้าตัวเข้าสู่ระบบครั้งแรก
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-user-name">ชื่อ</Label>
              <Input
                id="new-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-email">อีเมล</Label>
              <Input
                id="new-user-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-password">รหัสผ่านตั้งต้น</Label>
              <Input
                id="new-user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-user-role">บทบาท</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ROLE}>ยังไม่กำหนด</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="size-4 animate-spin" />}
                สร้าง
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** ส่งลิงก์ตั้งรหัสผ่านใหม่ให้ผู้ใช้ — แอดมินไม่ได้เห็นหรือกำหนดรหัสใหม่เอง */
export function SendPasswordResetButton({
  userId,
  disabled,
}: Readonly<{ userId: string; disabled?: boolean }>) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await sendUserPasswordResetAction(userId);
          if (result.success) toast.success('ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว');
          else toast.error(result.error);
        })
      }
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <KeyRound className="size-4" strokeWidth={2} />
      )}
      ส่งลิงก์ตั้งรหัสผ่าน
    </Button>
  );
}
