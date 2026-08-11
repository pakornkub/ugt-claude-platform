# Data Fetching — React Query × Server Actions, basePath, envelope

**Architecture context (why these rules exist):** the org's standard for
interactive tables/lists is **TanStack React Query on the client**, fed by
Server Actions or API routes — not pure RSC re-rendering. That choice is what
makes the first two sections non-obvious: Next.js server-cache tools and the
client cache are two separate worlds, and only you connect them.

The client half is installed by `ugt-nextjs-design-setup`: **one**
`QueryProvider` in the root layout (staleTime 0 · retry 1 · 401 →
`session-expired` event) — never `new QueryClient` in a page, a second cache
is invisible to every `invalidateQueries` from the first. queryFns that fetch
throw `HttpError` (from `lib/http-error.ts`) so a mid-session 401 routes to
re-login instead of surfacing as an ordinary error toast.

## 1. `revalidatePath` does not touch React Query

`revalidatePath`/`revalidateTag` invalidate the **server-side** RSC/fetch cache
only. Data rendered from a React Query cache stays stale until its `staleTime`
expires (observed: a submitted request invisible for 30 minutes).

```ts
// in the client submit handler, before navigating:
await queryClient.invalidateQueries({ queryKey: ['employee-monitor'] }); // prefix
router.push(backUrl);
```

- A mutation whose result is shown via React Query MUST call
  `invalidateQueries` (or `setQueryData`) — with or without `revalidatePath`.
- Invalidate with the **prefix** key to catch every sub-query (list + counts +
  detail) and to survive stale `useCallback` closures that captured old
  year/month state.
- Long `staleTime` is the amplifier: without explicit invalidation, the stale
  window is exactly that long.

## 2. Filters that change the dataset must re-fetch

A year/month (or any) filter that changes **which rows exist** — not just how
they're displayed — must be part of the query key and re-fetch server-side:

```ts
useQuery({ queryKey: ['leave-approval', year, month], queryFn: () => getForApprovalAction(year, month) });
```

A client-side filter over data the server already scoped shows an empty list
for every other period, forever. Companion rule: a **badge/count query and its
list query must share one where-builder** (hoist the scope condition into a
`lib/services/*-scope.ts` helper both call) — a badge counting all months over
a list showing one month reads as "my items disappeared".

## 3. Stable identities — the infinite-loop anatomy

`DataTable`-style components re-notify selection via an effect depending on
`[rowSelection, data]`. If `data` is computed fresh every render
(`[...rows].sort()`, `.filter()`, `.map()` inline), its identity changes every
render → effect fires → parent `setState` with a new array → re-render → loop.
React cuts it at an arbitrary commit, so the error ("Maximum update depth
exceeded") points at an innocent child — often a Radix `SelectItemText`.

- Wrap every derived array passed as a prop (or used in effect deps) in
  `useMemo` with correct deps.
- **React Compiler does not save you here**: TanStack Table components carry
  `'use no memo'`, which turns the compiler off for that file — manual memo is
  required exactly where these tables live.
- Any selectable table whose data can swap while mounted needs `getRowId`
  (real id) — TanStack keys selection by row **index** by default, so after a
  data swap the same indexes point at different records.
- The bug reproduces with **zero rows** — don't hunt it in the data; open the
  page and read the console.

## 4. basePath — client fetches need the prefix

Org apps deploy under a basePath (`/<app>`) behind a shared domain. `next/link`
and `redirect()` are basePath-aware; **client `fetch` is not**:

```ts
import { env } from '@/lib/env';
fetch(`${env.NEXT_PUBLIC_BASE_PATH}/api/some-endpoint`); // ✅
fetch('/api/some-endpoint');                             // ❌ 404 in every deployed env
```

`NEXT_PUBLIC_BASE_PATH` is `''` in local dev, so the bare path **works locally
and breaks only after deploy** — which is why this keeps coming back. The
prefix is always safe to add. (Server-side auth/proxy URL rules live in
`ugt-nextjs-auth-setup`.)

## 5. API envelope — the org contract

Every API route returns one of exactly two shapes, properties in camelCase:

```ts
return NextResponse.json({ success: true, data: {…}, pagination: {…} });
return NextResponse.json(
  { success: false, error: { code: 'UNAUTHORIZED', message: '…' } },
  { status: 401 },
);
```

No bare payloads, no 200-with-error-message. Client side: check `response.ok`
**before** `.json()` so a 500 surfaces as an error state instead of a
misparsed empty result.
