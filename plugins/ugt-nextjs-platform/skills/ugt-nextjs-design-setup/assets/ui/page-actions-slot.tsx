'use client';
// kit: ugt-nextjs-platform 4.88.0 · ugt-nextjs-design-setup/ui/page-actions-slot.tsx
// kit-hash: 92725557d57d
// source: ugt-hrms components/ui/page-actions-slot.tsx — installed by ugt-nextjs-design-setup (org UI kit)
// มติ ugt-hrms DESIGN §10 2026-11-04 · references/tabbed-pages.md (option B)
import * as React from 'react';
import { createPortal } from 'react-dom';

import { PageActions } from '@/components/ui/page-shell';

type SlotState = { node: HTMLDivElement | null; setNode: (node: HTMLDivElement | null) => void };

const SlotContext = React.createContext<SlotState | null>(null);

/**
 * The primary button of a tabbed page lives in the page header and swaps with the tab
 * (`tabbed-pages.md`) — but when that button opens a dialog whose state sits in the TAB's
 * table, the page can't render it. The table renders it instead, through `PageActionsPortal`,
 * into the `PageActionsSlot` in the header. Base UI `TabsPanel` unmounts inactive tabs
 * (`keepMounted` defaults to false — never set it on these panels), so the header holds only
 * the open tab's button with no state lifted up; a tab that creates nothing leaves the slot
 * empty and hidden.
 *
 * ```tsx
 * <PageActionsSlotProvider>
 *   <PageHeader>
 *     <PageHeaderText>…</PageHeaderText>
 *     <PageActionsSlot />
 *   </PageHeader>
 *   <SettingsTabs />          // TabsContent → <TypesTable /> renders <PageActionsPortal><Button size="cta">…
 * </PageActionsSlotProvider>
 * ```
 *
 * Known cost: the button appears after hydration (a portal needs the DOM node) — on phones
 * the header grows by one `cta` row once, on load.
 */
export function PageActionsSlotProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);
  const value = React.useMemo(() => ({ node, setNode }), [node]);
  return <SlotContext value={value}>{children}</SlotContext>;
}

/** In `PageHeader` instead of `PageActions` — empty = hidden (takes no row on phones). */
export function PageActionsSlot() {
  const ctx = React.useContext(SlotContext);
  return <PageActions ref={ctx?.setNode} className="empty:hidden" />;
}

/** Renders `children` into the page header's `PageActionsSlot` (nothing outside a provider). */
export function PageActionsPortal({ children }: Readonly<{ children: React.ReactNode }>) {
  const node = React.useContext(SlotContext)?.node;
  return node ? createPortal(children, node) : null;
}
