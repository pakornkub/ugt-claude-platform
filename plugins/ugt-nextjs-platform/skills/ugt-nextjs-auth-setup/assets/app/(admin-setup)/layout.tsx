// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/app/(admin-setup)/layout.tsx
// kit-hash: eed839cb1647
// app/(admin-setup)/layout.tsx — auth required (any authenticated user, no permission
// needed yet — permissions do not exist before bootstrap).
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export default async function AdminSetupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return <>{children}</>;
}
