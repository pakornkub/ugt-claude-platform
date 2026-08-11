'use client';

// source: ugt-hrms components/ui/query-progress.tsx — installed by
// ugt-nextjs-design-setup · ต้องอยู่ใต้ <QueryProvider> · dep: nprogress
//
// แถบ progress บาง ๆ บนหัวจอตอน query โหลดครั้งแรก — เฉพาะ query ที่ยังไม่เคยมี
// ข้อมูล (initial load) เท่านั้น การ refetch เบื้องหลังจงใจไม่โชว์ ไม่งั้นแถบ
// กะพริบทุกครั้งที่ invalidate หลังบันทึก
//
// nprogress ไม่มี CSS ในตัว — วางบล็อกนี้ลง app/globals.css (ใช้ theme token):
//
//   #nprogress { pointer-events: none; }
//   #nprogress .bar {
//     position: fixed; z-index: 1031; top: 0; left: 0;
//     width: 100%; height: 2px;
//     background: var(--primary);
//     transition: width 0.2s ease-out;
//   }
//   #nprogress .peg {
//     position: absolute; right: 0; display: block;
//     width: 100px; height: 100%;
//     box-shadow: 0 0 10px var(--primary), 0 0 5px var(--primary);
//     opacity: 1; transform: rotate(3deg) translate(0, -4px);
//   }

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
