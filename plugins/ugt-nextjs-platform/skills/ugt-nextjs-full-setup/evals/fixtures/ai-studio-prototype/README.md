# request-tracker (fixture)

> **Runner rule: delete this README from the copy before the skill under test
> runs.** It names every trait and the skill that must react — leaving it in
> place hands the model the answer key, which is exactly the "prompt tells the
> situation" flaw these evals exist to remove.

Eval fixture — a Next.js App Router project in the shape Google AI Studio /
v0 exports actually arrive in (field report 2026-09-09). Used by
`ugt-nextjs-full-setup` eval 4–5, `ugt-nextjs-design-setup` eval 8,
`ugt-nextjs-database-setup` eval 4 and `ugt-nextjs-auth-setup` sidebar-evals.

What it deliberately contains — every item is something a setup run must
detect and handle, not overwrite:

| Trait | Where | The skill that must react |
| --- | --- | --- |
| A real UI with its own shell (`<aside>` nav, header, Sarabun font, teal brand `#0f766e`, 44px controls, 12px radius) | `app/layout.tsx`, `app/globals.css` | design-setup preserve mode: scan → rebase tokens → keep this shell |
| Tailwind **v3** (`tailwind.config.js` + `@tailwind base`) | `tailwind.config.js`, `app/globals.css` | design-setup Step 3.2: upgrade to v4 before shadcn init |
| Prototype data layer: `better-sqlite3` over `data/app.db`, seeded from `data/seed.json` | `services/requests.ts` | database-setup §4b: migrate behind the same exported names |
| Fake login: constant credentials, `token` in localStorage, `mockUser` context | `app/login/page.tsx`, `lib/auth-context.tsx` | auth-setup §5.7: remove, keep the routes |
| Raw `<table>` + hardcoded hex status pills | `app/requests/page.tsx` | design-setup Deviations (grandfather or migrate) |

`data/app.db` is an empty placeholder — the code creates the table on first
run. Nothing here is installed; the fixture is copied into a temp dir by the
eval runner and the skill under test runs against that copy.
