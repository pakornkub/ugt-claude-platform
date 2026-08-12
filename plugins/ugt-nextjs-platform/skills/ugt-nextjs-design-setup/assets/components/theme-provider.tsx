// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/components/theme-provider.tsx
// kit-hash: 1c0e0e371780
// source: standard next-themes wrapper — installed by ugt-nextjs-design-setup (org UI kit)
// ship คู่กับ theme-toggle.tsx เมื่อ dark mode = มี · ใช้ครอบใน app/layout.tsx
// (attribute="class" ให้ตรงกับ @custom-variant dark ใน globals.css)
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
