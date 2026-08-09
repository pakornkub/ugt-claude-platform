# Multi-Stack Proposal — extending `ugt` beyond Next.js

> **หมายเหตุ (2026-08-09)**: เอกสารนี้เป็นบันทึก ณ v2.x — เก็บไว้เป็นประวัติการตัดสินใจ ไม่แก้ย้อนหลัง
> ชื่อ skill/ไฟล์บางตัวเปลี่ยนแล้วใน v3.0 (`ugt-checkpoint`→`ugt-handoff` · `ugt-mode`→`ugt-model-mode` ·
> `ugt-nextjs-setup`→`ugt-nextjs-full-setup` · `ugt-nextjs-quality-setup`→`ugt-nextjs-test-lint-setup` ·
> `.claude/state/project-notes.md` ยุบเข้า `docs/project-context/`) — ดู CHANGELOG ของแต่ละ plugin


Status: **draft for review** · Date: 2026-07-29 · Scope: feasibility + design only —
no existing plugin is modified by this document.

This proposal covers three questions:

1. What in `ugt-nextjs-platform` v1.0.0 is genuinely stack-agnostic, and how to
   extract it into a `ugt-core` plugin without breaking existing installs.
2. What a `ugt-python-platform` would need — separated into **org decisions**
   (nothing to build until they're made) and **work items**.
3. Whether a plain React SPA (Vite, no Next.js) deserves a platform at all.

Plus an effort estimate and recommended sequencing.

---

## 1. `ugt-core` — the stack-agnostic inventory

### 1.1 What is actually stack-agnostic today

Audited against every SKILL.md, reference, asset, and hook in
`plugins/ugt-nextjs-platform`. "Agnostic" here means: *the rule would be stated
identically in a Python or SPA skill* — only the enforcement code differs.

| Contract | Lives today in | Agnostic part | Stack-specific part (stays in the stack plugin) |
| --- | --- | --- | --- |
| **DB naming + audit columns** | `ugt-nextjs-database-setup` §Org Standards + `references/naming-conventions.md` | PascalCase-plural tables, PascalCase columns, `usp_`/`fn`/`vw` prefixes, T-SQL reserved-word rule, audit column set (`Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/IsActive/IsDeleted`), soft delete, `<EXT>_` read-only rule + append-only override pattern, index/constraint shapes | Prisma `@@map`/`@map` mechanics, `prisma.config.ts` url rule, t3-env, driver-adapter gotchas, the singular auth-table exception (Better Auth's convention) |
| **Delivery pipeline** | `ugt-nextjs-cicd-setup` §2 | The 10-stage sequence, `main`/`develop` branch model, Quality Gate thresholds (`new_violations=0`, dup ≤3%, coverage ≥60%, hotspots 100%), OWASP fail/unstable thresholds, credential naming (`nvd`, `env-<project>`, `env-<project>-dev`, `sentry-dsn-<project>`), secret rules (shell expansion not Groovy, temp-file cleanup, global `NOTIFY_EMAIL`/`SMTP_FROM`), image tagging by `BUILD_NUMBER`, migrate-before-deploy, health-endpoint requirement | The Jenkinsfile itself (npm commands, `NEXT_PUBLIC_*` build-arg rule, `.next/standalone`), vitest JUnit wiring, `sonar.javascript.*` keys, the Next-specific Dockerfile/compose |
| **Jenkins/SonarQube server setup** | `references/jenkins-one-time-setup.md`, `references/sonarqube-setup.md` | Server names (`SonarQube`), webhook pair, Quality Gate creation, token policy, snap-Docker gotcha — mostly per-server, not per-stack | Tool names like `NodeJS-22` (a Python stack adds its own tool entries) |
| **Auth/identity** | `ugt-nextjs-auth-setup` §2 | One Keycloak server + central realm, **one client per project** (Client ID = project name), OIDC Authorization Code + PKCE (S256) only, session 8 h / refresh at 30 m remaining, mandatory audit events (`login.success/failed`, `logout`, `logout.sso`), RBAC shape (`user 1—0..1 role M:N permission`, keys `resource:action`, `isSystem` roles undeletable), guard order **session → permission → action → audit log**, backchannel logout | Better Auth, cookie-prefix rule, `proxy.ts`, every asset, every redirect-loop gotcha |
| **Audit logging policy** | `references/audit-logging.md` | Action naming, PDPA payload rules, retention, non-blocking rule | ActivityLogs Prisma schema, viewer API code |
| **Harness pattern** | `ugt-nextjs-setup` step 4 | The *mechanism*: CLAUDE.md block owned between `<!-- ugt:start/end -->` markers, `.claude/rules/*` with `paths:` frontmatter, `.claude/state/` create-once-never-overwrite, settings.json key-merge, `.gitignore` rules, ~200-line CLAUDE.md size check | The *content* of the block and rules files (all Next.js) |
| **`ugt-checkpoint`** | `skills/ugt-checkpoint/` | **The whole skill** — zero stack references; its name was deliberately left unqualified for exactly this move | — |
| **Audit-trail hooks** | `hooks/hooks.json` + `scripts/audit-log.mjs` | **Entirely** — metadata-only JSONL logging of tool calls; nothing in it knows about Next.js | — |
| **Knowledge triage** | README + `ugt-checkpoint` + CLAUDE-block | The 3-way triage (project notes / PR upstream / auto memory), the no-shadow-skills rule | — |
| **IT hard boundary** | `references/org-managed-settings.md` | Entirely (managed-settings is machine-level, not stack-level) | — |

Not agnostic despite looking like it: `ugt-nextjs-clean-code` (SonarQube rule IDs
are per-language — a Python stack needs its own `S`-rule catalogue),
`ugt-nextjs-quality-setup` (entirely toolchain-bound), the starter permission set
in `assets/settings.json` (the `npx prisma` ask-rules are stack-bound; the git
deny-rules are agnostic).

### 1.2 Design: what `ugt-core` contains

A locked decision constrains the design: **skills are self-contained — no
cross-plugin file references, no `${CLAUDE_PLUGIN_ROOT}` reaching into another
plugin.** So `ugt-core` cannot be a runtime library that stack skills `Read` at
install time. It splits into two roles:

**Role A — runtime pieces (installed, active):**

```
plugins/ugt-core/
├── .claude-plugin/plugin.json        # ugt-core v1.0.0
├── hooks/hooks.json                  # moved verbatim from ugt-nextjs-platform
├── scripts/audit-log.mjs             # moved verbatim
└── skills/ugt-checkpoint/            # moved verbatim (name already unqualified)
```

**Role B — normative contracts (authoring-time, not loaded into any session):**

```
└── contracts/
    ├── database.md      # naming + audit columns + read-only rule (DB-level only)
    ├── delivery.md      # 10 stages, branch model, gate thresholds, credential naming, secret rules
    ├── identity.md      # Keycloak realm/client policy, PKCE, session policy, RBAC shape, audit events
    ├── harness.md       # the marker-block / rules / state / settings-merge mechanism
    └── org-managed-settings.md   # moved from ugt-nextjs-setup/references/
```

Stack plugins **deliberately duplicate** the contract text inside their own
SKILL.md (exactly as `ugt-nextjs-*` does today), rendered in their stack's
terms. `contracts/` is the single normative source: a PR that changes a
threshold changes `ugt-core/contracts/` first, and stack plugins follow in the
same or a subsequent PR. This trades sync discipline for the self-containment
guarantee that made v1's skills reliable — the same trade v1 already made, now
with a canonical place to diff against. A cheap guard: a repo-level CI script
that greps stack SKILL.md files for the threshold values in `contracts/` and
fails on drift (the values are few and stable: `60`, `0`, `3%`, `100%`, `8h`,
`30m`, credential-ID shapes).

Rejected alternative: making stack skills read `ugt-core` files at runtime via
a dependency path — breaks the self-containment decision, couples every stack
release to core's file layout, and the plugin cache path is not a stable
contract.

### 1.3 Migration mechanics

Ordered so that no user ever loses `ugt-checkpoint` or the audit hooks:

1. **Add `ugt-core` to the repo**: new plugin dir as above + a
   `marketplace.json` entry. Content is a move, not a rewrite — `ugt-checkpoint`
   SKILL.md, hooks.json, audit-log.mjs are copied verbatim; contracts/ is
   extracted text from the existing SKILL.md Org Standards sections.
2. **`ugt-nextjs-platform` v2.0.0**: remove `skills/ugt-checkpoint/`,
   `hooks/`, `scripts/audit-log.mjs`, and
   `skills/ugt-nextjs-setup/references/org-managed-settings.md`; add to
   `plugin.json`:
   ```json
   "dependencies": ["ugt-core"]
   ```
   (same-marketplace dependency — the same mechanism `ugt-nextjs-standard`
   already uses; no `allowCrossMarketplaceDependenciesOn` change needed).
   Update `ugt-nextjs-setup` SKILL.md step-4 pointer for the IT doc, and the
   CLAUDE-block "Which skill, when" row for `/ugt-checkpoint` — the command name
   itself does not change, so **already-installed harness files in target
   projects stay valid untouched**.
3. **Major version because it's breaking**: a plugin that loses a skill and its
   hooks is not a patch. Tags per the existing convention:
   `ugt-core--v1.0.0`, `ugt-nextjs-platform--v2.0.0`,
   `ugt-nextjs-standard--v1.2.0` (bundle: no dependency change needed — it pulls
   platform, platform pulls core — but bump to record the floor).
4. **CHANGELOG entries in both plugins** stating the move and that no target
   project needs edits.

**What breaks, per install mode** (README's three modes):

| Mode | Effect of the split | Mitigation |
| --- | --- | --- |
| C. Marketplace | `/plugin update` resolves the new `ugt-core` dependency automatically; brief risk window only if someone updates platform while core is not yet published — publish core's tag **first** | Release order: core tag → platform tag → announce |
| B. Copied plugin folder | The copied `ugt-nextjs-platform` v2 no longer contains checkpoint/hooks — a re-copy silently drops them | README mode-B instructions change to "copy **both** `ugt-core` and `ugt-nextjs-platform`"; old copies (v1) keep working untouched |
| A. Copied single skill | Unaffected (skills are self-contained; `ugt-checkpoint`'s new home just changes the copy source path) | README path update |

Transient double-hook risk (old cached platform v1 + freshly installed core both
registering audit-log) is harmless: the logger appends metadata lines; a
duplicate line per event for one session until the update completes is
acceptable, and the audit script could dedupe by `session+ts+tool` later if it
ever matters.

---

## 2. `ugt-python-platform` — decisions before work

The single most important fact about v1: **every skill was extracted from a
production project** — the redirect loops, the `COPY .next/standalone` failure,
the cookie-prefix rule all cost real debugging time before they became skill
text, and the evals prove the delta (34/34 vs 18/34). There is no Python
production reference project in the org today. A Python platform written from
first principles would be documentation-shaped guesswork — exactly what v1
avoided.

**Recommendation: decisions → one pilot project built to those decisions →
extract the plugin from the pilot.** Same path v1 took.

### 2.1 Org decisions required first (no code until these are made)

Listed as decisions, not proposals — the org owns them; this doc deliberately
does not invent standards:

| # | Decision | Options on the table | What it gates |
| --- | --- | --- | --- |
| D1 | **Framework** | FastAPI (API-first, async, matches an SPA/service world) vs Django (batteries, admin, its own ORM) | Everything below — D2/D3 answers differ per framework |
| D2 | **ORM + migrations for SQL Server** | SQLAlchemy + Alembic (+ `pyodbc`/`aioodbc` driver) vs Django ORM + `mssql-django` | The database skill. Note: the **DB-level contract is already settled** by `ugt-core/contracts/database.md` — PascalCase mapping is expressible in both (`__tablename__`/`db_table`, explicit column names); only the mechanics are open |
| D3 | **Auth implementation** | Library for OIDC vs Keycloak (e.g. Authlib), session model: server-side session cookie (parity with Next.js stack) vs bearer JWT; LDAP via `ldap3`? Local passwords at all? | The auth skill. The identity **contract** (same realm, client-per-project, PKCE, 8h/30m, RBAC shape, guard order) is fixed by core; only the Python rendering is open |
| D4 | **Quality toolchain** | Lint/format: Ruff (lint+format) vs flake8+black; typing: mypy vs pyright, and is typing gated?; test: pytest + `pytest-cov` (near-certain) emitting `coverage.xml` + `--junitxml` for the same SonarQube gate; pre-commit: `pre-commit` framework vs husky-style | The quality skill + the pipeline's Code Quality stage commands |
| D5 | **Packaging + runtime** | Package manager: uv vs pip-tools vs poetry; Python version pin; server: uvicorn/gunicorn workers; Docker base image | Dockerfile + Install stage |
| D6 | **Dependency scanning** | Keep OWASP DC (it does scan Python deps, weaker signal) vs add/replace with `pip-audit` as an extra stage — thresholds should mirror core's CRITICAL/HIGH policy either way | Pipeline stage 6 |
| D7 | **Health endpoint shape** | Same contract as core (no auth, no version info, 200/503 on DB check) — decision is only the route convention (`/api/health` vs `/healthz`) | Dockerfile HEALTHCHECK + compose + deploy poll |
| D8 | **verify-script runtime** | Keep verify scripts as Node `verify.mjs` (uniform across the marketplace, Node is present wherever Claude Code runs) vs rewrite in Python per stack | Skill authoring convention. Recommendation when it's asked: keep Node — one pattern to maintain, and the target project's stack is irrelevant to a file-inspection script |

### 2.2 What the 10-stage Jenkins contract looks like (per-stage swap only)

The stage list, branch model, gate, credentials, and secret rules come from
core unchanged. Illustrative command swaps (final commands depend on D4/D5):

| Stage | Next.js today | Python equivalent (shape, not standard) |
| --- | --- | --- |
| Install | `npm ci` (+ prisma generate) | `uv sync` / `pip install` (+ migration tooling) |
| Code Quality (parallel ×3) | `lint` / `format:check` / `tsc` | ruff check / ruff format --check / mypy |
| Unit Tests | vitest → `junit.xml` + `lcov.info` | pytest → `--junitxml` + `coverage.xml` |
| Build | `next build` (standalone) | none-or-wheel (D5); Docker Build may absorb it |
| OWASP DC | as-is | as-is or + pip-audit (D6) |
| Sonar Analysis | `sonar.javascript.lcov.reportPaths` | `sonar.python.coverage.reportPaths` |
| Quality Gate | identical (server-side, language-blind) | identical |
| Docker Build / Deploy | two-image, migrate-then-deploy | same pattern; migrate = alembic/manage.py (D2) |

The equivalent of the `NEXT_PUBLIC_*` build-arg rule likely disappears (a
server-rendered Python app has no compile-time client env) — one genuine
simplification.

### 2.3 Work items (after decisions + pilot)

Mirror of the v1 skill set, minus what core now owns:

- `ugt-python-setup` (router: interview once, order Database → Quality → Auth →
  CI, install harness) — **structure copied from `ugt-nextjs-setup` nearly
  verbatim**; harness step reuses core's mechanism with Python-stack block/rules
  content
- `ugt-python-database-setup`, `ugt-python-quality-setup`,
  `ugt-python-auth-setup`, `ugt-python-cicd-setup` — same SKILL.md skeleton
  (Overview / Org Standards / Interview / Steps / Quick Rules / Verification),
  same `assets/` + `references/` + `scripts/verify.mjs` + `evals/` layout
- `ugt-python-clean-code` — new content (SonarQube `python:S*` rule catalogue,
  duplication strategy for Python) but the same document shape and `paths:`
  frontmatter trick (`**/*.py`)
- `ugt-python-standard` bundle (core + platform + superpowers + skill-creator)
- Eval sets per skill + trigger-boundary set, following the existing
  `evals.json` / `trigger-evals.json` format — the with/without-skill
  methodology transfers as-is

---

## 3. Plain React SPA (Vite) — build or skip?

**Recommendation: skip. Do not build `ugt-react-spa-platform` now.** Reasons:

1. **The platform's center of gravity doesn't apply.** Of the four modules,
   two vanish outright: there is no database module (no server side → no
   Prisma, no migrations, no audit columns to enforce) and the auth module's
   entire asset base is wrong for a SPA — a browser-only app is an OAuth
   **public client**: PKCE in the browser (`oidc-client-ts`/`keycloak-js`),
   tokens in memory, no confidential client secret, no cookie sessions, no
   cookie-prefix rule, no backchannel logout, no server-side guard order.
   Nothing transfers except the Keycloak realm/client-per-project policy —
   which is one paragraph of `ugt-core/contracts/identity.md`, not a skill.
2. **Real RBAC enforcement can't live in the SPA anyway.** Client-side checks
   are UX, not security; the `session → permission → action → audit log`
   contract must be enforced by whatever API the SPA calls — and that API is a
   project on *another* stack (Next.js or Python), already covered by its own
   platform. A SPA-only platform would ship the look of the org auth standard
   without its substance.
3. **What remains is thin.** Quality setup is ~90 % reusable from
   `ugt-nextjs-quality-setup` (vitest/eslint/prettier/husky minus the
   `server-only` stub and Next lint config). CI/CD shrinks: same 10-stage
   shape but no migrate step, no runtime container env, deploy = static files
   behind nginx with a trivial healthcheck. Useful, but two thin skills don't
   justify a platform's maintenance surface (evals, verify scripts, version
   line, README rows).
4. **No demand signal.** The org direction for full apps is Next.js; a
   standalone Vite SPA implies an existing separate API, which is not a
   pattern any org project currently has.

**Trigger to revisit**: a real org project that is genuinely SPA + existing
non-org API. Even then, start with the cheapest rung: a single
`ugt-spa-cicd-setup` skill (nginx Dockerfile + trimmed Jenkinsfile + PKCE
env-config notes in its references), added as one more skill or a micro-plugin
— not a four-module platform. Estimated at that point: S (see §4).

---

## 4. Effort estimates and sequencing

T-shirt sizes, calibrated against v1 (which was ~8 phases of work including
extraction from a live project, evals, and verify-script hardening). "Reusable"
means copy-the-structure-and-rewrite-contents, which v1 experience shows is the
cheap part — the expensive part is **earning the gotchas**.

| Work | Size | Reused from v1 | The actual cost driver |
| --- | --- | --- | --- |
| `ugt-core` extraction + platform v2 migration | **S** (days) | Everything is a file move + text extraction; release choreography per §1.3 | Getting the release order right; README/mode-B doc updates |
| `ugt-python-platform` | **L** (the bulk is not skill-writing) | SKILL.md skeletons, router pattern, verify.mjs pattern, evals format, harness mechanism, all core contracts | D1–D8 decisions (org workshop), then a **pilot production project** to extract from; skill-writing after that is ~M |
| `ugt-react-spa` (if ever) | **S** as a single cicd skill; **M** if a platform is insisted on | quality skill ~90 %, pipeline shape | Recommended skipped — see §3 |

**Sequencing:**

1. **`ugt-core` first** (v1.3 memory already earmarked it "when a second stack
   arrives" — the second stack is now on the table, and the extraction is
   prerequisite to writing any sibling plugin without copy-pasting checkpoint
   and the hooks a third time). Small, self-contained, immediately reduces
   drift risk.
2. **Python: decision workshop (D1–D8) → pilot project → extract.** The
   plugin ships *after* the pilot has been through the real pipeline, real
   Keycloak client, real SQL Server — matching how v1 earned its 100 % eval
   score. Writing the plugin before the pilot inverts the causality that made
   v1 work.
3. **SPA: no work scheduled.** Revisit only on a concrete project, at the
   single-skill rung.
