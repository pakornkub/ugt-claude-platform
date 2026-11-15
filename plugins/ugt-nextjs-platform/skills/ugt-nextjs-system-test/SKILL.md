---
name: ugt-nextjs-system-test
description: >
  Test the whole running system of an org Next.js project — login, roles,
  data, mail, upload, deploy — against one checklist, then report before fixing
  anything. Two modes: `container` (a throwaway copy of the org stack in Docker:
  SQL Server Thai_CI_AS, Keycloak with test users, Mailpit, the app built from
  the project's own Dockerfile) and `live` (the real DEV database, Keycloak and
  SMTP once the admin team has returned the values in `docs/admin-handoff.md`).
  Use when `ugt-nextjs-full-setup` closes and the user picks "ทดสอบใน container",
  or when the user says "admin ทำเสร็จแล้ว", "admin ส่งค่ากลับมาแล้ว", "ทดสอบระบบ",
  "ทดสอบทั้งระบบ", "smoke test", "เช็คว่าใช้งานได้จริงไหม", "ลองระบบบน dev",
  "ก่อน merge ขอเทสทั้งระบบ". Not for writing unit tests (normal feature work),
  not for a red pipeline (→ ugt-nextjs-cicd-setup), never for production.
---

# UGT System Test — the whole system, one checklist, report before fixing

## 1. Why this exists

Setup skills verify files (`verify.mjs`); nothing proved the system works
until someone clicked through it. Doing that ad hoc goes wrong in predictable
ways: the agent improvises a database on whatever the machine has, tests
against values that are still `CHANGE_ME`, edits `.env.local` to make a test
pass, or "fixes" what it finds before anyone saw the result. This skill fixes
the path: two modes, one checklist, gates that stop instead of improvising.

| Mode | When | Runs against |
| --- | --- | --- |
| `container` | right after setup, before the admin team answers — needs Docker | `docker-compose.smoke.yml`: SQL Server, Keycloak realm `smoke`, Mailpit, the app from the project's `Dockerfile` |
| `live` | after the user confirms the admin work is done | the deployed DEV URL (or a local dev server) on the real dev DB + Keycloak + SMTP |

The harness already launches and drives apps — use it, don't build one:
`preview_start` + `.claude/launch.json` (or the built-in `run` skill) to open
the app, the harness browser (built-in browser pane; Claude in Chrome when the
user asks for it) to click through, read console and network. No browser
tool in this session → the `webapp-testing` skill (Playwright) if installed,
otherwise say so and stop — never claim a UI line you could not see.

## 2. Gates — stop instead of improvising

1. **Ask before testing.** Called from full-setup's close-out, the user's
   answer to its one question is the go-ahead. Called directly, ask one
   question unless the user's words already pick the mode ("admin เสร็จแล้ว" =
   live): `ทดสอบใน container ตอนนี้ (ต้องมี Docker)` / `ทดสอบกับระบบจริงบน dev`.
2. **Don't survey the machine.** Container mode checks exactly one thing:
   `docker info`. Not available → say "ต้องติดตั้ง Docker Desktop (หรือ Rancher
   Desktop / Podman) ก่อน แล้วเรียก `/ugt-nextjs-system-test` อีกครั้ง" and stop.
   No LocalDB, no local SQL Server, no TCP proxy, no in-memory stand-in.
3. **DEV only.** Live mode refuses a prod basePath and a local/stand-in DB
   (`env-ready.mjs` fails on both); a database name without "dev" is only a
   warning there — ask the user before going on, never guess.
4. **Never touch `.env.local`.** Container mode does not read it (all its
   values are test constants in the compose file). Live mode reads it through
   `env-ready.mjs` only — a ✘ there is the user's to fix, never yours.
5. **The user does every real login.** Live mode: the user types their own
   Keycloak credentials in the browser pane; you continue once they say
   they are in. Never type, ask for, or store a real password. Container mode
   uses the realm's smoke users (test values from the project's own
   `smoke/realm-smoke.json`).
6. **Report before fixing.** Every result goes to the user first (§6). Fix
   only what they pick; a fix is ordinary project work under CLAUDE.md's
   routing, then re-run the lines it touched.
7. **No destructive step on shared systems.** Live mode creates test records
   with an obvious name (`[TEST] …`) and deletes them through the UI at the
   end; never run `migrate reset`, `db push`, raw DELETE/TRUNCATE, or a seed
   that overwrites, against the dev DB.

## 3. Container mode

### 3.0 Docker first — before any file is written

Run `docker info`. It fails or `docker` is not found → gate 2: give the
install line and stop. Nothing below runs, nothing is copied into the project.

### 3.1 Install the smoke assets (once per project)

Copy from this skill's `assets/` into the project, substituting
`__PROJECT_NAME__` / `__BASE_PATH_DEV__` from the `ugt:start` block in
`CLAUDE.md` (or `.env.example` / `next.config.ts`):

| Asset | Destination |
| --- | --- |
| `docker-compose.smoke.yml` | project root |
| `smoke/realm-smoke.json` | `smoke/realm-smoke.json` |
| `launch.smoke.json` | merge its `smoke` configuration into `.claude/launch.json` |
| `system-test.template.md` | `docs/project-context/system-test.md` — only if missing (§5) |

Then fit the compose file to the project — the asset is the kit-wide shape:

- **Modules**: delete the lines tagged with a module the project did not
  install (`[MAIL]` + the `mailpit` service, `[UPLOAD]` + the `storage`
  volume, `[DB]` + `sqlserver`/`db-init`/`migrate`, `[AUTH: SSO]` +
  `keycloak` + `realm-smoke.json`). Login methods other than SSO (LDAP/Local)
  have no smoke stand-in: mark their checklist lines BLOCKED.
- **Project env**: every key in section 6 of `docker-compose.dev.yml`'s
  `environment:` gets a line in the smoke `app` service with a harmless test
  value (an external API key → empty, so the feature's fallback path runs).
- **Seed**: no seed configured → drop `&& npx prisma db seed` from `migrate`.

These files hold only test constants — they can be committed (tell the user;
commit only when asked).

### 3.2 Bring it up

```bash
docker compose -f docker-compose.smoke.yml up -d --build
```

Run it in the background (the first build takes minutes). A port already
taken (3100 / 8180 / 8125) → report which and stop; the ports are tied to the
realm's redirect URIs. Ready when both answer:

- `http://localhost:3100<basePath-dev>/api/health` → 200
- `http://localhost:8180/realms/smoke/.well-known/openid-configuration` → 200

A service that exits instead → `docker compose -f docker-compose.smoke.yml logs <service>`,
report the error as the first FAIL and stop (a failed `migrate` or image build
IS a finding: the deploy would fail the same way).

### 3.3 Test

Open the `smoke` launch configuration with `preview_start`, run §5. Smoke
users (all password `Smoke-Pass-1`): `smoke-admin` logs in first and takes
`/admin/setup`; `smoke-user1..3` get one role each from the admin pages — that
assignment is itself a checklist line. Mail lands in Mailpit at
`http://localhost:8125`.

### 3.4 Tear down

After the report and any fixes the user asked for:
`docker compose -f docker-compose.smoke.yml down -v` (removes the containers
and their data — nothing outside this stack). Never leave it running without
telling the user the command.

## 4. Live mode

### 4.1 Preconditions

1. The user confirmed the admin team finished `docs/admin-handoff.md`.
2. `node <skill-dir>/scripts/env-ready.mjs` (cwd = project root) exits 0
   **and** its last line is `✔ env ready for the live test` (no output at
   all = the script did not run — treat as not ready). ✘ lines → show them, say which value goes where
   (`docs/admin-handoff.md` "ส่งกลับ" table → `.env.local`), stop.

### 4.2 Pick the target

| Target | Use when | Notes |
| --- | --- | --- |
| Deployed DEV URL (`__APP_URL_DEV__` in `docs/admin-handoff.md`) | `develop` has been deployed by Jenkins | Preferred — it is what users get; Keycloak's redirect URI already allows it; Jenkins already migrated |
| Local `npm run dev` with `.env.local` | no dev deploy yet | Works only if the Keycloak client also allows `http://localhost:<port><basePath>/api/auth/callback/keycloak` — a refused `redirect_uri` is a BLOCKED, not something to work around. Needs `npx prisma migrate deploy` on the dev DB first: ask before running it |

Open the target with `preview_start` (URL configuration, or the `dev` one for
a local server).

### 4.3 Test

Ask the user to log in with SSO in the browser pane; continue when they say
so. Run §5. Roles: the user's own account first; other roles through
accounts the user logs in with, or the project's own "view as" feature if it
has one — never by changing someone's role on the dev DB without asking.
Mail: grant the tester `dev-mode:enable` (ask first) so mail comes to them,
not to the real recipients.

## 5. The checklist

1. `references/checklist.md` — kit core, trimmed to the installed modules.
2. `docs/project-context/system-test.md` — the project's own flows. Missing →
   create it from `assets/system-test.template.md`, draft the flows from
   `docs/project-context/business-rules.md` + `board.md` (each drafted line
   marked `(draft)`), and say in the report that the user should confirm it.
3. Walk every line in the running app. Evidence = what the screen, network
   panel, console, Mailpit or `docker compose logs` showed — not what the
   code says should happen.

## 6. Report — before any fix

One table, then one question:

| # | Line | Result | What I saw |
| --- | --- | --- | --- |
| 1 | SSO login under basePath | PASS | redirect_uri `…/ugt-x-dev/api/auth/callback/keycloak` |
| 2 | Viewer cannot open /admin/users | FAIL | page rendered the user list — `app/(app)/admin/users/page.tsx` has no permission check |
| 3 | Mail on approval | BLOCKED | SMTP unreachable from this machine |

Then: totals (PASS / FAIL / BLOCKED), the mode and target, and the question
"แก้ข้อไหนก่อน" with the FAILs as options. Fix only what the user picks, re-run
those lines (container: `docker compose -f docker-compose.smoke.yml up -d --build --no-deps app`
— `--no-deps` so `migrate` and the seed don't run again; a schema change instead
needs `up -d --build migrate app`),
report again.

## 7. Close

- `.claude/state/handoff.md`: the result line under Done (date · mode ·
  PASS/FAIL/BLOCKED counts); every open FAIL/BLOCKED under Next — or tell the
  user to run `/ugt-handoff`, which writes the same homes.
- A FAIL that is true for every project on the stack (a kit bug) →
  `/ugt-contribute` after the fix, not a silent local patch.
- Live mode: delete the `[TEST]` records you created, through the UI.

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Ask the one question first | Start testing because setup just finished |
| `docker info` → missing → stop with the install line | LocalDB, a TCP proxy, an in-memory DB — any stand-in you built |
| Container values = the compose file's test constants | Read, copy or edit `.env.local` for a test |
| `env-ready.mjs` before every live run | Live-test with `CHANGE_ME` left, or on a prod basePath |
| The user types real passwords | Type, ask for or store a real credential |
| Evidence from the running app | Mark PASS from reading the code |
| Report → user picks → fix → re-run | Fix while testing |

## Verification Checklist

- [ ] The mode was chosen by the user (or by full-setup's one question)
- [ ] Container: `docker info` was the only machine check; no stand-in DB
- [ ] Live: `env-ready.mjs` exited 0 before the first page was opened
- [ ] `.env.local` was never written (no Edit/Write/shell redirect on it)
- [ ] Every checklist line has PASS / FAIL / BLOCKED with evidence
- [ ] The report went to the user before the first fix
- [ ] Container stack torn down (or the user told how); live `[TEST]` records removed
- [ ] `handoff.md` carries the result and the open items
