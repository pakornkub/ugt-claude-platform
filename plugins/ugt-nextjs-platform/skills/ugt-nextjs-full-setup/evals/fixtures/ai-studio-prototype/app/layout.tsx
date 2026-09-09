import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

const sarabun = Sarabun({ subsets: ['thai', 'latin'], weight: ['400', '600'] });

export const metadata: Metadata = { title: 'Request Tracker' };

const NAV = [
  { href: '/', label: 'แดชบอร์ด' },
  { href: '/requests', label: 'คำขอ' },
  { href: '/reports', label: 'รายงาน' },
  { href: '/settings', label: 'ตั้งค่า' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={sarabun.className}>
        <AuthProvider>
          <div className="flex min-h-screen">
            <aside className="w-60 bg-brand text-white flex flex-col">
              <div className="h-16 flex items-center px-6 text-lg font-semibold">Request Tracker</div>
              <nav className="flex-1 px-3 space-y-1">
                {NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="block rounded-app px-3 py-3 hover:bg-brand-dark">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>
            <div className="flex-1 flex flex-col">
              <header className="h-16 bg-white border-b flex items-center justify-between px-8">
                <span className="text-sm text-slate-500">ระบบติดตามคำขอ</span>
                <span className="text-sm">สมชาย ใจดี</span>
              </header>
              <main className="p-8">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
