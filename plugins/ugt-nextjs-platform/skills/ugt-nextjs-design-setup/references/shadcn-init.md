# shadcn init + token merge — the full detail behind SKILL.md Step 3.2

Contents: §Tailwind first (existing projects) · §Init command (org preset) ·
§After init · §Windows short path · §Token merge (globals.css + radius)

shadcn init if none yet — **the org preset (canonical, มติ 2026-08-04;
verified: produces `base-mira` + `lucide` + `rtl:false` +
menu default/solid/subtle + neutral)**.

## Tailwind first (existing projects)

**Existing-project branch only — check for Tailwind first.** `shadcn init`
requires Tailwind already configured; it does not install it. The
`--template next` branch below gets it for free (create-next-app's
default), but a project that arrived here via the documented
database → design → auth order has no Tailwind yet — `ugt-nextjs-database-setup`
never touches CSS. No `tailwindcss` in `package.json` and no
`@import "tailwindcss"` in any CSS file → install it before running init,
or `shadcn init` fails outright with "No Tailwind CSS configuration found":

```bash
npm install -D tailwindcss @tailwindcss/postcss postcss
```

```js
// postcss.config.mjs
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

A bare `app/globals.css` containing just `@import "tailwindcss";` is
enough — §Token merge below replaces its token blocks anyway.

**Tailwind v3 present** (`tailwind.config.{js,ts}` + `@tailwind base;` —
the usual shape of AI Studio / v0 exports): upgrade to v4 **before** init
(`npx @tailwindcss/upgrade`, then check the result). The kit's token file
is v4-only — `@theme inline`, `@custom-variant dark`, `@utility
scroll-thin` — merged into a v3 project it parses as noise: no color,
radius or font ever reaches a utility class and everything the kit
renders (including the auth admin pages) comes out unstyled or
misaligned. `scripts/verify.mjs` fails on any `@tailwind base` directive
or a `tailwindcss` major below 4.

## Init command (org preset)

```bash
# โปรเจคใหม่ล้วน — scaffolds the Next app too (no separate create-next-app):
printf '<project-name>\n' | npx shadcn@latest init --preset b1ZzrZbs0 --template next --pointer --yes
# โปรเจคเดิมที่มี Next.js แล้ว:
npx shadcn@latest init --preset b1ZzrZbs0 --pointer --yes
```

(a custom preset code from the shadcn configurator: mira family on
**Base UI** — a deliberate มติ 2026-08-04 superseding the earlier
radix-mira choice — single-repo, no RTL, pointer on buttons. **Do NOT
pass `-b radix`**: it would flip the style to `radix-mira` and the kit
is Base UI now. The `printf` pipe answers `--template next`'s
project-name prompt, which `--yes` does not cover. Fallback if the code
ever stops resolving: `npx shadcn@latest init --preset mira` — there is
NO `--style base-mira` flag.)

## After init

Rename `package.json`'s `"name"` (the template writes
`next-app`) to the project slug. **Keep the `cn` npm package the preset
adds** — the registry's `lib/utils.ts` and every `components/ui/*` file
import `{ cn } from 'cn'`; it only *looks* stray. An installer removed it
as unrelated and the build survived by accident
(hoisted through the `shadcn` package) — `npm ci` on Jenkins would not.

Then **run the gate instead of eyeballing it**: `node <skill-dir>/scripts/verify.mjs` fails on any `components.json`
that is not `style: base-mira` · `iconLibrary: lucide` · `rtl: false` ·
`baseColor: neutral`, and separately fails on any Radix that reached the
project — a `radix-ui`/`@radix-ui/*` dependency, a missing
`@base-ui/react`, or a source file using `asChild` / `onSelect` on a menu
item / `checked="indeterminate"` / `delayDuration`. Both checks are
re-runnable at any time, so a wrong init cannot survive close-out. (mira
presets can default to `hugeicons` — fix and uninstall any `@hugeicons/*`
deps; `menuColor: "default"` is expected but not gated.) If the org preset
ever writes a different `style` string than `base-mira`, update
`scripts/verify.mjs`'s expectation in the same change — never leave the two
disagreeing.

If the init dies mid-install (postinstall spawn errors happen in
sandboxes) it can leave a scaffold **without `components.json`** — run
`npm install`, then re-run the init in existing-project mode (no
`--template`).

## Windows short path

**Windows: work from a short path as the primary flow, not a fallback**
— deep paths (~>180 chars) break BOTH the shadcn CLI (misleading
`ERR_PACKAGE_IMPORT_NOT_DEFINED` chalk error) AND `next build`
(Turbopack filesystem MAX_PATH; junctions don't help). Scaffold, run
every CLI/build step at a short real path, then move the project. Never
a `subst` drive (realpath guard misfires).

## Token merge (globals.css + radius)

Merge `assets/globals.tokens.css` into `app/globals.css` (replace the
`:root`/`.dark` token blocks; keep any project/preset `@layer` rules —
e.g. the preset's button `cursor: pointer` — and keep preset `@theme`
vars: re-point `--font-heading` at the font-sans variables).

**Radius is ours now (มติ 2026-10-16 TK-RAD — replaces มติ 2026-08-09
"radius is the preset's")** — the token file declares `--radius: 0.75rem` in
`:root` and a **fixed** scale in `@theme` (sm 4 · md 6 · lg 7.2 = card, the
kit's old value kept on purpose · xl 14). When merging, **replace** the
preset's `--radius: 0.45rem` line and its `@theme` scale
(`--radius-sm/md/lg/xl/2xl/3xl/4xl` as `calc()` of `--radius`) — do not keep
both: the preset's `calc()` lines next to our `0.75rem` make every corner
×1.67 (cards 12px), and `scripts/verify.mjs` fails on exactly that pair.
Dropping both leaves no radius at all (everything square) — verify fails
there too.

Substitute `__PRIMARY__`/`__PRIMARY_DARK__` from interview answers, and
`__RING_DARK__` from `__PRIMARY_DARK__` (same hue, L +0.07, C −0.04 — the
dark focus ring sits one step lighter than the dark primary so it shows
around a focused primary button; default `oklch(0.62 0.17 264.4)`). The
light ring still equals `__PRIMARY__`.
