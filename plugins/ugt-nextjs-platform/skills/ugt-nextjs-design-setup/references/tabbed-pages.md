# Tabbed pages — where the primary action goes

Decided 2026-10-16 (maintainer).

One primary action per tab, in the page header — it swaps with the active tab;
a tab that creates nothing shows none (not a disabled button). Page-wide actions
(export all) stay constant as `soft`, left of the primary. Tab state is `?tab=`,
so the Server Component page picks the button and a refresh/shared link keeps it.

```tsx
// app/(app)/leave-settings/page.tsx — Server Component
const TAB_ACTION = {
  types: { href: '/leave-settings/types/new', label: 'เพิ่มประเภทลา' },
  holidays: { href: '/leave-settings/holidays/new', label: 'เพิ่มวันหยุด' },
  rules: null, // creates nothing → no primary button
} as const;

export default async function Page({ searchParams }: Readonly<{ searchParams: Promise<{ tab?: string }> }>) {
  const { tab = 'types' } = await searchParams;
  const action = TAB_ACTION[tab as keyof typeof TAB_ACTION] ?? null;
  return (
    <PageShell>
      <PageHeader title="ตั้งค่าการลา" description="…">
        <PageActions>
          <Button variant="soft" size="cta">ส่งออกทั้งหมด</Button>
          {action && (
            <Button size="cta" render={<Link href={action.href} />}>
              <Plus />
              {action.label}
            </Button>
          )}
        </PageActions>
      </PageHeader>
      <SettingsTabs value={tab} /> {/* client: Tabs whose onValueChange → router.replace('?tab=…') */}
    </PageShell>
  );
}
```

Mobile: `PageActions` stacks full-width `cta` under the title, above the tab
list. The DataTable toolbar inside each tab keeps search / filters / tools only.
