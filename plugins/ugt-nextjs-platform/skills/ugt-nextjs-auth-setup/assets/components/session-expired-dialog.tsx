'use client';
// kit: ugt-nextjs-platform 4.52.0 · ugt-nextjs-auth-setup/components/session-expired-dialog.tsx
// kit-hash: a7962c3ecaa2

// installed by ugt-nextjs-auth-setup — every project
// ตัวรับ CustomEvent `session-expired` ที่ query-provider (design kit) และ
// lib/auth-client.ts ยิงเมื่อเจอ 401 กลางหน้า (session หมดอายุระหว่างผู้ใช้
// ยังเปิดหน้าค้าง — proxy.ts จับได้เฉพาะตอนเปลี่ยนหน้า) — mount ครั้งเดียว
// ใน protected layout (SKILL.md §5.5 ข้อ 2)
//
// จงใจปิดไม่ได้ (ไม่มีปุ่มยกเลิก · Esc/คลิกนอกไม่หลุด): session ตายแล้ว
// ข้อมูลบนหน้าคือของเก่า กดอะไรต่อก็เจอ 401 ซ้ำ ทางเดียวที่ไปต่อได้คือ
// login ใหม่ — ข้อยกเว้น footer "primary เดียว ไม่มียกเลิก" อยู่ใน
// Dialog ladder (DESIGN.md §4)

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TriangleAlert } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// process.env ตรง ๆ ด้วยเหตุผลเดียวกับ lib/auth-client.ts — createEnv()
// คืน '' สำหรับ NEXT_PUBLIC_* ใน Turbopack client bundle
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function SessionExpiredDialog() {
  const t = useTranslations('auth.sessionExpiredDialog');
  const [open, setOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // หลาย query เจอ 401 พร้อมกัน = event ยิงซ้ำหลายนัด — setState ค่าเดิมเฉย ๆ
    const onSessionExpired = (): void => setOpen(true);
    globalThis.addEventListener('session-expired', onSessionExpired);
    return () => globalThis.removeEventListener('session-expired', onSessionExpired);
  }, []);

  const goToLogin = (): void => {
    setNavigating(true);
    // full navigation ไม่ใช่ router.push: ล้าง client state + React Query cache
    // ที่ stale ทั้งก้อน แล้วให้หน้า login แสดง banner ผ่าน ?reason=session_expired
    // (convention เดียวกับ redirect ฝั่ง server — references/auth-flows.md)
    globalThis.location.assign(`${BASE_PATH}/login?reason=session_expired`);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // รับเฉพาะคำสั่งเปิด — Esc/คลิกนอกส่ง false มาก็ไม่ปิด (เหตุผลหัวไฟล์)
        if (next) setOpen(true);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
              <TriangleAlert className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
            </span>
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription>{t('description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction disabled={navigating} onClick={goToLogin}>
            {t('loginAgain')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
