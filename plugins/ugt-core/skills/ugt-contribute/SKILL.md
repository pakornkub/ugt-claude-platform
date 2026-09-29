---
name: ugt-contribute
description: >
  Use when a gotcha found while working in a project turns out to be true for
  EVERY project on the org stack and should graduate into the platform plugin
  — "ส่ง PR ไป platform", "อัพเดทกลับ plugin", "ยกขึ้น pitfalls", "เอาบั๊กนี้เข้า
  skill", "ให้ทีมอื่นไม่ต้องเจออีก", "contribute กลับ", or when `/ugt-handoff`'s
  triage lands on "true for every project on this stack". Lifts ONE proven
  troubleshooting entry (or the bug just fixed) into the owning platform skill
  as a PR — after explicit confirmation — and removes it from the project. Reach for it even when the user
  only hints ("อันนี้น่าจะเจอทุกโปรเจค", "น้องทีมอื่นก็เจอ") — the alternative is the
  gotcha staying in one repo. Don't use for project-only bugs (→ /ugt-handoff
  writes troubleshooting.md), design decisions (→ DESIGN.md §10), or to edit
  the installed plugin files under the plugin cache — they are disposable and
  nobody else gets the fix.
---

# UGT Contribute — graduate a project gotcha into the platform

`/ugt-handoff` ends its triage with "true for every project on this stack → PR
against the platform repo". This skill is that step. Knowledge flows **one
way**: project `troubleshooting.md` → platform skill → every project on the
next `/plugin update`. It never lives in both places.

Platform repo: `https://github.com/pakornkub/ugt-claude-platform` (marketplace
`ugt`). Push rights belong to the platform maintainer — if the push is
rejected, stop and hand over the patch (see §5); never work around it.

## 0. Pick the entry

Source is one of:

- a line in `docs/project-context/troubleshooting.md` — the user names it, or
  list the entries and ask which one;
- the bug fixed **in this session** that the user wants lifted directly — then
  there is nothing to delete later (§6), but §1 still applies.

One entry per run. Two gotchas = two PRs; a reviewer can accept one and reject
the other.

## 1. Gate — is it really stack-wide?

Answer all three before touching the platform. Any **no** → it stays in the
project's `troubleshooting.md` and you say so in one line.

| Question | Yes looks like | No looks like |
| --- | --- | --- |
| Does the cause live in the **stack**, not this project's data or rules? | Prisma/MSSQL, Keycloak, Jenkins/Sonar, shadcn/Base UI, next-intl, Docker/compose behaviour | a business rule, a column name, this project's cron schedule |
| Would a **second project** on the same stack hit it by following the platform skills as written? | the skill's asset or instruction produces the bug | it needed a project-specific deviation to happen |
| Is the fix **proven** — shipped or tested, not a hypothesis? | in production / test passes / reproduced then gone | "น่าจะ", still being diagnosed |

Borderline (stack-caused but only under one project's setup) → still a **no**
for now; write the condition into the project entry and revisit when a second
project hits it.

## 2. Which platform skill owns it

Read the installed plugin's `skills/*/SKILL.md` descriptions; the owner is the
skill whose description already lists symptoms of this kind.

| Gotcha is about | Owner | Where the entry goes |
| --- | --- | --- |
| Feature code on Next.js (dates, queries, fetches, forms, tables, render loops) | `ugt-nextjs-pitfalls` | the matching `references/*.md` (dates-timezones · data-fetching · form-validation · hardening) + one row in the SKILL.md symptom table |
| Something a `*-setup` skill installs (login loop, pipeline red, upload 413, mail never arrives, token drift) | that `ugt-<stack>-<area>-setup` skill | its "symptoms with a documented cause" table / troubleshooting section; the asset itself if the asset is the bug |
| SonarQube rule that keeps failing the gate | `ugt-nextjs-clean-code` | the rule table |
| Python / PHP (deploy-only stacks, no pitfalls skill yet) | `ugt-<stack>-cicd-setup` | its troubleshooting section |
| Cross-stack org rule (naming, audit columns, secret handling) | `ugt-core/contracts/*.md` **first**, then the stack skill that renders it | contract + rendering skill, same PR |

New reference file only when none of the existing ones fits — and then add it
to the skill's "Which reference, when" table, or nobody will read it.

## 3. Work in a scratch clone

Never edit the plugin cache and never assume a platform checkout exists on
this machine. `$SCRATCH` = the session scratchpad directory.

```bash
gh repo clone pakornkub/ugt-claude-platform "$SCRATCH/ugt-claude-platform"
cd "$SCRATCH/ugt-claude-platform"
git switch -c contribute/<stack>-<slug>      # e.g. contribute/nextjs-select-empty-value
```

Read the owner skill's file **before** writing — match its section numbering,
table columns and tone; an entry that looks pasted in gets rewritten by the
reviewer.

## 4. What to write

**The entry** — same shape everywhere; the reference file's own `## N. <title>`
numbering continues:

```markdown
## N. <short title — the symptom a developer would search for>

**Symptom.** <what was seen — the Thai phrase the team used, the error text>
**Root cause.** <the mechanism, with the real file/function/config names>
**Fix.** <what to write instead — a code block when code is involved>
**Origin.** <project> · <YYYY-MM-DD>
```

Then, in the same PR:

- **Symptom table row** in the owner SKILL.md (`Symptom | Root cause | Reference`)
  so the skill surfaces it without the reader opening the reference.
- **Description phrase** — add the user-facing symptom wording to the skill's
  `description:` only if a developer would *describe* it that way to Claude
  (e.g. "วันที่เลื่อน −1"). Skip for internal mechanisms nobody types.
- **CHANGELOG** of the plugin — new top section `## x.y.z (YYYY-MM-DD)`, a bold
  Thai headline, then the symptom → cause → fix in two or three lines, and the
  origin project. Match the existing entries' format.
- **Version bump** in `plugins/<plugin>/.claude-plugin/plugin.json`: **patch**
  for a new entry or table row (nothing for projects to do), **minor** if an
  asset that projects copy into their repo changed (kit-sync will offer it).
- **Version chips** — `README.md` plugin table and `docs/web/index.html`
  version card must show the new number; `scripts/check-contract-drift.mjs`
  fails otherwise.

Verify from the clone root before showing anything:

```bash
node scripts/check-contract-drift.mjs && node scripts/check-doc-status.mjs
```

## 5. Show, confirm, push, PR

Opening a PR publishes outside this machine, so it needs the user's explicit
yes — print, then stop:

1. `git diff --stat` + the full diff of the entry and CHANGELOG
2. The PR title and body you intend to send

Title: `feat(<plugin-short>-<version>): pitfall <slug>` — e.g.
`feat(nextjs-4.63.2): pitfall select-empty-value`. Body: symptom / cause / fix
in three lines, origin project, which skill + file it landed in, version bump
reason. End the body with the attribution line the session's system reminder
prescribes.

Only after the yes:

```bash
git add -A && git commit -m "<title>" -m "<body>"
git push -u origin contribute/<stack>-<slug>
gh pr create --base main --title "<title>" --body-file <body.md>
```

Push rejected (403 / permission) → you are not the maintainer. Write the patch
with `git format-patch main --stdout > "$SCRATCH/<slug>.patch"`, tell the user
to hand it (or the entry text) to the platform maintainer, and continue with
§6 only if they say the PR was opened. Don't fork, don't retry.

Print the PR URL, then remove the clone — it is disposable:

```bash
rm -rf "$SCRATCH/ugt-claude-platform"
```

## 6. Back in the project

- Delete the entry from `docs/project-context/troubleshooting.md`. If the list
  is now empty, restore the `_(none yet)_` placeholder.
- Do **not** commit here and do **not** edit `handoff.md` — that is
  `/ugt-handoff`'s job. Tell the user the PR URL so the next handoff records
  "ยก <slug> ขึ้น platform — <PR URL>" under Done and commits the deletion
  together with the rest of the chunk.
- Remind once: the team gets this on `/plugin update` **after** the PR is
  merged and tagged, not when it is opened.

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| One entry, one PR | Bundle every gotcha of the sprint into one PR |
| Gate first (§1) — a no is a fine answer | Lift something because the user is excited about it |
| Owner = the skill whose description already lists that symptom kind | Default everything into pitfalls |
| Scratch clone, match the file's existing format | Edit the plugin cache, or a platform checkout you happened to find |
| Show diff + PR text, wait for the explicit yes | `gh pr create` in the same breath as the edit |
| Delete the project entry after the PR exists | Keep it "for reference" — two copies drift |
| Version chips in README + index.html move with plugin.json | Bump plugin.json alone (drift-check goes red) |

## Verification Checklist

- [ ] §1 answered yes ×3 in the transcript (or the run stopped with the reason)
- [ ] Entry sits in the owner skill's existing structure, numbered/tabled like its neighbours
- [ ] SKILL.md symptom row added; description phrase added only if user-facing
- [ ] CHANGELOG section + plugin.json bump + README/index.html chips agree; both check scripts exit 0
- [ ] Diff and PR text were shown and the user said yes before push
- [ ] PR URL printed; scratch clone removed
- [ ] Project `troubleshooting.md` entry deleted; user told to run `/ugt-handoff`
