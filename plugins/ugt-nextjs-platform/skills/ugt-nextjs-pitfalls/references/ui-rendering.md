# UI rendering — what the browser actually draws

Six traps where the code looks right and the screen is wrong. None throws an
exception except §4, and that one only in the console.

## 1. Thai text inside `font-mono` renders garbled

**Symptom** — a label like "รวม 08:30" in a mono cell shows Thai with broken
spacing, misplaced vowels/tone marks, or a different-looking font next to the
digits ("ตัวไทยเพี้ยน"). Latin and digits look fine.

**Cause** — monospace fonts (the `font-mono` stack) have no Thai glyphs. The
browser falls back per character to some system Thai font that was never
metric-matched to the mono font, and the mono advance width does not fit Thai
combining marks.

**Fix** — keep the label in the UI font; wrap **only** the digits/codes:

```tsx
// ❌ <span className="font-mono">รวม {hhmm}</span>
<span>
  รวม <span className="font-mono tabular-nums">{hhmm}</span>
</span>
```

For columns of numbers that only need to line up, `tabular-nums` on the UI
font is usually enough — no `font-mono` at all.

**How to check** — `verify.mjs` warns on `font-mono` with Thai text on the same
line (THAI-MONO). A translated label (`{t('total')}`) inside a mono element is
not greppable: search `font-mono` and read what each one wraps.

## 2. `flex-1` from the caller squeezes a control's height

**Symptom** — the same kit control (search input, combobox/date trigger,
`Button variant="field"`) is visibly shorter on one page than on the others
("ช่องเตี้ยกว่าหน้าอื่น", e.g. 22px instead of the variant's `h-7` = 28px), even
though the rendered class list still contains `h-7`.

**Cause** — the page passed a flex class (`flex-1`, `sm:flex-1`, `basis-*`)
through `className` while the parent is a **column** (`flex-col`, or still
`flex-col` at that breakpoint). `flex-1` = `flex: 1 1 0%`: in a column the
main axis is vertical, so `flex-basis: 0%` replaces `height` and the box shrinks
to its content height. In a row the same class only touches width — which is
why it looks harmless when written.

**Fix** — don't pass size/flex overrides into a kit control: call it exactly
as the other pages do. Full width in a column = `w-full` (cross axis), never
`flex-1`. If it must grow in a row at `sm:`, the parent must become a row at the
same breakpoint (`flex-col sm:flex-row` + `sm:flex-1`) — or add `flex-none` /
`shrink-0` where height must stay fixed.

**How to check** — "same component, different size across pages" → diff the
`className` each caller passes first. Measure, don't eyeball: in DevTools run
`getComputedStyle($0).height` on both pages (or compare the Computed panel
`height` vs `flex-basis`).

## 3. A replaced file in `public/` keeps showing the old version

**Symptom** — an image (logo, login background, PDF template) was replaced in
`public/` under the **same file name** and deployed; the file on the server is
new, but users — or you — still see the old one. A hard reload sometimes fixes
it for one browser only.

**Cause** — every cache between the file and the user keys on the URL, and the
URL didn't change. Next.js itself serves `public/` with `max-age=0`
(revalidate), but anything that adds a lifetime keeps the old bytes until it
expires: a reverse-proxy/CDN rule for image extensions, a `headers()` entry in
`next.config`, the browser cache those set, and `next/image`'s optimizer cache
(`.next/cache/images`, keyed by the source URL). Next.js can't fingerprint
files in `public/` — only imported assets get a content hash.

**Fix** (pick one)

- Import the asset instead of referencing `public/` (any folder outside
  `public/`): `import hero from '@/assets/login-hero.webp'` →
  `<Image src={hero} … />`.
  Next emits `/_next/static/media/login-hero.<hash>.webp` — a new hash on
  every content change, cached safely forever.
- Must stay in `public/` (a URL other systems link to, a file served raw) →
  **new file name** per content change (`login-hero-v2.webp`), update every
  reference, delete the old file. A `?v=2` query works for the browser but
  some proxies ignore query strings.

**How to check** — DevTools → Network → the image row: `(disk cache)` /
`304` with the old size means a cache served it. `curl -I <url>` from outside
and compare `Content-Length` / `Last-Modified` / `ETag` with the new file. Before
deploy: `git diff --stat -- public/` showing a **modified** binary (not
added/deleted) is the warning sign.

## 4. React #418 on every page load on phones — a hook read the window during render

**Symptom** — console `Minified React error #418` (dev: "Hydration failed
because the server rendered HTML didn't match the client") on every navigation
when the viewport is narrow; wide screens are clean. React throws the server
HTML away and re-renders the whole root — a flash and lost scroll on each page.

**Cause** — a hook (typically `useIsMobile`) answers from the browser during
the first render:

```ts
// ❌ server: guard → false (desktop tree) · phone hydration: true (Sheet tree)
//    (without the guard the server throws ReferenceError instead)
const [isMobile] = React.useState(
  () => typeof window !== 'undefined' && window.innerWidth < 768,
);
```

The server renders one tree, the phone's hydration pass renders another. Same
class of bug: `matchMedia`, `localStorage`/`sessionStorage`, `navigator.*`, or
`typeof window !== 'undefined' ? … : …` deciding what to render.

**Fix** — the first client render must equal the server render, then update:

```ts
// hooks/use-mobile.ts
const QUERY = '(max-width: 767px)';
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};
export function useIsMobile() {
  // 3rd arg = server snapshot, also used while hydrating → no mismatch
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
```

The shadcn registry `use-mobile` (state starts `undefined`, read in an effect,
returns `!!isMobile`) is equally safe — keep it. When only the **look**
differs (spacing, columns, hidden text), use CSS breakpoints (`md:hidden`,
`max-md:*`) instead of a hook — no JS, no flash. Use the hook only when the
component tree differs (Popover vs Sheet — kit `ResponsivePopover`).

**How to check** — `verify.mjs` flags `useState(() => …window/matchMedia/
localStorage…)` initializers (WINDOW-IN-RENDER). Reproduce with a production
build at two widths (< 768 and ≥ 768): the error only at one width means a
viewport-dependent render; on **every** page it lives in the app shell
(sidebar/header), not in the page.

## 5. A link to `/page#section` lands at the top — the route has `loading.tsx`

**Symptom.** A link from another page (a search result, notification or menu) to
`/docs/leave#s-7-4` changes the URL to include the hash, but the page stays at
the top while the section is far below ("กดลิงก์แล้วไม่เลื่อนไปหัวข้อ"). A link to the
same hash *within* the page scrolls fine.

**Root cause.** On a client-side navigation Next scrolls to the hash once,
while the route's `loading.tsx` skeleton is still on screen. The element with
that id does not exist yet, and Next does not retry when the real content
streams in. Same-page anchors work because the element is already there. When
the scroll container is a layout `div` rather than `window`, the browser's own
hash jump does not help either.

**Fix.** On mount, scroll once from a client component of the destination page,
by which time the content has rendered:

```tsx
'use client';
// a link from another page to `/…#id`: Next scrolled while loading.tsx was up
React.useEffect(() => {
  let id: string;
  try {
    id = decodeURIComponent(globalThis.location.hash.slice(1));
  } catch {
    return; // malformed %-escape in a hand-edited URL — no scroll, no crash
  }
  if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
}, []);
```

`decodeURIComponent` is needed for non-ASCII ids, and throws `URIError` on a
malformed hash such as `#%E0` — hence the `try`. Dropping `loading.tsx` also
fixes the problem, but then every slow load shows no skeleton.

**How to check.** Navigate from another page and measure the target
(`document.getElementById(id).getBoundingClientRect().top` ≈ 0). A correct URL
does not prove that the page scrolled.

**Origin.** ugt-hrms (RT-067) · 2026-11-02

## 6. The error screen ("เกิดข้อผิดพลาด") renders in a system font — `global-error.tsx` has no fonts or CSS

**Symptom.** After a crash the app shows the root error screen ("เกิดข้อผิดพลาด /
ลองใหม่") in the browser's fallback font, not Inter / Noto Sans Thai, and
without the app's tokens (colors, `antialiased`) — it looks like a different site.

**Root cause.** `app/global-error.tsx` **replaces the root layout's `<html>`
entirely**, so it gets neither the `next/font` CSS-variable classes from
`app/layout.tsx` nor, unless it imports it, `globals.css`. Which crashes land
there is easy to misjudge: an error thrown by a **client component inside a
route-group layout** (sidebar, `NavUser`, header in `(app)/layout.tsx`) is
outside that group's `error.tsx` — an error boundary catches only what renders
*below* it — so it falls through to `global-error`.

**Fix.** Put the font loaders in one module, import it from both files, and
import `globals.css` in `global-error.tsx`:

```ts
// app/font-variables.ts — the only place the fonts are created
import { Inter, Noto_Sans_Thai, Geist_Mono } from 'next/font/google'; // or next/font/local
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-sans-thai' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
export const fontVariables = `${inter.variable} ${notoSansThai.variable} ${geistMono.variable}`;
```

```tsx
// app/layout.tsx:        <html lang="th" className={fontVariables}>
// app/global-error.tsx:
'use client';
import { fontVariables } from './font-variables';
import './globals.css';
// …<html lang="th" className={fontVariables}><body className="antialiased">…</body></html>
```

Keep `global-error` free of providers and next-intl hooks (the provider stack
is not mounted there) — plain markup, hard-coded text. Do not create the fonts
twice: two `next/font` calls produce two hashed class names and two font downloads.

**How to check.** Throw from a client component in the group layout (temporarily
in `NavUser`) and open the error screen — the font must match the app. The most
common real trigger is a tab left open across a deploy; the deploy half of that
is `ugt-nextjs-cicd-setup` `version-skew.md` (`deploymentId`) — this entry only
fixes how the error screen looks.

**Origin.** ugt-hrms (RT-085) · 2026-11-19
