'use client';
// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/ui/query-progress.tsx
// kit-hash: 8c2b123dbbcc

// source: ugt-hrms components/ui/query-progress.tsx — installed by
// ugt-nextjs-design-setup · ต้องอยู่ใต้ <QueryProvider> · dep: nprogress
//
// แถบ progress บาง ๆ บนหัวจอตอน query โหลดครั้งแรก — เฉพาะ query ที่ยังไม่เคยมี
// ข้อมูล (initial load) เท่านั้น การ refetch เบื้องหลังจงใจไม่โชว์ ไม่งั้นแถบ
// กะพริบทุกครั้งที่ invalidate หลังบันทึก
//
// nprogress ไม่มี CSS ในตัว — บล็อก #nprogress อยู่ท้าย app/globals.css แล้ว

import * as React from 'react';
import { useIsFetching } from '@tanstack/react-query';
import NProgress from 'nprogress';

// spinner ปิดไว้ — เราสไตล์เฉพาะ .bar/.peg
NProgress.configure({ showSpinner: false });

export function QueryProgress() {
  const isFetching = useIsFetching({
    predicate: (query) => !query.state.dataUpdatedAt,
  });

  React.useEffect(() => {
    if (isFetching > 0) {
      NProgress.start();
    } else {
      NProgress.done();
    }
  }, [isFetching]);

  return null;
}
