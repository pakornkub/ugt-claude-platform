# UI rendering — what the browser actually draws

Four traps where the code looks right and the screen is wrong. None throws an
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
