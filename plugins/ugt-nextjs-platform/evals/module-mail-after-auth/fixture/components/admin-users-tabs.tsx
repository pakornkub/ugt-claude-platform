'use client';
// kit: ugt-nextjs-platform 4.79.0 · ugt-nextjs-auth-setup/components/admin-users-tabs.tsx
// kit-hash: 5165a143c3fa
// components/admin-users-tabs.tsx — แท็บหลักของ /admin/users เก็บสถานะใน `?tab=`
// (DESIGN.md: tab หลักของหน้า = URL — refresh/แชร์ลิงก์แล้วอยู่แท็บเดิม; ลิงก์ในเมล
// แจ้งแอดมินชี้ ?tab=no-role) · installed by ugt-nextjs-auth-setup
//
// สลับแท็บด้วย state + history.replaceState: ทันที ไม่ยิง server ใหม่ (ทุกแท็บโหลด
// มาพร้อมหน้าแล้ว) — Next.js ≥14.1 sync replaceState เข้ากับ router ให้เอง
// useState อ่าน defaultValue ครั้งเดียว — หน้าต้องส่ง key={activeTab} มาด้วย ไม่งั้นลิงก์
// ?tab= อื่นแบบ soft navigation (คลิกเมนู/ลิงก์ในแอป) จะค้างแท็บเดิม
import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';

export function AdminUsersTabs({
  defaultValue,
  children,
}: Readonly<{ defaultValue: string; children: React.ReactNode }>) {
  const [value, setValue] = useState(defaultValue);
  return (
    <Tabs
      value={value}
      onValueChange={(next: string) => {
        setValue(next);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', next);
        window.history.replaceState(null, '', url);
      }}
    >
      {children}
    </Tabs>
  );
}
