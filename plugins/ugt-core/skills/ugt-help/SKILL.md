---
name: ugt-help
description: >
  Tell the user where their project stands on the org setup and the ONE or two
  things to do next — plus which ugt helpers run on their own and which they
  must ask for. Reads the project's files (no writes, no installs) and answers
  in a few lines. Use when the user says "/ugt-help", "help", "เริ่มยังไง",
  "ต้องทำอะไรก่อน", "ลง plugin แล้วทำไงต่อ", "ใช้ตัวไหนตอนไหน", "มีคำสั่งอะไรบ้าง",
  "อันไหนทำเองอันไหนต้องสั่ง", "ตอนนี้โปรเจคถึงไหนแล้ว", or seems lost right after
  installing an ugt plugin. Do NOT use to run a setup (→ the step it names),
  to record work (→ /ugt-handoff), or to explain one skill in depth — answer
  that directly from the skill itself.
---

# UGT Help — where am I, what next

A router, not a manual. The user wants to know what to do **now**, so read the
project, pick the next step, and stop. Never dump the whole skill catalogue —
the `/` menu already lists it.

Read-only: look at files, write nothing, start no setup. If the user answers
"ทำเลย" afterwards, invoke the named skill then.

## 1. Read the project (quietly — one batch of checks)

| Check | Means |
|---|---|
| `package.json` has `next` · `pyproject.toml`/`requirements.txt` · `composer.json` | stack: Next.js · Python · PHP |
| `CLAUDE.md` contains `<!-- ugt:start` | Next.js full-setup harness installed (Python/PHP don't write one) |
| `docs/requirements/` has files · `docs/requirements-brief/00-overview.md` exists | requirement docs present · already summarised |
| `docs/project-context/00-index.md` | team knowledge base exists |
| `.claude/state/handoff.md` (its "In progress" / "Next") | work in flight |
| `docs/DESIGN.md` | design agreement done (Next.js) |
| `Jenkinsfile` | CI/CD done |
| `docs/project-context/board.md` | feature status |

Pipeline (Next.js): `CODING_STANDARDS.md` at the root, or `mattpocock-skills:*`
skills in this session → **mattpocock**; `superpowers:*` skills → **superpowers**.

Which ugt skills exist in this session tells you which plugins are installed —
recommend only skills that are actually listed.

## 2. Pick the next step — first row that matches wins

| State | Next step |
|---|---|
| No stack plugin skills (only `ugt-core`) | install the stack bundle: `/plugin install ugt-nextjs-standard-superpowers@ugt` (or `-mattpocock`, `ugt-python-platform`, `ugt-php-platform`) → `/reload-plugins` |
| `docs/requirements/` has docs, no brief | `/ugt-requirements` |
| Next.js, no `ugt:start` block | `/ugt-nextjs-full-setup` (asks once, installs database → test-lint → design → auth → cicd) |
| Python / PHP, no `Jenkinsfile` | `/ugt-python-cicd-setup` · `/ugt-php-cicd-setup` |
| Setup done (`ugt:start` block or `Jenkinsfile`), no `docs/project-context/` | `/ugt-context` |
| `handoff.md` has "In progress" | continue that item — quote it |
| Brief exists, board has unbuilt features | build one feature per session — superpowers: "สร้าง feature X ตาม docs/requirements-brief/NN.md" · mattpocock: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement` |
| Everything present | nothing to set up — just describe the work; end each chunk with `/ugt-handoff` |

## 3. Answer — Thai, short, this shape

```
**โปรเจคนี้ตอนนี้:** <stack> · <2–4 ข้อที่มี/ยังไม่มี>

**ทำต่อ:** <คำสั่งหรือประโยคที่พิมพ์ได้เลย> — <เหตุผลครึ่งบรรทัด>
(ถ้ามีขั้นที่สอง ใส่อีกบรรทัดเดียว)

**ทำงานเอง ไม่ต้องสั่ง:** <บรรทัดเดียว ไม่เกิน 3 อย่างที่เกี่ยวกับงานถัดไปที่สุด>
**ต้องสั่งเอง:** <บรรทัดเดียว — `/ugt-handoff` ก่อนเสมอ + อีกไม่เกิน 2>
```

The whole answer fits on one screen (~15 lines). The full lists below are
for choosing from, not for copying out.

Two steps at most, counted honestly: no third step slipped in as a
conditional ("ถ้ามี requirement ให้…") or a side note ("ข้อสังเกต: ควรติดตั้ง…").
What comes after those two, the user gets by asking `/ugt-help` again.

If the user asked something narrower ("อันไหนทำเอง"), answer only that part.

## What runs by itself vs what the user must ask for

Every ugt skill can be picked by Claude when the request matches its
description — but some moments nobody will ever "request", so they only happen
when the user says so.

**Runs by itself**

- Claude loads it when the work touches its area: `ugt-nextjs-clean-code`
  (any code edit), `ugt-nextjs-pitfalls` (dates, cache, basePath …),
  `ugt-nextjs-database-setup` (schema / SQL), `ugt-nextjs-auth-setup`
  (permissions), design rules from `docs/DESIGN.md` (UI work), cicd skills when
  a pipeline goes red.
- superpowers pipeline: brainstorming → plan → TDD → review starts on its own
  from "สร้าง feature X".
- Hooks (no tokens): audit log of every tool call → `.claude/logs/`; a warning
  at session start if an `@ugt` plugin is installed at project scope; with
  `ugt-devops-mcp`, a warning if the old Jenkins/SonarQube MCP scripts are
  still configured.

**Must be asked for**

- `/ugt-handoff` — end of every work chunk ("จบงานแล้ว", "บันทึกไว้"). Skipping
  it means the next session starts blind.
- `/ugt-nextjs-kit-sync` — after every `/plugin update`.
- `/ugt-model-mode` — change the model preset (default `auto`).
- `/ugt-contribute` — when a fixed gotcha is true for every project.
- mattpocock pipeline: every step is typed by the user
  (`/implement` then runs `/tdd` and `/code-review` itself).

## Red flags

| Don't | Instead |
|---|---|
| List every skill | Name the 1–2 that apply now |
| Start the setup because it is "obviously next" | Say the command; wait for "ทำเลย" |
| Recommend a skill not listed in this session | Tell them which plugin to install first |
| Guess state you didn't check | Read the file, or say "ยังไม่ได้เช็ค" |
