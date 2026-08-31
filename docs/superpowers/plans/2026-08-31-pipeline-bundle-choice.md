# Pipeline Bundle Choice (superpowers / mattpocock) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `ugt-nextjs-standard` bundle into two installable bundles — `ugt-nextjs-standard-superpowers` (unchanged behavior) and `ugt-nextjs-standard-mattpocock` (new) — so a project picks its development pipeline at `/plugin install` time instead of relying on a runtime toggle.

**Architecture:** Two thin bundle plugins (just `plugin.json` + `CHANGELOG.md`, no skills of their own) replace the single `ugt-nextjs-standard` plugin. `ugt-nextjs-platform`'s generated `CLAUDE-block.md` gets a small, English, always-present routing row that detects which orchestration plugin is installed and a Thai knowledge-cross-reference bullet. README.md and `docs/web/index.html` get the full human-facing explanation (never injected into Claude's context).

**Tech Stack:** Claude Code plugin manifests (`plugin.json`), Markdown, static HTML.

**Spec:** `docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md` — read it before starting; every task below argues from its decisions (2.1–2.11).

## Global Constraints

- Two bundle names, exact: `ugt-nextjs-standard-superpowers`, `ugt-nextjs-standard-mattpocock` (spec 2.3).
- `mattpocock-skills` is a **hard** dependency of the new bundle, marketplace `claude-plugins-official` (spec 2.4).
- No new state file or skill anywhere — no `ugt-pipeline-mode` (spec 2.5).
- CLAUDE-block.md gets only short routing text, never the full 5-command walkthrough (spec 2.6).
- Full mattpocock walkthrough lives in README.md + `docs/web/index.html` only (spec 2.7).
- Do not touch `docs/training/landing.html`, `docs/training/cheatsheet.html`, `ugt-core`, php/python platform (spec 2.8, out of scope).
- This is a breaking rename: old `ugt-nextjs-standard` folder is deleted, not kept as a compat shim (spec 2.9).
- `plugins/ugt-nextjs-standard-mattpocock/CHANGELOG.md` must reference and explain superseding the rejection recorded in the old `ugt-nextjs-standard` CHANGELOG 1.3.0 (spec 2.10).
- `docs/project-context/` and mattpocock's own `CONTEXT.md`/`docs/adr/` are separate knowledge homes — read both, write to whichever owns the fact, never copy between them (spec 2.11).
- Tag format `<plugin>--v<version>`; version-table sync between README.md and `docs/web/index.html` is enforced by the existing check scripts.

---

### Task 1: Split `ugt-nextjs-standard` into the two bundle plugins

**Files:**
- Create: `plugins/ugt-nextjs-standard-superpowers/.claude-plugin/plugin.json`
- Create: `plugins/ugt-nextjs-standard-superpowers/CHANGELOG.md`
- Create: `plugins/ugt-nextjs-standard-mattpocock/.claude-plugin/plugin.json`
- Create: `plugins/ugt-nextjs-standard-mattpocock/CHANGELOG.md`
- Delete: `plugins/ugt-nextjs-standard/.claude-plugin/plugin.json`
- Delete: `plugins/ugt-nextjs-standard/CHANGELOG.md`
- Test: `claude plugin validate` (no test framework — this repo verifies plugin manifests with the CLI validator)

**Interfaces:**
- Consumes: current `plugins/ugt-nextjs-standard/.claude-plugin/plugin.json` (version 2.1.0, deps `ugt-nextjs-platform` + `superpowers`/`skill-creator`/`frontend-design` from `claude-plugins-official`) and its `CHANGELOG.md` (entries 1.0.0–2.1.0, with the mattpocock-skills rejection note under 1.3.0).
- Produces: two plugin names (`ugt-nextjs-standard-superpowers`, `ugt-nextjs-standard-mattpocock`) that Task 2 (marketplace.json) references verbatim.

- [ ] **Step 1: Write `plugins/ugt-nextjs-standard-superpowers/.claude-plugin/plugin.json`**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "ugt-nextjs-standard-superpowers",
  "displayName": "UGT Next.js Standard (superpowers pipeline)",
  "version": "3.0.0",
  "description": "The recommended bundle for dev teams using the superpowers pipeline — one install brings the org's stack knowledge (ugt-nextjs-platform), the development pipeline (superpowers: brainstorming → plan → TDD → code review), UI design quality (frontend-design), and skill-creator for building project skills to the same standard",
  "author": {
    "name": "UGT DX Team"
  },
  "dependencies": [
    "ugt-nextjs-platform",
    {
      "name": "superpowers",
      "marketplace": "claude-plugins-official"
    },
    {
      "name": "skill-creator",
      "marketplace": "claude-plugins-official"
    },
    {
      "name": "frontend-design",
      "marketplace": "claude-plugins-official"
    }
  ]
}
```

- [ ] **Step 2: Write `plugins/ugt-nextjs-standard-superpowers/CHANGELOG.md`**

Carry the old file's full history forward under the new name, with a new
entry on top:

```markdown
# Changelog — ugt-nextjs-standard-superpowers

## 3.0.0 (2026-08-31)

- **Renamed from `ugt-nextjs-standard`** (breaking — plugin name changes,
  existing installs must run `/plugin install ugt-nextjs-standard-superpowers@ugt`
  themselves; no compat shim). No functional change otherwise: still
  `ugt-nextjs-platform` + `superpowers` + `skill-creator` + `frontend-design`.
- Reason for the rename: the bundle now has a sibling,
  `ugt-nextjs-standard-mattpocock`, for teams who want the lighter-weight
  mattpocock-skills pipeline instead of superpowers. See that plugin's
  CHANGELOG and `docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md`
  for the full design and why a runtime toggle was rejected in favor of
  separate bundles.

## 2.1.0 (2026-08-09)

- Dependency floor moves to `ugt-nextjs-platform` 4.0.0 (radius now comes from
  the `base-mira` preset instead of org-pinned values). Projects already
  installed keep their current corners until they re-run the design step —
  nothing breaks on update; see the platform's 4.0.0 entry for what changes
  and why.

## 2.0.0 (2026-08-09)

- Records the new dependency floor after the v3.0 naming + knowledge-architecture
  release: `ugt-nextjs-platform` 3.0.0 (which depends on `ugt-core` 2.0.0).
  No dependency-list change in this manifest — but the bundle now delivers the
  renamed skills (`ugt-nextjs-full-setup`, `ugt-nextjs-test-lint-setup`,
  `ugt-handoff`, `ugt-model-mode`) plus the new `ugt-context` /
  `docs/project-context/` knowledge base. Existing projects: follow the
  migration steps in ugt-nextjs-platform 3.0.0's CHANGELOG.
- The 1.3.0 note about `domain-modeling` writing to `project-notes.md` now
  reads against `docs/project-context/` (project-notes was dissolved in 3.0.0)
  — the rejection stands for the same one-home-per-knowledge reason.

## 1.3.0 (2026-08-03)

- Add `frontend-design@claude-plugins-official` (Anthropic) as a fourth
  dependency. The stack ships Tailwind but the platform had no guidance on
  design quality, so new UI defaulted to generic AI aesthetics. Nothing in
  the bundle overlaps with it. No `extraKnownMarketplaces` entry needed —
  `claude-plugins-official` is auto-registered.

`mattpocock-skills` was evaluated for `grilling` / `domain-modeling` and
**rejected**, recorded here so it isn't re-proposed:

- `grilling` is a strict subset of superpowers' `brainstorming` — the
  one-question-at-a-time interview is step 3 of brainstorming's 9-step
  checklist, which additionally writes a spec file, self-reviews it, and gates
  implementation behind user approval.
- `domain-modeling` is the one genuine gap, but it writes its glossary and
  decisions to root `CONTEXT.md` + `docs/adr/`, which duplicates the
  `## Deviations` / `## Open Questions` sections this platform already
  installs in `.claude/state/project-notes.md`. Two homes for the same
  knowledge is exactly what the README's triage table forbids.
- The rest of the plugin (~21 skills, all loading their descriptions every
  session) duplicates superpowers on `tdd`, `code-review`, `diagnosing-bugs`
  and `writing-great-skills`.

> **Superseded by 3.0.0 (see above) / `ugt-nextjs-standard-mattpocock` 1.0.0.**
> The blocking reason (installing both plugins together duplicates every
> mattpocock skill description alongside superpowers' own, every session)
> no longer applies once the two pipelines ship as separate, mutually
> exclusive bundles — a project installs one or the other, never both. The
> `grilling`-is-a-subset observation still holds; it just stopped being
> disqualifying once the goal changed from "pick the one best pipeline" to
> "offer a cheaper alternative pipeline". See
> `docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md`
> decision 2.10.

## 1.2.0 (2026-07-29)

- Records the new dependency floor after the `ugt-core` split:
  `ugt-nextjs-platform` is now v2.0.0 and itself depends on `ugt-core` v1.0.0.
  No dependency change in this manifest — core flows through the platform.

## 1.1.0 (2026-07-28)

- Add `skill-creator@claude-plugins-official` as a third dependency, so every
  machine that installs the bundle can build project-local skills
  (`.claude/skills/<new-name>/`) to the same standard the platform itself was
  built and evaluated with. Project skills must not shadow `ugt-*` names — see
  the knowledge-triage table in the installed CLAUDE.md block.

## 1.0.0 (2026-07-27)

- First release: bundle of `ugt-nextjs-platform` +
  `superpowers@claude-plugins-official`.
```

- [ ] **Step 3: Write `plugins/ugt-nextjs-standard-mattpocock/.claude-plugin/plugin.json`**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "ugt-nextjs-standard-mattpocock",
  "displayName": "UGT Next.js Standard (mattpocock pipeline)",
  "version": "1.0.0",
  "description": "The lighter-weight bundle for dev teams using the mattpocock-skills pipeline — one install brings the org's stack knowledge (ugt-nextjs-platform), the development pipeline (mattpocock-skills: grill-with-docs → to-spec → to-tickets → implement → code-review), UI design quality (frontend-design), and skill-creator for building project skills to the same standard",
  "author": {
    "name": "UGT DX Team"
  },
  "dependencies": [
    "ugt-nextjs-platform",
    {
      "name": "mattpocock-skills",
      "marketplace": "claude-plugins-official"
    },
    {
      "name": "skill-creator",
      "marketplace": "claude-plugins-official"
    },
    {
      "name": "frontend-design",
      "marketplace": "claude-plugins-official"
    }
  ]
}
```

- [ ] **Step 4: Write `plugins/ugt-nextjs-standard-mattpocock/CHANGELOG.md`**

```markdown
# Changelog — ugt-nextjs-standard-mattpocock

## 1.0.0 (2026-08-31)

- First release: bundle of `ugt-nextjs-platform` +
  `mattpocock-skills@claude-plugins-official` (in place of `superpowers`) +
  `skill-creator@claude-plugins-official` + `frontend-design@claude-plugins-official`.
- **This reverses a prior decision.** `ugt-nextjs-standard` 1.3.0 evaluated
  and rejected `mattpocock-skills` — the disqualifying reason was that
  installing it *alongside* superpowers duplicated ~21 skill descriptions
  into every session's context, colliding with superpowers on `tdd`,
  `code-review`, `diagnosing-bugs`. That reason doesn't apply here: this
  bundle installs mattpocock-skills **instead of** superpowers, never both,
  so there is no description collision to duplicate. The other 1.3.0
  observation (`grilling` is a strict subset of `brainstorming`) still
  holds — it's not a reason to reject a cheaper alternative pipeline, only
  a reason it isn't a *strictly better* one. See
  `docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md`
  decision 2.10 for the full reasoning, and decision 2.11 for how this
  bundle's knowledge files (`CONTEXT.md`, `docs/adr/`, written by
  `grill-with-docs`/`domain-modeling`) relate to the org's
  `docs/project-context/` — they're separate, cross-referenced homes, not
  merged.
```

- [ ] **Step 5: Delete the old bundle folder**

```bash
git rm plugins/ugt-nextjs-standard/.claude-plugin/plugin.json plugins/ugt-nextjs-standard/CHANGELOG.md
```

(Confirm the folder is now empty except possibly an empty `.claude-plugin/`
dir — remove it too if `git rm` leaves it behind.)

- [ ] **Step 6: Validate both new manifests**

Run: `claude plugin validate ./plugins/ugt-nextjs-standard-superpowers --strict`
Expected: passes with no errors

Run: `claude plugin validate ./plugins/ugt-nextjs-standard-mattpocock --strict`
Expected: passes with no errors

- [ ] **Step 7: Commit**

```bash
git add plugins/ugt-nextjs-standard-superpowers plugins/ugt-nextjs-standard-mattpocock
git commit -m "feat: split ugt-nextjs-standard into -superpowers / -mattpocock bundles"
```

---

### Task 2: Update the root marketplace manifest

**Files:**
- Modify: `.claude-plugin/marketplace.json`
- Test: manual JSON validity check (no schema validator wired for this file specifically; `claude plugin validate` on the two plugin dirs from Task 1 already covers manifest shape)

**Interfaces:**
- Consumes: plugin names from Task 1 (`ugt-nextjs-standard-superpowers`, `ugt-nextjs-standard-mattpocock`).
- Produces: marketplace entries `/plugin install <name>@ugt` resolves in Tasks 4–6's install commands.

- [ ] **Step 1: Replace the `ugt-nextjs-standard` entry with two entries**

In `.claude-plugin/marketplace.json`, the `plugins` array currently has (in
this order): `ugt-core`, `ugt-nextjs-platform`, `ugt-nextjs-standard`,
`ugt-python-platform`, `ugt-php-platform`. Replace the `ugt-nextjs-standard`
object with two objects in its place (same position, right after
`ugt-nextjs-platform`):

```json
    {
      "name": "ugt-nextjs-standard-superpowers",
      "source": "./plugins/ugt-nextjs-standard-superpowers",
      "description": "The recommended bundle for teams using the superpowers pipeline — one install brings ugt-nextjs-platform + superpowers (the development pipeline: think first → plan → test-first → review) + frontend-design (UI quality) + skill-creator (build project skills to the same standard)"
    },
    {
      "name": "ugt-nextjs-standard-mattpocock",
      "source": "./plugins/ugt-nextjs-standard-mattpocock",
      "description": "The lighter-weight bundle for teams using the mattpocock-skills pipeline (manual, lower token cost) — one install brings ugt-nextjs-platform + mattpocock-skills (grill-with-docs → to-spec → to-tickets → implement → code-review, each step called by hand) + frontend-design (UI quality) + skill-creator (build project skills to the same standard)"
    },
```

- [ ] **Step 2: Verify JSON is well-formed**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); console.log('ok')"`
Expected: prints `ok`

- [ ] **Step 3: Commit**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat: register ugt-nextjs-standard-superpowers/-mattpocock in marketplace"
```

---

### Task 3: Route + cross-reference the two pipelines in CLAUDE-block.md, bump ugt-nextjs-platform

**Files:**
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-full-setup/assets/CLAUDE-block.md`
- Modify: `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json`
- Modify: `plugins/ugt-nextjs-platform/CHANGELOG.md`
- Test: `claude plugin validate ./plugins/ugt-nextjs-platform --strict`

**Interfaces:**
- Consumes: nothing from earlier tasks (independent of Tasks 1–2).
- Produces: the routing text and knowledge-goes bullet that README.md (Task 4) and `docs/web/index.html` (Task 5) point back to via `/ask-matt`.

- [ ] **Step 1: Split the "Build a feature / fix a bug" row**

In `plugins/ugt-nextjs-platform/skills/ugt-nextjs-full-setup/assets/CLAUDE-block.md`,
find this row in the "Which skill, when" table:

```
| Build a feature / fix a bug | อ่าน `docs/project-context/` ที่เกี่ยวตาม `00-index.md` (architecture + โดเมนที่แตะ) **ก่อน** แล้ว **size it** (below) — small → offer the user a choice, otherwise go full pipeline |
```

Replace it with:

```
| Build a feature / fix a bug | **If `superpowers` is installed**: อ่าน `docs/project-context/` ที่เกี่ยวตาม `00-index.md` (architecture + โดเมนที่แตะ) **ก่อน** แล้ว **size it** (below) — small → offer the user a choice, otherwise go full pipeline · **If `mattpocock-skills` is installed instead**: fully user-driven — do not auto-invoke anything for this row; wait for the user to run `/grill-with-docs` (or another mattpocock command) themselves. Full sequence and detours (prototype/triage/wayfinder) are at `/ask-matt` |
```

- [ ] **Step 2: Add the knowledge cross-reference bullet**

Find the "Where new knowledge goes (4 ทาง)" section's bullet list (ends with
the `Personal preference → auto memory` bullet). Add a new bullet at the end:

```markdown
- **โปรเจคที่ใช้ mattpocock bundle**: `grill-with-docs`/`domain-modeling`
  สร้าง/ดูแล `CONTEXT.md` (root, glossary) และ `docs/adr/`
  (การตัดสินใจทางเทคนิค) เอง — คนละที่เก็บกับ `docs/project-context/`
  โดยตั้งใจ **ห้าม copy เนื้อหาข้ามกัน**: เริ่มงานอ่านทั้งคู่
  (`docs/project-context/00-index.md` + `CONTEXT.md`/`docs/adr/` ถ้ามี)
  แต่เขียนแค่ที่เจ้าของมันเขียน — `/ugt-handoff` ดูแลเฉพาะ
  `docs/project-context/` + `handoff.md` เหมือนเดิม ไม่แตะ `CONTEXT.md`/`docs/adr/`
```

- [ ] **Step 3: Bump the plugin version**

In `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json`, change
`"version": "4.54.0"` → `"version": "4.55.0"`.

- [ ] **Step 4: Add the CHANGELOG entry**

Prepend to `plugins/ugt-nextjs-platform/CHANGELOG.md` (above the existing
`## 4.54.0` entry):

```markdown
## 4.55.0 (2026-08-31)

**CLAUDE-block.md: route "Build a feature / fix a bug" by which pipeline plugin is
installed (superpowers vs mattpocock-skills), and cross-reference mattpocock's
own knowledge files**

- New projects can now install `ugt-nextjs-standard-mattpocock` instead of
  `ugt-nextjs-standard-superpowers` for a lighter-weight, manually-invoked
  development pipeline. The generated `CLAUDE-block.md` detects which
  orchestration plugin is actually installed and routes accordingly — no new
  state file, no toggle skill (see
  `docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md`).
- Added a bullet under "Where new knowledge goes" so `CONTEXT.md`/`docs/adr/`
  (owned by mattpocock's `grill-with-docs`/`domain-modeling`) and
  `docs/project-context/` (owned by `ugt-handoff`) are read together but never
  merged.
- Existing projects on `ugt-nextjs-standard-superpowers` (or the pre-split
  `ugt-nextjs-standard`) see no behavior change — the superpowers branch of
  the routing row is identical to the old unconditional text.
```

- [ ] **Step 5: Validate**

Run: `claude plugin validate ./plugins/ugt-nextjs-platform --strict`
Expected: passes with no errors

- [ ] **Step 6: Commit**

```bash
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-full-setup/assets/CLAUDE-block.md plugins/ugt-nextjs-platform/.claude-plugin/plugin.json plugins/ugt-nextjs-platform/CHANGELOG.md
git commit -m "feat(4.55.0): route feature/bug row + cross-ref knowledge homes by installed pipeline"
```

---

### Task 4: README.md — bundle table, install/update commands, day-to-day row, mattpocock walkthrough

**Files:**
- Modify: `README.md`
- Test: manual read-through (no script covers README prose; the version-sync check in Task 6 covers the numbers)

**Interfaces:**
- Consumes: plugin names/versions from Tasks 1–3.
- Produces: the mattpocock walkthrough table that Task 5 mirrors into `docs/web/index.html` — keep the wording identical so the two stay in sync by inspection.

- [ ] **Step 1: Split the "มีอะไรในชุดนี้" table row**

Replace this row (currently the first row of the table):

```
| `ugt-nextjs-standard` | 2.1.0 | **ตัวที่ควรติดตั้ง** — ติดตัวเดียวได้ครบทุกอย่างข้างล่าง **พร้อม plugin official อีก 3 ตัว**: `superpowers` (กระบวนการพัฒนา: คิดก่อน → วางแผน → เขียนเทสต์ก่อน → review), `frontend-design` (คุณภาพงาน UI), `skill-creator` (สร้างตัวช่วยของโปรเจคเอง) |
```

with two rows:

```
| `ugt-nextjs-standard-superpowers` | 3.0.0 | **แนะนำ (pipeline auto)** — ติดตัวเดียวได้ครบทุกอย่างข้างล่าง พร้อม `superpowers` (กระบวนการพัฒนา: คิดก่อน → วางแผน → เขียนเทสต์ก่อน → review, ทำเองอัตโนมัติ), `frontend-design`, `skill-creator` |
| `ugt-nextjs-standard-mattpocock` | 1.0.0 | **ทางเลือก (pipeline manual, token น้อยกว่า)** — ตัวเดียวกันแต่สลับ `superpowers` เป็น `mattpocock-skills` (`/grill-with-docs → /to-spec → /to-tickets → /implement → /code-review` เรียกเองทีละคำสั่ง — ดูวิธีใช้ด้านล่าง) |
```

- [ ] **Step 2: Add a "เลือกยังไง" line right after the table**

After the table (before the `รุ่นจริงล่าสุดดูจาก git tags...` line), insert:

```markdown
**เลือก bundle ไหน?** ไม่แน่ใจ → ใช้ `-superpowers` (ระบบทำงานเองอัตโนมัติ
ทั้งหมด) · อยากคุมทุกขั้นตอนเองและประหยัด token กว่า → ใช้ `-mattpocock`
(ต้องเรียกคำสั่งเองตามลำดับ — วิธีใช้อยู่ในหัวข้อ "ถ้าเลือก bundle
mattpocock" ด้านล่าง) เปลี่ยนใจทีหลังได้ แต่ต้อง uninstall ตัวเดิมแล้ว
install อีกตัว ไม่มีคำสั่งสลับระหว่างสองอย่าง
```

- [ ] **Step 3: Update the install codeblock**

Replace:

```
/plugin marketplace add pakornkub/ugt-claude-platform
/plugin install ugt-nextjs-standard@ugt
/reload-plugins
```

with:

```
/plugin marketplace add pakornkub/ugt-claude-platform
/plugin install ugt-nextjs-standard-superpowers@ugt
/reload-plugins
```

and add directly below the code block (before the existing `ตอน install
เลือก scope...` paragraph):

```markdown
(ใช้ `ugt-nextjs-standard-mattpocock@ugt` แทนบรรทัดที่สองถ้าเลือก pipeline
mattpocock)
```

- [ ] **Step 4: Update the day-to-day table row**

Replace this row in the "หลังติดตั้งแล้ว ชีวิตประจำวันเป็นยังไง" table:

```
| สร้าง feature / แก้บั๊ก | **อ่านความรู้ของโปรเจคก่อน** (ระบบเป็นยังไง กติกาอะไรอยู่) แล้วเข้ากระบวนการเต็ม: คิดก่อน → วางแผน → เขียนเทสต์ → เขียนโค้ด → review |
```

with:

```
| สร้าง feature / แก้บั๊ก | **bundle superpowers**: อ่านความรู้ของโปรเจคก่อน แล้วเข้ากระบวนการเต็มอัตโนมัติ: คิดก่อน → วางแผน → เขียนเทสต์ → เขียนโค้ด → review · **bundle mattpocock**: เรียกเองทีละคำสั่งตามหัวข้อถัดไป — ไม่มีอะไรทำงานเองให้ |
```

- [ ] **Step 5: Insert the mattpocock walkthrough subsection**

Insert this new `###` subsection right after the "หลังติดตั้งแล้ว
ชีวิตประจำวันเป็นยังไง" table (and its `**เลือกความแรงของ AI ตามงาน**...`
paragraph) and before the `### ความจำของทีม...` subsection:

```markdown
### ถ้าเลือก bundle mattpocock — สั่งเองทีละขั้น (ไม่ auto เหมือน superpowers)

| คำสั่ง | ใช้ตอนไหน | ได้อะไร |
| --- | --- | --- |
| `/grill-with-docs` | มี requirement/เอกสารอยู่แล้วแต่ยังมีจุดกำกวม | AI ไล่ถามจนไม่มีจุดที่ต้องเดาเอง เก็บเป็น `CONTEXT.md`/ADR ในโปรเจค |
| `/to-spec` | requirement ชัดแล้ว | เปลี่ยนบทสนทนาให้กลายเป็น spec พร้อมทำต่อ |
| `/to-tickets` | มี spec แล้ว | แตกเป็นงานย่อย พร้อมลำดับก่อน-หลัง |
| `/implement` | มี ticket แล้ว | ลงมือเขียนโค้ดจริง (ขับ TDD ข้างในให้เอง) |
| `/code-review` | โค้ดเสร็จ | ตรวจ 2 แกน: ตรง spec ไหม + ผ่านมาตรฐานโค้ด repo ไหม |

Flow: เคลียร์ requirement → spec → tickets → implement → review — เรียกเอง
ทีละคำสั่ง ไม่มีขั้นไหนต่อขั้นถัดไปให้อัตโนมัติ (ต่างจาก bundle superpowers
ที่ auto-chain ให้) แลกมาด้วยการคุมได้ละเอียดกว่าและ token ต่ำกว่า ลำดับเต็ม
พร้อมทางแยก (prototype/triage/wayfinder) ดูที่ `/ask-matt`

`CONTEXT.md` และ `docs/adr/` ที่คำสั่งพวกนี้สร้างเป็นคนละที่เก็บกับ
`docs/project-context/` โดยตั้งใจ — Claude จะอ่านทั้งคู่ตอนเริ่มงานให้เอง
ไม่ต้อง copy เนื้อหาข้ามที่กันเอง
```

- [ ] **Step 6: Update the update-instructions codeblock**

Replace:

```
/plugin marketplace update ugt
/plugin update ugt-nextjs-standard
/reload-plugins
```

with:

```
/plugin marketplace update ugt
/plugin update ugt-nextjs-standard-superpowers
/reload-plugins
```

and add directly below it:

```markdown
(สลับชื่อเป็น `ugt-nextjs-standard-mattpocock` ถ้านั่นคือ bundle ที่ติดตั้งไว้)
```

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: README — split bundle table, add mattpocock pipeline walkthrough"
```

---

### Task 5: Sync docs/web/index.html with README.md

**Files:**
- Modify: `docs/web/index.html`
- Test: open the file in a browser and visually confirm both bundle cards render (manual — this is a static marketing page, no test harness)

**Interfaces:**
- Consumes: the exact wording from Task 4 (README.md) — this task mirrors it, not paraphrases it, so the two stay checkable by inspection per the platform's existing sync rule.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Split the featured plugin card**

Replace this card (inside `<section id="plugins">`, first card in
`.grid.cols-3`):

```html
      <article class="card plugin-card featured reveal">
        <span class="badge">แนะนำ — ติดตั้งตัวนี้</span>
        <span class="ver">v2.1.0</span>
        <h3>ugt-nextjs-standard</h3>
        <p>ตัวที่ควรติดตั้ง — ติดตัวเดียวได้ครบทุกอย่างข้างล่างอัตโนมัติ
        <strong>พร้อม plugin official อีก 3 ตัว</strong> (ดูกรอบล่าง) ไม่ต้องเลือกทีละชิ้น</p>
      </article>
```

with two cards:

```html
      <article class="card plugin-card featured reveal">
        <span class="badge">แนะนำ — pipeline auto</span>
        <span class="ver">v3.0.0</span>
        <h3>ugt-nextjs-standard-superpowers</h3>
        <p>ติดตัวเดียวได้ครบทุกอย่างข้างล่างอัตโนมัติ <strong>พร้อม plugin
        official อีก 3 ตัว</strong> (ดูกรอบล่าง) — pipeline ทำงานเองทั้งหมด</p>
      </article>
      <article class="card plugin-card featured reveal">
        <span class="badge">ทางเลือก — pipeline manual, token น้อยกว่า</span>
        <span class="ver">v1.0.0</span>
        <h3>ugt-nextjs-standard-mattpocock</h3>
        <p>ตัวเดียวกันแต่สลับ pipeline เป็น <code>mattpocock-skills</code> —
        เรียกคำสั่งเองทีละขั้น (<code>/grill-with-docs → /to-spec →
        /to-tickets → /implement → /code-review</code>)</p>
      </article>
```

(This makes the grid 4 cards instead of 3 — check `.grid.cols-3`'s CSS still
wraps sensibly with 4 items; if the layout looks cramped, drop `cols-3` in
favor of the grid's existing responsive wrap rather than inventing a new
class.)

- [ ] **Step 2: Update the lead paragraph above the grid**

Replace:

```html
    <p class="lead reveal">สาย Next.js ติดตั้งตัวเดียวคือ <strong>ugt-nextjs-standard</strong> — ที่เหลือมาเองครบ
    · สาย Python/PHP ติดตั้งแยก (ดูกรอบล่าง)</p>
```

with:

```html
    <p class="lead reveal">สาย Next.js ติดตั้งตัวเดียว — เลือก
    <strong>ugt-nextjs-standard-superpowers</strong> (pipeline auto) หรือ
    <strong>ugt-nextjs-standard-mattpocock</strong> (pipeline manual, token
    น้อยกว่า) — ที่เหลือมาเองครบ · สาย Python/PHP ติดตั้งแยก (ดูกรอบล่าง)</p>
```

- [ ] **Step 3: Add mattpocock-skills to the "ของแถม" card grid**

In the same section's `<div class="subsec">` for "ของแถม: plugin official ที่ติดตั้งมาให้อัตโนมัติ",
update the lead paragraph and add a card. Replace:

```html
    <p class="sub-lead reveal">ติด <strong>ugt-nextjs-standard</strong> ตัวเดียว จะได้ plugin จากทีม Anthropic/ชุมชน
      ที่องค์กรคัดไว้แล้วอีก 3 ตัว — ทำงานร่วมกับตัวช่วย ugt เองโดยไม่ต้องตั้งค่าอะไรเพิ่ม</p>
    <div class="grid cols-3">
      <article class="card reveal">
        <h3>superpowers</h3>
        <p>กระบวนการพัฒนาที่ดี: <strong>คิดก่อน → วางแผน → เขียนเทสต์ก่อน → เขียนโค้ด → review</strong> —
        งาน feature/bug ทั่วไปเดินตามขั้นนี้เอง ส่วนงานเล็ก ๆ จะถามก่อนว่าจะย่อขั้นตอนไหม</p>
      </article>
```

with:

```html
    <p class="sub-lead reveal">ติด bundle ตัวเดียว จะได้ plugin จากทีม
      Anthropic/ชุมชนที่องค์กรคัดไว้แล้วอีก 3 ตัว — ทำงานร่วมกับตัวช่วย ugt
      เองโดยไม่ต้องตั้งค่าอะไรเพิ่ม (ได้ <code>superpowers</code> **หรือ**
      <code>mattpocock-skills</code> อย่างใดอย่างหนึ่งเท่านั้น ตามที่เลือก
      ไม่ใช่ทั้งคู่)</p>
    <div class="grid cols-3">
      <article class="card reveal">
        <h3>superpowers <span style="font-weight:400">(bundle -superpowers)</span></h3>
        <p>กระบวนการพัฒนาที่ดี: <strong>คิดก่อน → วางแผน → เขียนเทสต์ก่อน → เขียนโค้ด → review</strong> —
        งาน feature/bug ทั่วไปเดินตามขั้นนี้เอง ส่วนงานเล็ก ๆ จะถามก่อนว่าจะย่อขั้นตอนไหม</p>
      </article>
      <article class="card reveal">
        <h3>mattpocock-skills <span style="font-weight:400">(bundle -mattpocock)</span></h3>
        <p><strong>เรียกเองทีละคำสั่ง</strong>:
        <code>/grill-with-docs → /to-spec → /to-tickets → /implement →
        /code-review</code> — ไม่มีขั้นไหนต่อขั้นถัดไปให้อัตโนมัติ คุมได้
        ละเอียดกว่าและ token ต่ำกว่า</p>
      </article>
```

(Leave the `frontend-design` and `skill-creator` cards below untouched — both
bundles ship them.)

- [ ] **Step 4: Update both install/update codeblocks**

Replace (install section, around the `data-copy` attribute and `<pre><code>`
block):

```
data-copy="/plugin marketplace add pakornkub/ugt-claude-platform&#10;/plugin install ugt-nextjs-standard@ugt&#10;/reload-plugins"
```

and

```
/plugin install ugt-nextjs-standard@ugt
```

with `ugt-nextjs-standard-superpowers` in both places, then add a short note
line right after that codebox (matching the pattern used elsewhere on the
page for asides) saying to swap in `ugt-nextjs-standard-mattpocock` for the
other pipeline — same wording as README.md Step 3.

Replace (update section):

```
data-copy="/plugin marketplace update ugt&#10;/plugin update ugt-nextjs-standard&#10;/reload-plugins"
```

and

```
/plugin update ugt-nextjs-standard
```

with `ugt-nextjs-standard-superpowers` in both places, same swap-note pattern
as README.md Step 6.

- [ ] **Step 5: Visual check**

Open `docs/web/index.html` directly in a browser (file:// URL is fine — no
server needed per the file's own design). Confirm: both bundle cards render
in the plugins grid, both pipeline cards render in "ของแถม", both copy
buttons copy the right command, no layout overflow from the extra card.

- [ ] **Step 6: Commit**

```bash
git add docs/web/index.html
git commit -m "docs: sync docs/web/index.html with README bundle split"
```

---

### Task 6: Final verification pass

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing — this is the gate before tagging/announcing.

- [ ] **Step 1: Run the platform's release check scripts**

Run (from repo root):

```bash
node scripts/stamp-kit-assets.mjs && node scripts/lint-kit-assets.mjs && node scripts/check-contract-drift.mjs && node scripts/check-doc-status.mjs && node scripts/check-preview-tokens.mjs && node scripts/stamp-kit-assets.mjs --check
```

Expected: all green. None of this task's files are kit assets, so no stamps
change — a clean run confirms nothing else regressed.

- [ ] **Step 2: Validate every touched/created plugin**

```bash
claude plugin validate ./plugins/ugt-nextjs-standard-superpowers --strict
claude plugin validate ./plugins/ugt-nextjs-standard-mattpocock --strict
claude plugin validate ./plugins/ugt-nextjs-platform --strict
```

Expected: all three pass.

- [ ] **Step 3: Confirm the old bundle is fully gone**

Run: `git status plugins/ugt-nextjs-standard/`
Expected: either "not a git repository" style empty/absent output, or the
path shows as deleted — no leftover files.

- [ ] **Step 4: Confirm version numbers match across README.md and docs/web/index.html**

Manually diff the two version tables (README.md's "มีอะไรในชุดนี้" table vs
`docs/web/index.html`'s plugin cards): `ugt-nextjs-standard-superpowers` =
3.0.0 in both, `ugt-nextjs-standard-mattpocock` = 1.0.0 in both,
`ugt-nextjs-platform` = 4.55.0 in both.

- [ ] **Step 5: Tag (only after the user confirms — this pushes shared git
tags, do not do it unattended)**

```bash
git tag ugt-nextjs-platform--v4.55.0
git tag ugt-nextjs-standard-superpowers--v3.0.0
git tag ugt-nextjs-standard-mattpocock--v1.0.0
git push origin main --tags
```

- [ ] **Step 6: Tell the user the breaking-change announcement text**

Report to the user (do not post anywhere automatically): existing installs
of `ugt-nextjs-standard` should run
`/plugin install ugt-nextjs-standard-superpowers@ugt` to keep the same
(superpowers) behavior, or `ugt-nextjs-standard-mattpocock@ugt` to switch
pipelines.
