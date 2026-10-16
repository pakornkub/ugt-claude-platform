# Asset map — where each asset goes and what it needs

The per-asset table for SKILL.md §5.2 (copy the `assets/` tree onto the
project root, then handle the exceptions below) plus the shadcn caveats behind
the §5.1 install commands.

## Asset → destination

| Asset | Destination | Note |
| --- | --- | --- |
| `assets/prisma/schema-auth.prisma` | paste INTO `prisma/schema.prisma` | not a whole-file copy — see SKILL.md §5.3 |
| `assets/env.example` | fill section **3. Auth** of `.env.example` + `.env.local` in place (canonical layout — never append at the bottom) | drop vars for unselected methods · basePath goes in section 1 `NEXT_PUBLIC_BASE_PATH` · compose already exists → uncomment its `[AUTH]` + `[AUTH: <method>]` lines |
| `assets/rules/ugt-nextjs-auth.md` | `.claude/rules/ugt-nextjs-auth.md` | whole-file overwritable on plugin update |
| `assets/components/nav-user.tsx` | `components/nav-user.tsx` | needs `avatar`, `badge`, `dialog`, `dropdown-menu`, `sidebar` from shadcn + `ui/truncated-text` and `lib/avatar.ts` (initials + `--cat-*` colour, kit ≥ 4.80.0) from the design kit |
| `assets/lib/audit-actions.ts` | `lib/audit-actions.ts` | every project — the only place an `ActivityLogs.action` string may be written; every shipped action imports `AUDIT_ACTIONS` from here (`audit-logging.md`) |
| `assets/lib/ldap.ts` | `lib/ldap.ts` | copy only when LDAP selected |
| `assets/lib/directory.ts` | `lib/directory.ts` | only when a central employee view exists — substitute the four-part view name + column map; skipping it means deleting the directory columns from the schema too (SKILL.md §3 Q6) |
| `assets/lib/scope.ts` + `assets/lib/scope.test.ts` | `lib/…` | row-level data scope (read-all → own → team). Needs `lib/directory.ts` for the management chain |
| `assets/lib/approval-chain.ts` | `lib/approval-chain.ts` | only when the app has an approval workflow — substitute `__HR_AUTHORIZE_VIEW__` (a **different** view from the employee one) |
| `assets/lib/password-policy.ts` · `assets/lib/actions/password.ts` | `lib/…` | Local only — the policy file is the single source for length/complexity, shared by reset · change · admin-create |
| `assets/components/change-password-dialog.tsx` | `components/…` | Local only; opened from NavUser, hidden for SSO/LDAP accounts |
| `assets/components/session-expired-dialog.tsx` | `components/…` | every project — receiver for the `session-expired` event (mid-page 401) that `query-provider` and `lib/auth-client.ts` dispatch; undismissable AlertDialog, single button → `/login?reason=session_expired&from=<path>` (return-to-page — SKILL.md §5.5). Mount in the protected layout — SKILL.md §5.5 step 2 |
| `assets/components/admin-user-actions.tsx` | `components/…` | Local only — the "เพิ่มผู้ใช้ local" dialog on `/admin/users` + admin set-password; **no sign-up page, and no AD pre-registration** (SSO/AD accounts appear on first login — มติ 2026-08-11; roles can be *pre-assigned*, below) |
| `assets/lib/org-email.ts` + `.test.ts` | `lib/…` | SSO/LDAP — `ORG_EMAIL_DOMAINS` canonical domain, `isOrgEmail` (Local refusal), `orgEmailVariants` (clash lookups) |
| `assets/lib/after-login.ts` | `lib/after-login.ts` | SSO/LDAP — called from both login paths; `[DIRECTORY]` applies a pre-assigned role, `[MAIL]` mails admins once about a user with no role (delete the `[MAIL]` lines until mail-setup is installed) |
| `assets/components/login-shell.tsx` | `components/login-shell.tsx` | every project — login page: fixed dark hero panel (left column from `lg`, full-screen backdrop behind a glass form card on phones, slow Ken Burns), **no copy inside**: the page passes `hero` built from the project's `app` catalog; optional `public/login-hero.webp` (`login-page.md`) · needs `public/brand/ube-logo-long.svg` (design kit) |
| `assets/components/admin-users-tabs.tsx` | `components/…` | every project — the three `/admin/users` tabs keep state in `?tab=` (DESIGN.md tab rule) |
| `assets/lib/admin-badges.ts` | `lib/admin-badges.ts` | every project — menu badge counts (`{ [href]: n }`) for `<AdminNav badges>` or a merged sidebar (§5.6) |
| `assets/lib/actions/admin-preassign.ts` · `assets/components/preassign-manager.tsx` | `lib/actions/…` · `components/…` | `[DIRECTORY]` only — tab "ตั้งล่วงหน้า (รอเข้าระบบ)" on `/admin/users`: search the HR view, pick, pick a role; DataTable **client mode** (`org-identity.md`) |
| `assets/components/users-table.tsx` | `components/users-table.tsx` | client half of `/admin/users` (tabs ทั้งหมด + ยังไม่มีบทบาท, one `tableId` each) — DataTable **client mode**; the password column is `[METHOD: LOCAL]` (delete it with the other local sections) |
| `assets/components/audit-logs-table.tsx` | `components/audit-logs-table.tsx` | client half of `/admin/audit-logs` — DataTable **server mode**: toolbar filters (ชื่อผู้ใช้ / ช่วงวันที่ / action) push `q`/`from`/`to`/`action` to the URL, DataTable pushes `page`/`pageSize`/`sort`/`dir` itself; needs the design kit (SKILL.md §4) |
| `assets/lib/permission-group-select.ts` | `lib/permission-group-select.ts` | pure helpers behind the checklist's group select-all (tri-state + counts) — from HRMS มติ 13.3 |
| `assets/scripts/create-first-user.ts` | `scripts/…` | Local only, run once — see SKILL.md §5.5 |
| `assets/components/forgot-password-dialog.tsx` · `assets/components/reset-password-form.tsx` | `components/…` | Local **and** mail-setup only — skip both when there is no mail |

## shadcn caveats

These go with the `npx shadcn@latest add …` lines in SKILL.md §5.1.

> **After `add sidebar`, re-check `components/ui/button.tsx` and `input.tsx`
> against DESIGN.md §4's control scale.** The `sidebar` block's own `add`
> can revert a project's rebased
> scale (preserve mode's §Scale bridge) back to the registry default —
> `git diff` those two files immediately after the `add` command and re-apply the
> rebase if it reverted. This is a shadcn CLI behavior, not something this
> skill controls, so no flag fixes it — the check is the fix.

> `TooltipProvider` must already wrap the root layout (design-setup step 3, `references/root-layout.md` §Provider stack
> installs it) — mira's Tooltip does not self-wrap a provider, and IconAction
> in the admin tables crashes prerender without it.

> **No shadcn yet?** Never run a plain `npx shadcn@latest init` — it installs
> the default (Radix) style while every kit asset targets **base-mira
> (Base UI)**: components render but menu items silently do nothing. The org
> preset init lives in design-setup §Step 3 (`references/shadcn-init.md`) — run that skill first (SKILL.md §4
> requires it anyway). With it installed, the §5.1 `add` lines are mostly
> no-ops — keep them for projects that trimmed the base set.
