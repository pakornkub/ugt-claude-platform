# Changelog — ugt-core

## 2.11.0 (2026-09-06)

**ugt-core เป็นกลางเรื่อง pipeline + กฎ "บ้านมติที่เดียว"** (คู่กับ
ugt-nextjs-platform 4.59.0 — ที่มาอยู่ใน CHANGELOG นั้น)

- **ugt-context**: ถ้ามี `docs/adr/` อยู่แล้ว หรือติดตั้ง mattpocock-skills
  (`domain-modeling` เขียน ADR) → **ไม่สร้าง `decisions.md`** แก้แถวใน
  `00-index.md` ให้ชี้ `docs/adr/` แทน — สอง decision log ใน repo เดียวคือ
  สิ่งที่โฟลเดอร์นี้ห้ามก่อ · asset `00-index.md` มี comment บอกวิธีแก้แถว
- **ugt-handoff**: แถว decision → `decisions.md` **หรือ** `docs/adr/` (ADR ใหม่
  1 ไฟล์ตาม format เดิม) ตามที่ `00-index.md` บอก · DON'T ใหม่: ห้าม copy สถานะ
  ระดับ ticket จากไฟล์ของ pipeline (`.scratch/`, `.superpowers/sdd/`) เข้า
  board/handoff หรือเขียนเข้าไปในนั้น
- **ugt-requirements**: ถ้อยคำเป็นกลาง (เดิมฝัง "superpowers pipeline" 4 จุด) ·
  ลบข้อความ "CONTEXT.md/adr เป็น frozen input" ที่ผิดกับความจริง (adr โตต่อทุก
  รอบ grill) · **thin mode** เมื่อติดตั้ง mattpocock-skills: เขียนแค่
  `00-overview.md` (Open Questions เป็นบรรทัดเดียวชี้ `/wayfinder` /
  `/grill-with-docs`) + แถว board — ไม่มี `NN-*.md` เพราะ grill/wayfinder
  เป็นเจ้าของ "หาสิ่งที่เอกสารไม่ได้บอก" อยู่แล้ว ทำซ้ำได้คำถามค้างสองชุดแข่งกัน
  (เห็นจาก pilot dx-game ที่ปิด fog 10 ใบด้วย wayfinder)
- **contracts/harness.md**: บ้านมติ = `decisions.md` หรือ `docs/adr/` (ไม่สร้าง
  `decisions.md` เมื่อเก็บ ADR) · แถวใหม่ `CODING_STANDARDS.md` (mattpocock
  เท่านั้น — pointer ให้ `/code-review` ของ matt เห็น `.claude/rules/`)

## 2.10.1 (2026-09-03)

**contract cicd.md § Persistent data: `/srv/appdata/<project>` → `/home/docker02/appdata/<project>`**
— contract ตกค้าง path เก่าที่ไม่เคยตรงกับ host จริงมาตั้งแต่มติ M5 เดิม ทุก
downstream (nextjs/php/python skill content, `scripts/check-contract-drift.mjs`)
เคยแอบใช้ `/home/docker02/appdata` กันเองแบบไม่เป็นทางการ (เห็นได้จาก production
จริงของ ugt-mscpl-ana/ugt-bd-forecast บน host `docker02`) โดยไม่มีใคร sync
contract กลับ — รอบนี้แก้ contract ให้ตรงความจริงแล้ว sync ทั้ง 3 platform
plugin (php/python 0.6.2, nextjs 4.58.1) ในคราวเดียว ยืนยันด้วย
`node scripts/check-contract-drift.mjs` (21/21 ผ่าน)

## 2.10.0 (2026-09-02)

**contract design.md §Layout: page pattern แตกเป็นสองแบบที่ sanctioned** —
เดิมเขียน "One page pattern per app: title + actions + content card" ซึ่ง
ออกแบบมาเพื่อหน้าตาราง/ข้อมูล พอโปรเจคจริงทำ**หน้าฟอร์มแยก** (บันได Dialog:
ฟอร์มยาว = หน้าแยก) ตามตัวอักษรจะได้ฟอร์มยืดเต็มจอในการ์ด — กรอบการ์ดซ้อน
กรอบ input อ่านรก (field report จากโปรเจค pilot 2026-09-02) · ตอนนี้ contract
ระบุ **data page** (การ์ดตามเดิม) กับ **form page** (container กึ่งกลางขนาด
ตามฟอร์ม, แบ่ง section ด้วยหัวข้อ + เส้นคั่น, ไม่ครอบการ์ด, ปุ่มท้ายฟอร์ม
หลังเส้นคั่น) · stack rendering อยู่ที่ `ugt-nextjs-platform` 4.58.0
(DESIGN.template §4 ฟอร์มแยกหน้า)

## 2.9.2 (2026-09-01)

**`org-managed-settings.md`: เพิ่มกล่อง "Action required" สำหรับ IT ที่
deploy template ก่อน 2026-08-31 ไปแล้ว** — 2.9.1 แก้ชื่อ plugin ใน template
แต่ไม่ได้บอกว่า fleet ที่ถือไฟล์เก่าอยู่ต้อง **redeploy** ผ่าน MDM/Group
Policy/Ansible ด้วย (managed settings override ทุกระดับ ผู้ใช้แก้เองไม่ได้ —
ถ้าไม่ redeploy ทั้งองค์กรจะ force-enable ปลั๊กอินที่ไม่มีอยู่จริงต่อไป
เครื่องพนักงานใหม่ไม่ได้ bundle อัตโนมัติ) · จากผล code review อิสระหลัง
release 4.55.0

## 2.9.1 (2026-08-31)

**`org-managed-settings.md`: แก้ชื่อ plugin ที่อ้างถึง (3 จุด)** — `ugt-nextjs-standard`
ถูก rename/split เป็น `ugt-nextjs-standard-superpowers` /
`ugt-nextjs-standard-mattpocock` ใน `ugt-nextjs-platform` 4.55.0
(ดูรุ่นนั้นและ `docs/superpowers/plans/2026-08-31-pipeline-bundle-choice.md`)
แต่เอกสารนี้ — template ที่ IT ใช้ deploy ผ่าน MDM/Group Policy ไปทั้งองค์กร —
ยังชี้ไปที่ชื่อเดิมที่ไม่มีอยู่แล้ว: JSON template, ข้อความ "what this buys",
และ checklist ตอนท้าย ทั้งสามจุดแก้เป็น `ugt-nextjs-standard-superpowers`
(bundle เริ่มต้นที่แนะนำ) พร้อมหมายเหตุสั้น ๆ ให้ IT ที่อยากใช้ pipeline
mattpocock แทนว่าต้องสลับ key เป็น `ugt-nextjs-standard-mattpocock@ugt`

## 2.9.0 (2026-08-25)

**แก้ contract ตามผล audit ปูพรม 7 มิติ 2026-08-25** — ทุกข้อ verify ทั้งสองฝั่ง
(prose vs โค้ด/asset จริง) ก่อนแก้ ฝั่งที่ถูกคือฝั่งที่ implementation ใช้จริง:

- `harness.md`: "imports exactly two always-loaded files" → **three** (เพิ่ม
  `@.claude/state/model-mode.md` ที่ CLAUDE-block import จริงตั้งแต่ v2.8.0 และ
  precedence ของ ugt-model-mode พึ่งอยู่) · placeholder `ugt-<stack>-setup`
  ตกค้างจาก rename 2026-08-09 → `ugt-<stack>-full-setup` · กฎ self-contained
  ได้ carve-out ที่แพลตฟอร์มใช้จริง 5 จุด: เรียก verify/check script หรือ copy
  asset skeleton ของ skill อื่นได้เมื่ออ้างชื่อ skill (ห้าม plugin-root path)
  ภายใน plugin เดียวกันหรือ dependency
- `cicd.md`: stage 6 "Dependency Scan" → **"OWASP Dependency Check"** ให้ตรง
  Jenkinsfile + verify.mjs ทั้ง 3 stack (contract ประกาศเองว่า stage list คือ
  contract) · health endpoint "every service" → "every **long-running**
  service" (shape `[BATCH]` ของ python ไม่มีอะไรให้ poll โดยชอบธรรม)
- `org-managed-settings.md`: เจ้าของ audit hooks `ugt-nextjs-platform` →
  **`ugt-core`** (hooks/ อยู่ที่ core ที่เดียวและส่งถึงทุก stack ผ่าน
  dependency — เอกสารนี้ส่งทีม IT การระบุผิดทำให้เข้าใจว่า php/python
  ไม่มี audit trail)
- Maintenance note ทั้ง 6 contract ใช้ถ้อยคำเดียวกัน: bump ugt-core เมื่อ
  contract text เปลี่ยน / bump stack platform เมื่อสำเนา restate เปลี่ยน
  (เดิม design.md สั่ง bump core, ตัวอื่นสั่ง bump platform — ขัดกันเอง)
- YAGNI trims: `auth.md` §service-to-service (สถานะ "not yet standardized")
  เหลือ status + interim rule · `design.md` §Motion/§Feedback ย่อร้อยแก้ว
  generic โดยคงทุกค่าที่ skill restate (150–250ms, ≤12px, toast semantics)
- `ugt-handoff` checklist + `ugt-requirements` frontmatter ตามแก้สองข้อแรก ·
  `ugt-requirements` §Pre-crystallization ยุบเหลือบรรทัดเดียว

## 2.8.0 (2026-08-25)

**`ugt-model-mode`: บังคับ precedence เหนือ superpowers + migrate layout เก่า** —
จากเคสจริงใน HRMS ที่ SDD เลือก model เองไม่ตามตาราง mode

- **template ทั้งสอง (fixed + auto) ได้ 2 bullet ใหม่ฝังในตัวไฟล์
  `model-mode.md` เอง**: (1) ตารางนี้ชนะคำแนะนำ model ใน skill ใดๆ รวม
  "Model Selection" ของ `superpowers:subagent-driven-development` — เหตุผลที่
  ย้ายมาไว้ในไฟล์ state แทนที่จะพึ่ง CLAUDE-block: ไฟล์นี้ถูก `@`-import เข้า
  CLAUDE.md ทุก session อยู่แล้ว ประโยคจึงได้ศักดิ์ระดับ CLAUDE.md ในทุก
  โปรเจกต์ทันทีที่รัน `/ugt-model-mode` ครั้งถัดไป โดยไม่ต้องรอ migrate
  CLAUDE.md block (ซึ่งเป็น paste-into-file ที่ไม่มีกลไก sync) ·
  (2) ตาราง map บทบาท superpowers → task type (implementer → Write code,
  reviewer → Review code, systematic-debugging → Diagnose ฯลฯ) — เดิมตอน
  dispatch ไม่มีอะไรบอกว่า role ของ SDD ตรงกับแถวไหน
- **Legacy detection**: เจอ `.claude/state/mode.md` (ชื่อ v2.x) โดยไม่มี
  `model-mode.md` → migrate ก่อน (เขียนไฟล์ใหม่จาก template ปัจจุบันโดยคง
  mode เดิม, ลบไฟล์เก่า, แก้บรรทัด `@` import + `/ugt-mode` ใน CLAUDE.md)
  แทนที่จะรายงานผิดว่า "ยังไม่ได้ตั้ง mode" — บั๊กจริงที่เจอกับ HRMS

## 2.7.0 (2026-08-21)

จากผล audit ปูพรม 2026-08-21 (backlog §5 — ฝั่ง ugt-core):

- `ugt-requirements`: board.md ที่ยังไม่มี ให้ **copy skeleton ของ
  `ugt-context` ก่อนแล้วค่อยเติมแถว** ไม่ hand-author ตารางเอง — ตารางเปล่า
  ทำ header comment (กติกา single-writer + status legend ที่ `/ugt-handoff`
  พึ่ง) หายไป
- `ugt-handoff`: template ในตัว SKILL ใช้ `<YYYY-MM-DD>` ให้ตรงกับ skeleton
  ที่ ship จริงและ regex ตรวจความสดของ full-setup (เดิมไม่มีวงเล็บแหลม —
  handoff ที่เขียนตาม template ทิ้ง `YYYY-MM-DD` ดิบไว้โดยไม่มีตัวตรวจจับ)
- `ugt-context` / `ugt-requirements`: ข้อเสนอ parallel ผ่าน `Workflow` tool
  ระบุ fallback สำหรับ harness ที่ไม่มี tool นี้ (fan-out เดิมผ่าน
  `Agent`/`Task` แทน)

## 2.6.0 (2026-08-21)

`ugt-requirements` learns to work with pre-crystallization sessions (e.g. a
`/grill-with-docs` interview run before the brief):

- **Reading the sources**: a root `CONTEXT.md` (domain glossary) or
  `docs/adr/` is now always read as a source — listed in Sources, cited in
  the briefs, and treated as frozen input (once the project runs, decisions
  live in `docs/project-context/decisions.md`; the two systems never grow in
  parallel).
- **Pre-crystallization note**: when the user grills first, advise ending
  that session by dumping every settled decision into
  `docs/requirements/00-decisions.md` — glossary + sparing ADRs capture only
  a fraction of the answers; the rest evaporates unless written to a file
  this skill reads. Optional, never required — no dependency on any external
  plugin.

## 2.5.0 (2026-08-20)

Field report: a full-setup run took 4 hours in one session and stalled around
auth — the platform had no written rule for *when to split work* or *how its
orchestration layers relate to superpowers*. Two additions:

- `ugt-requirements` §Handoff gains **Orchestration decision**: after the
  brief + board are committed, judge three signals (context already
  compacted → new session · ≥2 independent features with cleared Open
  Questions → offer parallel worktree sessions · chained/shared-schema
  features → sequential, schema-first on main) and propose ONE build plan the
  user confirms once. The plan must state the layer rules out loud: a feature
  goes to a fresh session (never a subagent — the pipeline inside dispatches
  its own), a blocked feature is not dispatchable, and merging back is an
  integration check only (no re-review).
- `ugt-model-mode` gains **Precedence vs superpowers' own model advice**:
  `model-mode.md` wins over SDD's Model Selection section when both apply
  (committed project standard > skill text); SDD still fills the gaps where
  the table is silent. `auto` is named the best-fit preset for heavy feature
  phases.

## 2.4.0 (2026-08-16)

`ugt-context` (scan path) and `ugt-requirements` (reading many source docs) fit
graph-orchestration cleanly — read-only, independently splittable, no
mid-flight user checkpoint. Both skills now offer the user a parallel scan/
draft via the `Workflow` tool when the scope is large enough to matter (many
modules for context, many features for requirements), stating plainly that it
spawns multiple agents and costs more tokens than the single-agent path.
Opt-in only — small projects and short requirement folders stay single-agent
as before.

## 2.3.0 (2026-08-11)

`contracts/cicd.md` gains a new section **Persistent data (bind mounts)** —
codifies the org pattern for container data that must survive deploys (uploads,
SQLite, `wp-content`, reports): bind mounts under `/srv/appdata/<project>/` and
`/srv/appdata/<project>-dev/`, never named or anonymous Docker volumes. Includes
path format, setup rules (Deploy idempotency, one-time admin setup), guardrails
(no secrets, no code bind-mounts except `wp-content`), and backup scope.

## 2.2.0 (2026-08-09)

`contracts/design.md` §Layout pins two more things that a design review kept
having to re-litigate per page:

- **Pagination control set is fixed** — rows-per-page · "page X of Y" ·
  first/prev/next/last icon buttons (first/last may hide on small screens) ·
  **no numbered page list** (costs width, misreports on empty data). Changing
  it is an org decision, not a per-project one.
- **Icon buttons inside a data table share one size** — the density default,
  never a per-callsite override. Written down because it already slipped: one
  row hardcoded a larger size while the toolbar kept the default, inside the
  same table.

## 2.1.0 (2026-08-09)

`contracts/design.md` §Layout gains two rules aimed at the failure the
agreement exists to prevent — **feature 2 not matching feature 1**:

- **Page-level filters have one fixed home**: inside the card holding the data
  they filter, leading edge, widest scope → narrowest (period → org unit →
  status). Actions stay with the title; a filter row never hosts an action
  button; free-text search stays the table primitive's own and is never
  duplicated beside it. Added because "filter ซ้ายบ้างขวาบ้าง" across screens
  was the most visible consistency failure reported from a real project, and
  the contract previously pinned the page pattern but not this row.
- **Per-page config of a shared primitive is part of the agreement**: a
  data-table instance always carries a stable unique id (so column prefs
  persist identically everywhere), standard features stay on unless the
  page's own situation makes one meaningless, page size follows the org set.
  Same situation → same configuration.

Rendered for Next.js in `ugt-nextjs-platform` 3.1.0, which also makes the
id rule machine-checkable.

## 2.0.0 (2026-08-09)

**BREAKING — the naming + knowledge-architecture release.** Everything renamed
here keeps its old trigger words in the new skill's description, so old habits
still route correctly; only names and file layouts changed. Project-side
migration steps live in **ugt-nextjs-platform 3.0.0's CHANGELOG** (the
stack-facing entry) — this entry records the platform-side changes.

Renames (ชื่อสื่อหน้าที่จริง):

- `ugt-checkpoint` → **`ugt-handoff`** · project file `checkpoint.md` →
  `handoff.md`
- `ugt-mode` → **`ugt-model-mode`** · project file `mode.md` → `model-mode.md`
- contracts: `identity.md` → **`auth.md`** · `delivery.md` → **`cicd.md`**
  (one vocabulary per domain, matching the stack skills)

New knowledge architecture — two homes with a one-sentence rule each:

- `.claude/state/` = **ของสด** (always-loaded, short): `handoff.md` becomes a
  pure handoff file with new fixed sections **In progress / Next / Open
  Questions / Done (capped ~10)**.
- `docs/project-context/` = **ความรู้** (on-demand, grows): 7 files —
  `00-index.md` (the only always-loaded one) · `board.md` (feature board,
  moved out of requirements-brief) · `architecture.md` · `business-rules.md`
  (as-built) · `api.md` · `decisions.md` (append-only; every decision has
  exactly one home: design → `DESIGN.md` §10, everything else → here) ·
  `troubleshooting.md` (graduates to the stack pitfalls skill via PR when
  proven stack-wide).
- `project-notes.md` is **dissolved**: Open Questions → `handoff.md` ·
  Deviations → `⚠ deviation` lines in `architecture.md` · Error Patterns →
  `troubleshooting.md`.

New skill **`ugt-context`** — bootstraps `docs/project-context/` once:
skeletons on fresh projects, scan → draft → user review on existing codebases
(pointers into code, never mirrors; inferences marked `(assumption)`).
Ownership then passes to `/ugt-handoff`, which fans out every chunk's results:
handoff file + board status column + affected context files + appended
decisions, committed as one set. `ugt-requirements` gains the
requirement-change routing table (4 cases by board status; briefs freeze once
their feature is done) and now writes board rows to the new location.

`contracts/harness.md` rewritten to the new ownership table + 4-way knowledge
triage, and now names the drift check (`scripts/check-contract-drift.mjs`,
repo root) that verifies contract values against every stack-skill copy.

## 1.5.0 (2026-08-04)

New contract: **`contracts/design.md`** — the org UI design standard,
stack-agnostic, extracted from two production projects (`ugt-hrms`,
`gov-boi-smart`; evidence trail in the marketplace repo's
`docs/design-skill-draft.md`):

- **Iron rules (7)** — component-library-first escalation order, one icon
  set (never emoji), library-default sizes, central table component with the
  server-mode rule (server-paginated data must sort/filter server-side),
  central formatter only, accessibility floor (dual-cue status, labeled icon
  buttons, WCAG AA re-verified on change), and `DESIGN.md` as the design
  source of truth.
- **Org defaults** — primary indigo `oklch(0.488 0.243 264.4)`, cool-tint
  neutrals (hue ~258), the semantic-6 status token set, Inter + Noto Sans
  Thai, Thai typography rules (no uppercase eyebrows), `DD/MM/YYYY` Gregorian
  on screen / ISO in exported files, wall-clock-vs-instant timezone contract,
  shell/menu/mobile layout rules, the four motion rules, toast semantics.
- **Governance** — dated decision log (มติ) in every generated `DESIGN.md`,
  pending-decisions doc pattern, scan → draft → deviations flow for existing
  projects.

Rendered for Next.js by `ugt-nextjs-platform`'s new `ugt-nextjs-design-setup`
(that skill is the primary restatement to keep in sync). Generated `DESIGN.md`
files record the ugt-core version they were generated against, so the skill's
"sync" mode can diff a project after this contract changes.

`ugt-mode` gains the **`auto` preset** and Agent Teams coverage:

- **`auto`** — a fourth preset that judges the model **per task at dispatch
  time** instead of using a fixed column, on exactly three signals: ambiguity,
  blast radius (files/modules touched), and risk domain
  (auth/money/concurrency). E.g. write-code defaults to sonnet but escalates
  to opus in a risk domain or >5 files. All three design invariants still
  bind (reviewer never weaker than coder · diagnose ≠ fix · mechanical =
  haiku). `auto` never rewrites `mode.md` per task and never switches presets
  by itself — preset switching stays a human command, which is also why an
  "auto-pick-the-preset" meta-layer was rejected: choosing a preset per task
  *is* choosing a model per task, and letting it rewrite the committed file
  per task would churn the whole team's checkout.
- Wording broadened from "subagents" to **dispatched work** — the same
  `mode.md` table now explicitly covers Agent Teams teammate spawns (the
  decision point is identical: the lead picks `model:` at spawn). Agent Teams
  itself stays out of the plugin deliberately: it is an experimental
  user-level flag the plugin cannot enable, and the standards are
  dispatch-agnostic anyway (skills/rules/state load into every teammate via
  project context).
- `contracts/harness.md` — `mode.md` bullet updated (dispatched work, `auto`).
- `evals/evals.json` — new `switch-to-auto` case.
- The refreshed skeleton asset + CLAUDE-block line ship with
  `ugt-nextjs-platform` 2.4.0; existing projects just run `/ugt-mode auto`.

Same-day follow-up (no new behavior, verification + maintainability only):

- `evals/trigger-evals.json` — re-ran the boundary set (3 judges) after the
  description change above, plus new auto-specific queries (natural-language
  "เลือกความแรงตามงาน", explicit "ugt-mode auto") and a new near-miss trap
  ("ตั้งค่าให้ deploy อัตโนมัติ..." → correctly `ugt-nextjs-cicd-setup`, not
  `ugt-mode`, despite sharing the word "อัตโนมัติ"). **69/69 primary accuracy**
  — the wider description did not widen the trigger. See the
  `rerun_after_auto_preset` entry in the file for the method deviation note
  (judges ran with live tool access, not fully text-isolated).
- All five `contracts/*.md` files gain a **Maintenance** callout naming the
  exact skill(s) that restate their text and the version-bump step — added
  after noticing the duplication rule (`contracts/database.md`'s own opening
  line) had no concrete checklist attached to it.

## 1.3.0 (2026-08-03)

Feature-progress board — answers "which features are done" at a glance for
anyone reading the repo, without adding a new file or a third home for state:

- `ugt-requirements` — the overview's feature table gains a **สถานะ** column,
  initialized `☐ todo` on generation (values: `☐ todo` · `🔨 in progress` ·
  `⏳ blocked — <reason>` · `✅ done`)
- `ugt-checkpoint` — becomes the column's **only writer** after generation:
  step 3 updates the board to match the finished work chunk, and the
  verification checklist checks board ↔ checkpoint agreement. Single writer =
  the board cannot silently drift from the checkpoint narrative.
- One assertion added to each skill's `evals/evals.json` covering the column.

Rejected alternatives, recorded to prevent re-proposal: a separate
`STATUS.md`/`TASKS.md` board (third home for state, guaranteed drift —
violates the triage table) and ticking checkboxes inside superpowers plan
files (another marketplace's skill owns those; task-level detail is the wrong
altitude for monitoring anyway).

## 1.2.0 (2026-08-03)

New skill **`ugt-requirements`** — turns a raw requirements folder
(`docs/requirements/`) into a committed Thai-language brief:
`docs/requirements-brief/00-overview.md` (system purpose, user types, feature
table with dependencies, candidate tables, cross-cutting, system-level open
questions, sources coverage) plus one file per feature, each sized for handing
a single feature to the superpowers pipeline in its own session. Invariants:
every document conflict is promoted to an Open Question naming both sources
(never silently resolved) · unreadable files are listed as `unread` (never
skipped or invented) · inferences are marked `(assumption)` · an existing
brief is never overwritten without asking · the skill stops at the handoff —
it never designs or writes code, and never writes `.claude/state/` (open
questions flow there via `/ugt-checkpoint`).

- The "Which skill, when" row and README use-case update ship with
  `ugt-nextjs-platform` 2.3.0 (its CLAUDE-block gains a
  requirements-folder → `/ugt-requirements` row; the read-only row is
  narrowed so producing the brief routes to the skill while plain questions
  stay direct)

Evals (skill-creator loop, 2026-08-03): functional `evals/evals.json` —
with-skill **14/14 assertions vs baseline 7.5/14 (54%)**; the discriminating
cases: baseline self-resolved the seeded document conflict instead of raising
it, invented its own output location, and on re-run **overwrote the existing
brief without asking** (with-skill: asked first, files byte-identical).
Trigger boundary `evals/trigger-evals.json` — 20 queries × 3 judges =
**60/60 primary** on iteration 0 (all keyword traps held: `requirements.txt`,
translate-the-requirements, question-about-existing-brief, dev-time
estimation).

## 1.1.0 (2026-07-30)

New skill **`ugt-mode`** — per-task-type model routing for subagents via a
committed `.claude/state/mode.md` (presets `easy`/`default`/`god`; e.g.
default: plan/review/diagnose = fable, code/fix = sonnet, mechanical = haiku).
Invariants: planner/reviewer never weaker than the coder · diagnose and fix are
separate rows · verify-script runs stay haiku in every preset. Applies to
subagent dispatch only — the main session model remains the user's `/model`.

- `contracts/harness.md` — `mode.md` added to the file-ownership table
  (created once with `default`, rewritten only via `/ugt-mode`)
- The skeleton asset + CLAUDE-block import ship with `ugt-nextjs-platform`
  2.2.0 (its step 4); existing projects can just run `/ugt-mode default` once

Evals (skill-creator loop, 2026-07-30): trigger boundary
`evals/trigger-evals.json` — 20 queries × 3 judges = **60/60 primary** on
iteration 0 (all keyword traps held: "model รถยนต์" → pitfalls, "ประหยัด token
เวลาคุย" → none, "เปลี่ยน model หลัก" → /model). Functional
`evals/evals.json` — with-skill **9/9 assertions**; baseline also 9/9 *because
the fixture already contained the self-documenting `mode.md`* (the harness
asset carrying the knowledge is the design working as intended — baseline
matched the god preset only by inference, and took ~1.8× longer on the switch
case). The skill's value is guaranteeing exact preset tables + the /model
boundary without relying on that inference.

## 1.0.0 (2026-07-29)

First release — extracted from `ugt-nextjs-platform` v1.0.0 per
`docs/multi-stack-proposal.md` §1. Everything here moved verbatim or was
extracted from existing normative text; nothing was newly invented.

### Runtime pieces (installed, active)

- `skills/ugt-checkpoint/` — team-state handoff skill (moved verbatim; its
  name was deliberately left stack-unqualified in v1 for exactly this move)
- `hooks/hooks.json` + `scripts/audit-log.mjs` — metadata-only audit trail on
  `PostToolUse` / `PostToolUseFailure` / `InstructionsLoaded` (moved verbatim)

### Normative contracts (authoring-time — not loaded into any session)

- `contracts/database.md` — DB naming, audit columns, read-only/override rules
- `contracts/delivery.md` — 10-stage pipeline, branch model, Quality Gate
  thresholds, credential naming, secret rules
- `contracts/identity.md` — Keycloak realm/client policy, session policy,
  RBAC shape, guard order, mandatory audit events
- `contracts/harness.md` — the CLAUDE.md marker-block / rules / state /
  settings-merge mechanism
- `contracts/org-managed-settings.md` — IT hard-boundary deployment guide
  (moved from ugt-nextjs-setup/references/)

Stack platforms deliberately duplicate contract text inside their own skills
(self-containment rule); these files are the canonical source to diff against
when standards change.
