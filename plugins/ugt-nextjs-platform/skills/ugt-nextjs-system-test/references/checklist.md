# System test checklist — kit core

One list for both modes. Keep only the sections whose module the project
installed (the `ugt:start` block in `CLAUDE.md` and the files under
`.claude/rules/ugt-nextjs-*.md` say which). Then add every line of the
project's own `docs/project-context/system-test.md`.

Each line is checked in the running app — browser pane, network panel,
console, DB through the app's own pages — never by reading code. Result per
line: **PASS** (with what you saw) · **FAIL** (with what you saw + where) ·
**BLOCKED** (could not be tested here + why). A line marked *(container)* or
*(live)* runs only in that mode.

## Every project

- [ ] The app answers at `<url><basePath>`; `/api/health` returns 200
- [ ] No console error and no failed request (4xx/5xx) on the first page
- [ ] Static files load under the basePath: logo, fonts, CSS, `_next/*` — no 404 and no HTML served as JS
- [ ] DEV environment: the DEV bar shows and the tab title starts with `[DEV]` (design module)
- [ ] Every menu item in the shell opens a page that renders without an error boundary

## Database

- [ ] *(container)* `migrate` finished with exit 0 — `docker compose … logs migrate` shows every migration applied (and the seed, if the project has one)
- [ ] A screen that lists data shows the seeded/created rows (proves pages read SQL Server, not a leftover store)
- [ ] Create → edit → delete one record through the UI; each step is visible after a reload
- [ ] Thai text round-trips: save a Thai value, reload, it reads back unchanged and sorts in Thai order

## Auth (SSO)

- [ ] A protected URL while logged out redirects to the login page (under the basePath)
- [ ] SSO button → Keycloak → back to the app logged in; the redirect URI in the Keycloak request carries the basePath
- [ ] First login on an empty DB lands on `/admin/setup`; one click → Administrator
- [ ] A second user logs in and waits without a role (no data pages, the no-role notice; mail module: the admins get the no-role mail)
- [ ] Admin gives that user a role → after reload the user sees exactly that role's menu and pages
- [ ] A page/action the role lacks is refused (403 page or redirect — not a crash, not silent success) — try one by URL
- [ ] Every role the project defines is tried once (container: one smoke user per role · live: the user's accounts, or the project's "view as" when it has one)
- [ ] Each privileged action above wrote an audit row — `/admin/audit-logs` shows who, what, when
- [ ] Logout clears the session: Back / a protected URL goes to login again
- [ ] *(live)* The user did every Keycloak login themselves; you never typed a password

## Mail (if installed)

- [ ] An action that sends mail sends it: *(container)* it arrives in Mailpit (`http://localhost:8125`) · *(live)* dev-mode redirect sends it to the tester, not the real recipient
- [ ] Subject, body and links render (Thai included); links carry the basePath
- [ ] SMTP down does not break the action: it completes, the failure is logged (container: `docker compose … stop mailpit`, try, `start mailpit`)

## Upload (if installed)

- [ ] Attach an allowed file → it lists on the record → download returns the same bytes
- [ ] A file over the size limit is refused with a readable message (not a 413 page / hang)
- [ ] A forbidden type (`.html`, `.svg`, `.exe`) is refused
- [ ] The download URL opened as a user without access returns 403/404, not the file
- [ ] Deleting the record (or the attachment) removes it from the list and the download stops working

## CI / deploy (if installed)

- [ ] *(container)* The image built from the project's `Dockerfile` started and became healthy — proves the standalone build and the runner stage
- [ ] Cron routes: `/api/cron/<job>` without `CRON_SECRET` → 401; with it → 200
- [ ] *(live)* The deployed dev URL is the one Jenkins deployed (build number / deployment id), not a local server
