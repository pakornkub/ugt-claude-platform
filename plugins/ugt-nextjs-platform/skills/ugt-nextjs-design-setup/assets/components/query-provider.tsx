'use client';

// source: ugt-hrms components/providers.tsx — installed by ugt-nextjs-design-setup
// QueryClient หนึ่งตัวของทั้งแอป — ห้ามหน้าไหน new QueryClient เอง ไม่งั้น cache
// แยกก้อนแล้ว invalidateQueries ข้ามหน้าไม่ถึงกัน (อาการ "บันทึกแล้วหน้าไม่อัปเดต")
//
// วางใน app/layout.tsx ชั้นนอกสุดของ provider ฝั่ง client:
//   <QueryProvider><ThemeProvider>…</ThemeProvider></QueryProvider>

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { HttpError } from '@/lib/http-error';

// 401 กลางทาง (session หมดอายุระหว่างใช้งาน) — ยิง event เดียวให้ตัวเฝ้า session
// ของ auth-setup พาไป login ใหม่ ไม่ต้องให้ทุก queryFn จัดการ 401 เอง
// (ไม่มีตัวรับฟังก็ไม่เป็นไร — event เงียบ ๆ ไป)
function dispatchSessionExpired() {
  if (globalThis.window !== undefined) {
    globalThis.dispatchEvent(new CustomEvent('session-expired'));
  }
}

export function QueryProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  // useState กัน QueryClient ถูกสร้างใหม่ทุก render — สร้างใหม่ = cache หายเงียบ ๆ
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError(error) {
            if (error instanceof HttpError && error.status === 401) {
              dispatchSessionExpired();
            }
          },
        }),
        defaultOptions: {
          queries: {
            // ข้อมูลองค์กรเปลี่ยนจากหลายมือ (แอดมิน, batch, คนอื่นในทีม) —
            // เห็นของสดสำคัญกว่าประหยัด fetch จึงตั้ง stale ทันที
            staleTime: 0,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
