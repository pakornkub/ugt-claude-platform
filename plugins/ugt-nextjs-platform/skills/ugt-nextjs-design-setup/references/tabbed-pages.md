# Tabbed pages — where the primary action goes

Decided 2026-10-16 (maintainer).

One primary action per tab, in the page header — it swaps with the active tab;
a tab that creates nothing shows none (not a disabled button). Page-wide actions
(export all) stay constant as `soft`, left of the primary. Tab state is `?tab=`,
so the Server Component page picks the button and a refresh/shared link keeps it.

## A. The button navigates (default)

The page knows every tab's action — a `Link` to a create page — so the Server
Component picks it from `?tab=`:

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
            <Button size="cta" nativeButton={false} render={<Link href={action.href} />}>
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

## B. The button opens a dialog owned by the tab's table — `ui/page-actions-slot`

Create-in-a-Sheet/Dialog keeps its `open` state (and the edit row) in the tab's
table component. Lifting that state to the page only to draw the button couples
every tab to the page. Instead the table renders its own button **into the
header** through a portal (ugt-hrms มติ 2026-11-04):

```tsx
// page.tsx — Server Component
<PageShell>
  <PageActionsSlotProvider>
    <PageHeader>
      <PageHeaderText>…</PageHeaderText>
      <PageActionsSlot /> {/* replaces <PageActions> — empty = hidden */}
    </PageHeader>
    <OtSettingsTabs /> {/* client: Tabs on ?tab=, one TabsContent per table */}
  </PageActionsSlotProvider>
</PageShell>

// ot-types-table.tsx — client, owns the Sheet
const [open, setOpen] = React.useState(false);
…
{canCreate && (
  <PageActionsPortal>
    <Button size="cta" onClick={() => setOpen(true)}>
      <Plus />
      {t('createOtType')}
    </Button>
  </PageActionsPortal>
)}
<Sheet open={open} onOpenChange={setOpen}>…</Sheet>
```

It swaps by itself: Base UI `TabsPanel` unmounts inactive tabs (`keepMounted`
defaults to false — **never set it on these panels**, or every tab's button
shows at once). A tab with nothing to create renders no portal → the slot stays
empty and `empty:hidden`. B assumes the tab's button is the only header action —
a page that also needs a constant page-wide `soft` action stays on A. Cost accepted: the button appears after hydration, so on
phones the header grows one `cta` row once on load.

Use A when the button is a link; B only when it opens tab-owned state.

Mobile (both): `PageActions` stacks full-width `cta` under the title, above the tab
list. The DataTable toolbar inside each tab keeps search / filters / tools only.
