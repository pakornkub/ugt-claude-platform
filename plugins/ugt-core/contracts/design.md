# Contract — UI design standard (stack-agnostic)

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-design-setup` (primary) and `ugt-nextjs-full-setup` (summary). Bump
> ugt-core's `plugin.json` version and CHANGELOG when you do. Generated
> project `DESIGN.md` files record the ugt-core version they were generated
> against; the design skill's "sync" mode diffs a project against this file.
>
> Evidence base: extracted 2026-08-04 from two production projects (`ugt-hrms`,
> `gov-boi-smart`). Rules below marked *converged* were reached independently
> by both — often after paying for the wrong answer first.

## Iron rules (every project, no exceptions)

1. **Component-library-first** — one UI component library per stack platform;
   never hand-build a component the library already provides. Escalation
   order: library primitive → library block/template → composition of
   primitives → utility-class-only custom. No raw CSS / CSS-in-JS / inline
   styles except truly dynamic values; the global stylesheet accepts only
   design tokens and patterns inexpressible in utilities.
2. **One icon set** per stack platform — never emoji in UI, never a second
   icon library. Same action = same icon on every page (the stack platform
   ships the mapping).
3. **Sizes are the library default** — no per-callsite height/font-size
   overrides. Sanctioned exceptions are enumerated in the project's
   `DESIGN.md`, nowhere else.
4. **Data grids go through the platform's central table component** — no
   hand-rolled tables in pages. Data paginated on the server must also sort
   and filter on the server (URL-addressable state); client-side sorting of a
   partial dataset silently lies to the user. *(converged — both projects
   hit this)*
5. **Dates and numbers render through the central formatter only** — no
   inline date/number formatting. *(converged — both projects shipped
   timezone-shift bugs before centralizing)*
6. **Accessibility floor**: state is never color-alone (color + icon always) ·
   icon-only buttons carry a label (tooltip + assistive text) · focus rings
   are never disabled · all motion is silent under `prefers-reduced-motion` ·
   token pairs pass WCAG AA contrast ≥ 4.5:1, re-verified on every change.
7. **The project's `DESIGN.md` is the design source of truth** — where code
   and document disagree, the document wins. Beautification tools and skills
   may propose, never override.

## Org defaults (a project may deviate only by recorded decision)

### Color

- **Primary**: indigo `oklch(0.488 0.243 264.4)` — chromatic color is
  reserved for interactive elements (primary buttons, links, focus, selected
  state). Dark-mode primary is lighter than light-mode.
- **Neutrals**: cool tint, hue ~258, chroma 0.004–0.02 — never chroma-0 gray.
- **Elevation** comes from surface lightness (background < card < popover);
  dark-mode borders ≥ 16% white or they vanish on real monitors.
- **Semantic status set — exactly six** (each with a `-foreground` pair):

  | token | meaning |
  | --- | --- |
  | `status-amber` | pending / warning |
  | `status-emerald` | success / approved |
  | `status-red` | rejected / error / destructive |
  | `status-coral` | cancellation requested / half-way states |
  | `status-sky` | informational / system-generated (**not** interactive — that is primary's job) |
  | `status-gray` | cancelled / draft / disabled |

  Status UI pairs tone + icon (iron rule 6). Plain labels/counts stay
  colorless.

### Typography

- **Inter (latin) + Noto Sans Thai** — *(converged; one project detoured
  through Sarabun and reverted)*. Monospace: Geist Mono.
- Weights 400/500; 600 for page titles only. Base font size 16px, never
  overridden at the root.
- **Thai text is never uppercased/letter-spaced for "eyebrow" effect** — Thai
  has no case and tracking floats vowel marks; use sentence case + weight.
- Tables set their text size at the table primitive, once — never per cell.
  Numeric cells right-aligned, tabular figures.

### Dates, numbers, files

- On screen: **`DD/MM/YYYY`, Gregorian (ค.ศ.) always** — *(converged; one
  project held a dated decision explicitly abolishing พ.ศ.)*. Append `HH:MM`
  only when the value carries time.
- Timezone contract: wall-clock dates (SQL `date`) are read as UTC parts —
  never through a local `Date` — so containers in UTC don't shift the day;
  real instants display in Asia/Bangkok.
- **Exported files (Excel/CSV) use ISO `yyyy-MM-dd`** — deliberately a
  different standard from the screen: `DD/MM` makes Excel swap day/month
  by recipient locale.
- Numbers: thousands separators; decimals preserved as stored — rounding a
  regulatory figure changes it. Empty shows `-`, not `0`.

### Layout

- Shell is a per-project choice (sidebar / topbar) made once in `DESIGN.md`;
  either way: menu items are icon + label; group when > ~7 items; max depth
  2; permission-hidden (not disabled — server guard is the boundary, per
  `auth.md`); overflow scrolls horizontally, never wraps.
- One page pattern per app: title + actions + content card — no per-page
  invention. Mobile adaptation is systematic (table→card, dialog→bottom
  sheet), not per-page.

### Motion

Four rules: (1) if removing the animation loses nothing, don't add it ·
(2) CSS first; an animation library only for layout/enter-exit animation ·
(3) 150–250 ms ease-out, travel ≤ 12px · (4) every point silent under
`prefers-reduced-motion`.

### Feedback

- Toast semantics: success = actually succeeded · error = actually failed ·
  warning = succeeded with caveats · info = neutral. Never error-styled
  warnings.
- Destructive / hard-to-undo actions always confirm through a blocking
  dialog, with a text button (not icon-only).
- Loading: skeleton for structure, in-button spinner for actions. Empty
  states are a designed component (icon + message + CTA when actionable),
  never a bare blank.

## Governance

- Every generated `DESIGN.md` ends with a **dated decision log** (มติ);
  deviations from this contract are recorded there with a reason — silent
  deviation is a defect.
- Open design questions live in a per-project pending-decisions doc with an
  interim behavior per question, so unanswered questions never block work.
- Existing projects adopt via scan → draft agreement → confirmed deviations
  table (migrate or grandfather, each recorded).
