# Dashboard pattern — the third sanctioned page pattern

Decided 2026-10-16 (มติ D12, platform `docs/backlog.md` §14) — layout lifted from
`ugt-hrms` (`components/dashboard/dashboard-view.tsx`, `components/leave/leave-dashboard.tsx`);
none of its HR content. Contract: `ugt-core` `contracts/design.md` §Layout "dashboard" ·
DESIGN.md §3. A dashboard is a page whose job is "what needs my attention" — numbers and
short lists that each lead somewhere. A page whose job is one table is a **data page**, even
with a row of StatCards on top.

## Anatomy — top to bottom, nothing else

| # | zone | built from | rules |
| --- | --- | --- | --- |
| 1 | header | `PageShell` › `PageHeader` (`PageEyebrow` · `PageTitle` · `PageDescription`) + `PageActions` | the usual page header — one primary action at most (often none) |
| 2 | hero banner | a `div` with token gradient | the **only** place a gradient is allowed, ≤ 1 per page — see §Hero |
| 3 | stat row | `StatCard` × 2–4 (×8 max, in rows of 4) on a bare grid | `grid grid-cols-2 gap-3 lg:grid-cols-4` · **never inside a `Card`** (stacked shadows) |
| 4 | panel rows | `Card` + `CardHeading` per panel | `grid gap-3 lg:grid-cols-N` · spans add up to N · cards `h-full` → equal height per row |

Spacing between zones comes from `PageShell` (`gap-6`) — no `mt-*` per zone; inside a zone the
grid gap is `gap-3`.

## Stat row

- One number per card: `label` (what) · `value` (formatted via `lib/format` — `formatNumber`,
  never `toLocaleString` inline) · `icon` + `tone` · optionally `delta` (vs the previous period,
  `direction` up/down/flat; pass `tone` when "up" is bad) **or** `hint` (one muted line —
  threshold, breakdown) — keep one kind per row so the cards line up.
- **Every dashboard card leads somewhere**: `href` → the page that explains the number. A
  card with nowhere to go is a hint on another card, not a card.
- `onClick` + `active` (filter cards) belong to **data pages**, where the cards filter the
  table under them (click again = clear). A dashboard card never filters in place.
- Tone by meaning: pending = `warning` · done = `success` · problem = `danger` · plain
  count = `info` · one highlighted card = `primary` · per-category counts = the category's
  `cat-N` (same colour as its group dot / chart series). Never a tone for decoration.
- Mobile keeps 2 columns (`grid-cols-2`) — a 1-column stat row is four screens of scrolling
  for four numbers. 3 cards → `grid-cols-3` on every width (labels short) or `sm:grid-cols-3`.
- Loading: `value="—"` (or a `Skeleton`) inside the real card — never a different card shape.

## Panel rows

- Each panel = `Card` whose first child is `CardHeading` (icon + title + `action` slot for a
  "ดูทั้งหมด →" link or a `ViewToggle`) — `ui/card-heading` (pairs with the `card.tsx` edit).
- Grid: `lg:grid-cols-3` (2 + 1) or `lg:grid-cols-5` (3 + 2) — wide panel = list/table/chart,
  narrow = short list/summary. Each cell `min-w-0` (a long row or chart otherwise blows out the
  column) · each card `h-full` so the row ends level.
- A panel whose data is empty keeps its card and shows `ui/empty` — the grid does not reflow
  around missing panels. A panel the **viewer may not see** (permission) is not rendered, and
  its sibling spans the full row (`lg:col-span-N`) instead of leaving a hole.
- A table inside a panel goes through `DataTable` — and then it is the card itself (no
  `Card` + `CardHeading` around it, `datatable.md`).
- Below `lg` every row is one column, in source order — put the panel people act on first.

## Hero

The contract's dashboard opens with it: a greeting/summary strip (who · today · one line of
"what's waiting"). A dashboard without one — e.g. a management view where the stat row already
says everything — is fine, but write the choice into DESIGN.md §10 once for the app, not per page.

- Gradient from tokens only: `bg-linear-to-br from-primary to-primary/70 text-primary-foreground`
  — no hex, no second hue (contract §Color "Gradient"). Text on it passes AA; chips on it use
  `bg-primary-foreground/15 border-primary-foreground/25`.
- Server-computed content (greeting by time of day, "today" date): compute on the server in
  `Asia/Bangkok` and pass it down — never `useEffect` + `setState` (lint
  `react-hooks/set-state-in-effect`) and never `new Date()` during client render (hydration
  mismatch #418).

## Data

- One query/loader per dashboard, shaped for the page (a summary endpoint) — not N table
  endpoints stitched in the client.
- With React Query, gate content on `isPending`, not `isFetching` — the org default
  (`staleTime: 0`, refetch on focus) would otherwise flash the whole page to a spinner on every
  tab refocus.

## Example

```tsx
// app/(app)/page.tsx — Server Component; data shaped by one summary loader
export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const s = await getDashboardSummary();
  return (
    <PageShell>
      <PageHeader>
        <PageHeaderText>
          <PageTitle>{t('title')}</PageTitle>
          <PageDescription>{t('subtitle')}</PageDescription>
        </PageHeaderText>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard href="/requests?status=pending" label={t('pending')} value={formatNumber(s.pending)}
          icon={Hourglass} tone="warning" hint={t('pendingHint', { oldest: s.oldestDays })} />
        <StatCard href="/requests?status=approved" label={t('approved')} value={formatNumber(s.approved)}
          icon={CircleCheck} tone="success"
          delta={{ text: formatSigned(s.approvedDiff), note: t('vsLastMonth'), direction: s.approvedDir }} />
        <StatCard href="/requests?status=rejected" label={t('rejected')} value={formatNumber(s.rejected)}
          icon={CircleX} tone="danger" />
        <StatCard href="/projects" label={t('projects')} value={formatNumber(s.projects)} icon={FolderKanban} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Card className="h-full">
            <CardHeading icon={Inbox} title={t('queueTitle')}
              action={<Link href="/requests" className="text-xs font-medium text-primary hover:underline">{t('viewAll')} →</Link>} />
            <CardContent><RecentRequests items={s.recent} /></CardContent>
          </Card>
        </div>
        <Card className="h-full">
          <CardHeading icon={ChartColumn} title={t('trendTitle')} />
          <CardContent><TrendChart data={s.trend} /></CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
```

`formatSigned` is the project's own wrapper over `formatNumber` (`+3` / `-2` / `0`) — the kit
formatter has no signed variant.

## Don't

- A `Card` around the stat row, or a StatCard inside a panel card (stacked shadows).
- Hand-built number tiles (`div` + big text + coloured dot) — `StatCard` is the one tile.
- Charts or tables placed straight on the page background — every panel is a card.
- A page-wide filter row above the panels. A period picker (`PeriodNavigator`) sits inside the
  card it scopes — `toolbarFilters` of that card's DataTable or the `CardHeading` action (hrms
  leave/OT dashboards). Needing several filters means the page is a report — data pattern
  (`datatable.md`).
