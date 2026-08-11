'use client';

// installed by ugt-nextjs-auth-setup — [METHOD: LOCAL]
// ทางเดียวที่บัญชี local ถูกสร้าง — ไม่มีหน้าสมัครสมาชิก
// บัญชี SSO/AD ไม่ต้องเพิ่มที่นี่: เกิดเองตอน login ครั้งแรก (มติ 2026-08-11)
// แล้วค่อยกำหนด role จาก dropdown ในตาราง — ลบไฟล์นี้เมื่อไม่ได้เปิด local login

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
import { createLocalUserAction, setUserPasswordAction } from '@/lib/actions/admin-users';

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

  function reset() {
    setName('');
    setEmail('');
    setPassword('');
    setRoleId(NO_ROLE);
    setError(null);
  }

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
    // รหัสผ่านตั้งต้นนี้ไม่ถูกเก็บไว้ที่ไหนอีก — แจ้งเจ้าตัวแล้วให้เปลี่ยนทันที
    toast.success('สร้างผู้ใช้แล้ว — แจ้งรหัสผ่านตั้งต้นให้เจ้าตัวและให้เปลี่ยนทันที');
    setOpen(false);
    reset();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={2} />
        เพิ่มผู้ใช้ local
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เพิ่มผู้ใช้ local</DialogTitle>
            <DialogDescription>
              บัญชี SSO/AD ไม่ต้องเพิ่ม — เกิดเองเมื่อเจ้าตัวเข้าสู่ระบบครั้งแรก
              แล้วค่อยกำหนดบทบาทจากตาราง
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

/**
 * แอดมินตั้งรหัสผ่านใหม่ให้ผู้ใช้ local — ทางกู้บัญชีที่ใช้ได้แม้ไม่มีระบบอีเมล
 * ทุก session ของผู้ใช้รายนั้นถูกยกเลิกทันทีที่ตั้งสำเร็จ
 */
export function SetPasswordDialog({
  userId,
  userName,
}: Readonly<{ userId: string; userName: string }>) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await setUserPasswordAction({ userId, newPassword });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success('ตั้งรหัสผ่านใหม่แล้ว — แจ้งเจ้าตัวและให้เปลี่ยนเองทันทีที่เข้าระบบ');
      setOpen(false);
      setNewPassword('');
      setError(null);
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" strokeWidth={2} />
        ตั้งรหัสผ่าน
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setNewPassword('');
            setError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ตั้งรหัสผ่านใหม่</DialogTitle>
            <DialogDescription>
              {userName} — ทุกอุปกรณ์ที่เขาเข้าระบบค้างไว้จะถูกออกจากระบบทันที
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="set-password">รหัสผ่านใหม่</Label>
              <Input
                id="set-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                ตั้งรหัสผ่าน
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
