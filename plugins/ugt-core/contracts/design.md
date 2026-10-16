# Contract — UI design standard (stack-agnostic)

> **Maintenance:** editing this file? `grep` the stack platforms for restated
> text and update it too — currently `ugt-nextjs-platform`'s
> `ugt-nextjs-design-setup` (primary) and `ugt-nextjs-full-setup` (summary). Bump
> the relevant plugin's `plugin.json` version and CHANGELOG when you do —
> ugt-core when the contract text changes, the stack platform when its restated
> copy changes. Generated
> project `DESIGN.md` files record the ugt-core version they were generated
> against; the design skill's "sync" mode diffs a project against this file.
>
> Evidence base: extracted 2026-08-04 from two production projects (`ugt-hrms`,
> `gov-boi-smart`). Rules below marked *converged* were reached independently
> by both — often after paying for the wrong answer first. Rules marked
> *(hrms 2026-10-16)* were lifted from `ugt-hrms`'s later redesign by
> maintainer decision (35 items, platform `docs/backlog.md` §14) — one
> project's evidence, adopted on purpose.

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
   `DESIGN.md`, nowhere else (the org-wide ones it inherits: §Controls).
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
- **Neutrals**: cool tint, hue ~258, chroma 0.004–0.02 — never chroma-0 gray
  (white is a surface, not a gray). One sanctioned tilt: the light page
  background sits on the org indigo's hue — `oklch(0.976 0.006 264.5)`,
  #f5f7fb — so white cards read as lifted. *(hrms 2026-10-16)*
- **Elevation**: light mode = cool-gray page · **white cards with one hairline
  shadow + 1px ring** (`shadow-xs ring-1`) · **white sidebar** separated by
  its border. Shadows never stack (no shadowed card inside a shadowed card).
  Dark mode = surface lightness (background < card < popover); dark borders
  ≥ 16% white or they vanish on real monitors. Why: a white card on a
  near-white page differed by ~2% lightness and read as flat. *(hrms
  2026-10-16)*
- **Semantic status set — seven** (each with a `-foreground` pair):

  | token | meaning |
  | --- | --- |
  | `status-amber` | pending / warning |
  | `status-emerald` | success / approved |
  | `status-red` | rejected / error / destructive |
  | `status-coral` | cancellation requested / half-way states |
  | `status-violet` | one state family the project names in its `DESIGN.md` — for a family that would otherwise borrow a neighbour (hrms: on leave — coral sat too close to amber) |
  | `status-sky` | informational / system-generated (**not** interactive — that is primary's job) |
  | `status-gray` | cancelled / draft / disabled |

  Status UI pairs tone + icon (iron rule 6). Plain labels/counts stay
  colorless.
- **Categorical palette** `--cat-1..8` — eight hues, white text ≥ 4.5:1 on
  each, one value for both modes. For identity and grouping only: avatar
  color hashed from a stable id, category markers, chart series beyond the
  five `--chart-*` shades. **Decorative — never a status** (that is
  `status-*` + icon) **and never interactive meaning** (that is primary).
  *(hrms 2026-10-16)*
- **Gradient**: flat by default; a gradient is allowed **only on a hero /
  welcome banner** (at most one per page, built from tokens, text on it
  passes AA through a scrim) — never on cards, buttons, tables or as
  decoration elsewhere. *(hrms 2026-10-16)*

### Typography

- **Inter (latin) + Noto Sans Thai** — *(converged; one project detoured
  through Sarabun and reverted)*. Monospace: Geist Mono.
- Weights 400/500; 600 for headings only (page · card · dialog · section) and KPI
  numbers — never body text *(hrms 2026-10-16)*. Base font size 16px, never
  overridden at the root.
- **Thai text is never uppercased/letter-spaced for "eyebrow" effect** — Thai
  has no case and tracking floats vowel marks; use sentence case + weight.
- Tables set their text size at the table primitive, once — never per cell:
  12px, stepping to 14px from the 2xl breakpoint (≥ 1536px) — the one
  sanctioned breakpoint step for text; head and body move together.
  Numeric cells right-aligned, tabular figures. *(step: hrms 2026-10-16)*

### Controls

- **One toolbar row = one control size** — the density default for every
  button/select in the row; the smaller size is for dense panels only,
  never mixed into a row of defaults. *(hrms 2026-10-16)*
- **Primary-action size (`cta`)** — the one sanctioned size bump: 44px on
  phones (touch target), 36px from `sm` up, 14px text — **only** for the
  page's primary action, the form action bar, and dialog footers. Toolbars
  and table rows stay default. Why: 44px is the phone touch-target size; the
  dense 28px default suits toolbars, not the one action a page exists for.
  *(hrms 2026-10-16)*
- **Decisions**: approve = **solid green** `success` (+ check icon) ·
  ordinary save / submit / create = primary · reject = outline in
  destructive red (+ X icon) · confirm-destructive = **solid** red · `soft`
  (primary tint, primary/25 border) = the secondary action beside a page's
  primary. Why green for approve: it is the decision's positive outcome, kept
  distinct from the page's ordinary primary save so an approver never reads
  "approve" as "save". *(D6: hrms 2026-10-16, approve colour amended by
  maintainer the same day)*

### Dates, numbers, files

- On screen: **`DD/MM/YYYY`, Gregorian (ค.ศ.) always** — *(converged; one
  project held a dated decision explicitly abolishing พ.ศ.)*. Append `HH:MM`
  only when the value carries time.
- Timezone contract: wall-clock dates (SQL `date`) are read as UTC parts —
  never through a local `Date` — so containers in UTC don't shift the day;
  real instants display in Asia/Bangkok. The one local `Date` that exists —
  the calendar cell a user just clicked — is keyed by its LOCAL parts (UTC
  parts would shift it a day) and still goes through the formatter module.
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
- **Page width**: content caps at **96rem (1536px), centred**; the top bar
  stays full width. Why: on wide monitors lines and tables stretched past
  reading width (1536, not 1280/1440 — these apps are data-dense). *(hrms
  2026-10-16)*
- Three sanctioned page patterns per app — no per-page invention:
  - **data page** — title + actions + content card;
  - **form page** — single column up to the page cap, **one card per
    section** (card heading), fields flowing side by side when wide; a
    back-link to the parent page above the title; the action bar at the end,
    right-aligned, in the `cta` size. *(hrms 2026-10-16 — replaces the
    earlier "centred container, no wrapping card": with white cards on a
    gray page an uncarded form floats on the background)*;
  - **dashboard** — hero banner (the one place a gradient is allowed) → a
    row of stat cards (2 columns → 4) → content cards with card headings,
    equal height per row. *(hrms 2026-10-16)*
- **Form container ladder** — chosen by the job, not by field count alone:
  full page = multi-step core work or anything that needs a calendar ·
  **Sheet** = editing one master/settings record with ≥ 4 fields (two widths
  only: a plain form, or wide when it holds a sub-table) · **Dialog** = ≤ 3
  fields finished in one go (a reason prompt) · **AlertDialog** = confirm
  only, no fields. A form whose list grows with data is never a fixed-height
  dialog. *(hrms 2026-10-16)*
- **Mobile adaptation is systematic, not per-page**: a data table becomes a
  list of rows **inside one card** (rows divided by hairlines — never a card
  per row on the gray page); toolbar rows go full width; popovers and dialogs
  become bottom sheets. *(list-in-one-card: hrms 2026-10-16)*
- **Page-level filters have one fixed home**: inside the same card as the
  data they filter, leading edge, ordered widest scope → narrowest (period →
  org unit → status). Page actions stay with the title; a filter row never
  hosts an action button, and free-text search belongs to the table
  primitive's own toolbar — never duplicated beside it. *(Added after
  page-to-page drift — left on one screen, right on the next — was reported
  as the most visible consistency failure in a real project.)*
- **Per-page config of a shared primitive is part of the agreement, not a
  free choice**: a data-table instance always carries a stable unique id so
  user column preferences persist identically on every screen, standard
  features stay on unless the page's own situation makes one meaningless,
  and page size follows the org set. Same situation → same configuration.
- **Pagination control set is fixed**: rows-per-page selector · a
  "page X of Y" indicator · first/previous/next/last icon buttons (first and
  last may hide on small screens). **No numbered page list** — it costs width
  and misreports on empty data. Changing this is an org-level decision, not a
  per-project one.
- **Icon buttons inside a data table share one size** — the density default,
  never a per-callsite override. A hardcoded size on one row (pagination) and
  the default on another (toolbar) is a visible inconsistency inside a single
  table; it happened once and is now called out here.

### Motion

The component library's built-in motion is the baseline — add a point only when
removing it would lose something, CSS first, 150–250 ms ease-out, travel
≤ 12px, silent under `prefers-reduced-motion` (iron rule 6) — enforced once,
globally, in the stylesheet (one reduced-motion block covering every CSS
animation and transition); JS-driven animation checks the preference itself.
*(global block: hrms 2026-10-16)*

### Feedback

Use the library's own toast / dialog / skeleton / spinner / empty-state
components; the only org rule on top is honest semantics — success = actually
succeeded · error = actually failed · warning = succeeded with caveats · info =
neutral, and destructive actions confirm through a blocking dialog.

## Governance

- Every generated `DESIGN.md` ends with a **dated decision log** (มติ);
  deviations from this contract are recorded there with a reason — silent
  deviation is a defect.
- Open design questions live in a per-project pending-decisions doc with an
  interim behavior per question, so unanswered questions never block work.
- Existing projects adopt via scan → draft agreement → confirmed deviations
  table (migrate or grandfather, each recorded).
