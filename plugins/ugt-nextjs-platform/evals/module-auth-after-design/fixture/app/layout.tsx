import type { Metadata } from 'next';
import { Geist_Mono, Inter, Noto_Sans_Thai } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DevEnvironmentBar } from '@/components/dev-environment-bar';
import { QueryProvider } from '@/components/query-provider';
import { QueryProgress } from '@/components/ui/query-progress';
import { isDevEnvironment } from '@/lib/environment';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-sans-thai' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

// prod กับ dev อยู่ host เดียวกัน ต่างกันแค่ basePath — แท็บต้องบอกได้ว่าอันไหน
// prefix ไม่ใช่ suffix: แท็บแคบตัดท้ายทิ้ง
const DEV_PREFIX = isDevEnvironment() ? '[DEV] ' : '';

export const metadata: Metadata = {
  title: {
    template: `${DEV_PREFIX}%s · ระบบคำขอลา`,
    default: `${DEV_PREFIX}ระบบคำขอลา`,
  },
  description: 'ระบบคำขอลาของบริษัท',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${notoSansThai.variable} ${geistMono.variable}`}
    >
      <body>
        {/* NextIntlClientProvider นอกสุดเสมอ — provider อื่นและ children ทุกตัวต้องอยู่
            ข้างใน ไม่งั้น useTranslations ของ kit โยน error ตอน render */}
        <NextIntlClientProvider>
          {/* แถบ DEV เป็นลูกคนแรก อยู่เหนือ shell ทั้งหมด — ครอบคลุมหน้า login
              ที่อยู่นอก shell ด้วย · ไม่ sticky โดยตั้งใจ */}
          {isDevEnvironment() && <DevEnvironmentBar />}
          <QueryProvider>
            <QueryProgress />
            {/* TooltipProvider บังคับ — Tooltip ของ base-mira ไม่ห่อ provider ให้เอง
                sidebar tooltip จะพัง prerender ถ้าไม่มี · delay 0 ตามข้อตกลง */}
            <TooltipProvider delay={0}>
              {children}
              <Toaster richColors />
            </TooltipProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
