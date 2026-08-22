// kit: ugt-nextjs-platform 4.30.0 · ugt-nextjs-auth-setup/components/nav-user.tsx
// kit-hash: b56501151c0a
// source: ugt-hrms components/nav-user.tsx — generalized by ugt-nextjs-auth-setup
// (HR-only bits removed: employee photo lookup, Thai full name, emp code /
// position / cost-center rows — those come back through `extraRows`)
// Base UI (base-mira) API: menu items take `onClick` — Radix's `onSelect` is
// silently ignored here, which shipped once as "ปุ่ม logout กดไม่ได้" (4.25.0).
'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Loader2, LogOut, Mail, MoreVertical, UserCircle2, type LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { TruncatedText } from '@/components/ui/truncated-text';
import { logoutAction, ssoLogoutAction } from '@/lib/actions/auth';
// [METHOD: LOCAL] — ลบ import + เมนู "เปลี่ยนรหัสผ่าน" ด้านล่างเมื่อไม่ได้เปิด local login
import { ChangePasswordDialog } from '@/components/change-password-dialog';

/** One label→value line in the profile card. */
export type ProfileRow = {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
};

export type NavUserProps = {
  name: string;
  email: string;
  /** Avatar URL. Projects with a photo service pass the resolved URL here. */
  avatar?: string | null;
  /** Role name from RBAC — rendered as a plain Badge under the name. */
  roleName?: string | null;
  /** Last login method, straight from `user.authType`. */
  authType?: 'sso' | 'ldap' | 'local';
  /**
   * EXTENSION POINT: project-specific profile rows (employee code, position,
   * department, …). They render after the two standard rows, in this order.
   * Keep them read-only — this dialog never edits.
   */
  extraRows?: ProfileRow[];
};

const AUTH_TYPE_LABEL: Record<string, string> = {
  sso: 'SSO (Keycloak)',
  ldap: 'LDAP (Active Directory)',
  local: 'Local Account',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function InfoRow({ icon: Icon, label, children }: Readonly<Omit<ProfileRow, 'value'> & { children: React.ReactNode }>) {
  // gap-4 = 16px ตาม §4 (แถว label–ค่า ระยะระหว่างคอลัมน์ ≥16px)
  return (
    <div className="flex items-center gap-4 px-3.5 py-2.5">
      <Icon strokeWidth={2} className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto text-right font-medium break-all">{children}</span>
    </div>
  );
}

/**
 * Sidebar footer identity block + the profile card behind it.
 * Placement and contents are fixed by DESIGN.md §3 — every app shows the same
 * thing here, so a user never has to hunt for "who am I / how do I sign out".
 */
export function NavUser({
  name,
  email,
  avatar,
  roleName,
  authType = 'local',
  extraRows = [],
}: Readonly<NavUserProps>) {
  const { isMobile } = useSidebar();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false); // [METHOD: LOCAL]
  const [isPending, startTransition] = useTransition();
  const initials = getInitials(name);
  // SSO needs the backchannel logout; the other methods just drop the session
  const signOut = authType === 'sso' ? ssoLogoutAction : logoutAction;

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <SidebarMenuButton
                size="lg"
                className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }>
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src={avatar ?? undefined} alt={name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <TruncatedText className="truncate font-medium">{name}</TruncatedText>
                <TruncatedText className="truncate text-xs text-muted-foreground">
                  {email}
                </TruncatedText>
              </div>
              <MoreVertical strokeWidth={2} className="ml-auto size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 rounded-lg"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={avatar ?? undefined} alt={name} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                  <UserCircle2 strokeWidth={2} aria-hidden />
                  บัญชีผู้ใช้
                </DropdownMenuItem>
                {/* [METHOD: LOCAL] เฉพาะบัญชีที่รหัสผ่านอยู่ในระบบนี้ — บัญชี
                    SSO/LDAP เปลี่ยนที่ directory ขององค์กร */}
                {authType === 'local' && (
                  <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                    <KeyRound strokeWidth={2} aria-hidden />
                    เปลี่ยนรหัสผ่าน
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isPending}
                closeOnClick={false} // ค้างเมนูไว้ให้เห็น spinner ระหว่างรอ server action
                onClick={() => {
                  startTransition(async () => {
                    await signOut();
                  });
                }}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <LogOut strokeWidth={2} aria-hidden />
                )}
                ออกจากระบบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Profile card — read-only. DESIGN.md §4 มติ 2026-08-09: this is the one
          sanctioned exception to "detail dialogs group into sections, no
          per-row dividers" — a profile is a single short list, and the ruled
          rows read better than invented section headings. */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>ข้อมูลของฉัน</DialogTitle>
            <DialogDescription>{name}</DialogDescription>
          </DialogHeader>

          <div className="h-24 bg-muted bg-linear-to-br from-primary/20 via-primary/5 to-transparent" />

          <div className="-mt-12 flex flex-col items-center px-6">
            <Avatar className="size-24 rounded-full shadow-sm ring-4 ring-background">
              <AvatarImage src={avatar ?? undefined} alt={name} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <p className="mt-3 text-base font-semibold">{name}</p>
            {/* ป้ายชื่อ role = ตัวระบุ → Badge outline (มติ 2026-08-21) */}
            {roleName && (
              <Badge variant="outline" className="mt-2">
                {roleName}
              </Badge>
            )}
          </div>

          <div className="px-6 pt-5 pb-6">
            <dl className="divide-y rounded-lg border bg-card text-sm">
              <InfoRow icon={Mail} label="อีเมล">
                {email}
              </InfoRow>
              {extraRows.map((row) => (
                <InfoRow key={row.label} icon={row.icon} label={row.label}>
                  {row.value}
                </InfoRow>
              ))}
              <InfoRow icon={KeyRound} label="วิธี Login ล่าสุด">
                {AUTH_TYPE_LABEL[authType] ?? authType}
              </InfoRow>
            </dl>
          </div>
        </DialogContent>
      </Dialog>

      {/* [METHOD: LOCAL] */}
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
