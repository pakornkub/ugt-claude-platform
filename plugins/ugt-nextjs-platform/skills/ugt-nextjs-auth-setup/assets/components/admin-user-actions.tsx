'use client';

// installed by ugt-nextjs-auth-setup — [METHOD: LDAP|LOCAL]
// ทางเดียวที่บัญชีถูกสร้างด้วยมือ ไม่มีหน้าสมัครสมาชิก
// เก็บเฉพาะส่วนของวิธี login ที่โปรเจคเลือกจริง: ไม่มี local → ตัด CreateUserDialog
// ฝั่ง local + SetPasswordDialog ทิ้ง · ไม่มี LDAP → ตัดตัวเลือก "บัญชี AD" ทิ้ง

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
import {
  addDirectoryUserAction,
  createLocalUserAction,
  setUserPasswordAction,
} from '@/lib/actions/admin-users';

const NO_ROLE = '__none__'; // Select ห้าม value="" (ดู ugt-nextjs-pitfalls)

type Role = { id: string; name: string };

export function CreateUserDialog({ roles }: Readonly<{ roles: Role[] }>) {
  const [open, setOpen] = useState(false);
  const [authType, setAuthType] = useState<'local' | 'ldap'>('local');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ldapUsername, setLdapUsername] = useState('');
  const [roleId, setRoleId] = useState(NO_ROLE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setPassword('');
    setLdapUsername('');
    setRoleId(NO_ROLE);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    const role = roleId === NO_ROLE ? null : roleId;
    const result =
      authType === 'local'
        ? await createLocalUserAction({ name, email, password, roleId: role })
        : await addDirectoryUserAction({ ldapUsername, name, email, roleId: role });
    setIsLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    toast.success(
      authType === 'local'
        ? 'สร้างผู้ใช้แล้ว — แจ้งรหัสผ่านตั้งต้นให้เจ้าตัวและให้เปลี่ยนทันที'
        : 'ตั้งบัญชี AD ไว้แล้ว — สิทธิ์จะมีผลตั้งแต่ครั้งแรกที่เขาเข้าสู่ระบบ'
    );
    setOpen(false);
    reset();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={2} />
        เพิ่มผู้ใช้
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
            <DialogTitle>เพิ่มผู้ใช้</DialogTitle>
            <DialogDescription>
              บัญชี SSO เกิดเองเมื่อเจ้าตัวเข้าสู่ระบบผ่าน Keycloak ครั้งแรก — ไม่ต้องเพิ่มที่นี่
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-user-type">ประเภทบัญชี</Label>
              <Select
                value={authType}
                onValueChange={(v) => {
                  setAuthType(v as 'local' | 'ldap');
                  setError(null);
                }}
              >
                <SelectTrigger id="new-user-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {/* [METHOD: LOCAL] */}
                  <SelectItem value="local">บัญชี local (ตั้งรหัสผ่านให้)</SelectItem>
                  {/* [METHOD: LDAP] */}
                  <SelectItem value="ldap">บัญชี AD (ตั้งค่าไว้ล่วงหน้า)</SelectItem>
                </SelectContent>
              </Select>
              {authType === 'ldap' && (
                <p className="text-xs text-muted-foreground">
                  ผู้ใช้ AD เข้าระบบได้อยู่แล้วโดยไม่ต้องเพิ่มที่นี่ — ใช้เมื่ออยากกำหนดบทบาทไว้
                  ก่อนวันแรกที่เขาเข้าใช้
                </p>
              )}
            </div>

            {/* [METHOD: LDAP] */}
            {authType === 'ldap' && (
              <div className="grid gap-2">
                <Label htmlFor="new-user-ldap">ชื่อผู้ใช้ AD</Label>
                <Input
                  id="new-user-ldap"
                  autoComplete="off"
                  value={ldapUsername}
                  onChange={(e) => setLdapUsername(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  ต้องตรงกับที่เขาพิมพ์ตอน login เป๊ะ ๆ — พิมพ์ผิดจะได้ผู้ใช้ซ้ำสองรายการ
                </p>
              </div>
            )}

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

            {/* [METHOD: LOCAL] */}
            {authType === 'local' && (
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
            )}

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
                เพิ่ม
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * [METHOD: LOCAL] แอดมินตั้งรหัสผ่านใหม่ให้ผู้ใช้ — ทางกู้บัญชีที่ใช้ได้แม้ไม่มีระบบอีเมล
 * ทุก session ของผู้ใช้รายนั้นถูกยกเลิกทันทีที่ตั้งสำเร็จ
 */
export function SetPasswordDialog({ userId, userName }: Readonly<{ userId: string; userName: string }>) {
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
