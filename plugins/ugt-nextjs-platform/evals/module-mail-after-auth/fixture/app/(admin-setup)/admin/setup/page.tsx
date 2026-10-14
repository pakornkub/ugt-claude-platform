// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-auth-setup/app/(admin-setup)/admin/setup/page.tsx
// kit-hash: 051875638946
// app/(admin-setup)/admin/setup/page.tsx — first-admin bootstrap page.
import { redirect } from 'next/navigation';
import { isAdminInitialized } from '@/lib/get-user-permissions';
import { AdminSetupForm } from '@/components/admin-setup-form';

export default async function AdminSetupPage() {
  // If admin already set up, skip this page
  const ready = await isAdminInitialized();
  if (ready) redirect('/admin/users');

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <AdminSetupForm />
    </div>
  );
}
