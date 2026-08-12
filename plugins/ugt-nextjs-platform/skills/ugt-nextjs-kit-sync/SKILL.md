---
name: ugt-nextjs-kit-sync
description: >
  Use after `/plugin update` on a project that installed any ugt-nextjs skill —
  "sync kit", "อัปเดต plugin แล้ว ไฟล์ในโปรเจคตามไหม", "component ตกรุ่นไหม",
  "เอา fix ใหม่ของ data-table เข้าโปรเจค" — to find which copied kit files
  (components/ui, lib, auth pages, …) are behind the plugin's current assets,
  then update or merge each one WITH the user's consent. Every kit file carries
  a `// kit:` version+hash stamp, so the checker can tell "outdated but never
  touched" (safe to overwrite) apart from "outdated and the project edited it"
  (must merge). Also the answer when a bug the CHANGELOG says is fixed still
  reproduces in a project — the local copy is probably old.
  Not for updating the plugin itself (→ `/plugin update`), not for design-token
  or DESIGN.md drift (→ design-setup's "sync ข้อตกลง design"), and useless on a
  project that never installed the kit.
---

# UGT Kit Sync — bring copied kit files up to the installed plugin version

## 1. Why this exists

Skills **copy** their assets into the project (`components/ui/data-table.tsx`,
`lib/format.ts`, auth pages, …). That is deliberate — the project owns, builds
and may edit those files. The cost: `/plugin update` updates the *knowledge*
but the copies sit still. HRMS shipped the founding example: the plugin fixed
`scrollX` clipping data, and the project that discovered that bug kept its old
copy for weeks.

Every asset ships with two stamp lines (baked at release):

```ts
// kit: ugt-nextjs-platform 4.13.0 · ugt-nextjs-design-setup/ui/data-table.tsx
// kit-hash: 5bbf4107cc5f   ← hash of the file as installed (stamp lines excluded)
```

Version answers "is it behind"; hash answers "did the project touch it".

## 2. Workflow

### Step 1 — Report (never skip to writing)

```bash
node <skill-dir>/scripts/check-kit-freshness.mjs          # or --json
```

| State | Meaning | Proposal |
| --- | --- | --- |
| ✔ CURRENT | equals the plugin's current asset | nothing |
| ↑ UPDATE | outdated, byte-identical to what was installed | overwrite with the new asset |
| ⇄ MERGE | outdated **and** the copy differs from what was installed | merge — never overwrite |
| ✘ REMOVED | plugin no longer ships this asset | read the CHANGELOG; usually rename or retire |

Show the user the table plus the CHANGELOG headings between the stamped
version and the current one, then ask **per file** (or "ทำตามข้อเสนอทั้งหมด").
No consent, no writes.

**MERGE includes placeholder files by design.** A file whose `__…__`
placeholders were substituted at install differs from its stamp forever —
indistinguishable from a real edit, and the careful path is correct for both.

### Step 2 — Apply

**UPDATE**: copy the plugin asset over the project file (the fresh stamp comes
with it). If the asset contains `__…__` placeholders, pull the real values out
of the file being replaced and re-substitute — overwriting a configured file
with raw placeholders breaks the build in the most confusing way available.

**MERGE** — a semantic three-way merge; you are the merge tool:

1. Read the project's file, the plugin's new asset, and the CHANGELOG entries
   between the two versions (they state *what* changed and *why*).
2. Produce one file that has **both** the plugin's changes and the project's
   own edits. The project's edits win on conflict — flag the conflict to the
   user instead of silently picking the plugin side.
3. Keep the new asset's two stamp lines verbatim. The merged file will report
   MERGE again next round — truthful, since it still differs from the asset.

**REMOVED**: follow the CHANGELOG (usually a rename → treat as UPDATE at the
new path, or a retirement → propose deleting the copy).

### Step 3 — Close out

- Append a dated มติ to `docs/project-context/decisions.md`: which files were
  updated/merged/kept, from which version to which.
- Run the owning skills' `verify.mjs` for every touched area (design/auth/…)
  and the project's tests. **A merge that doesn't compile is worse than the
  outdated file** — never leave without a green build.

## 3. Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Report first, write only after consent | Overwrite anything silently — the whole point is that projects own these files |
| Re-substitute placeholder values on UPDATE | Ship `__LINKED_SERVER__` back into a configured project |
| Merge = plugin's changes + project's edits, conflicts surfaced | Pick the plugin side on conflict without asking |
| Keep the asset's stamp lines intact | Hand-edit a stamp (the hash stops meaning anything) |
| Run verify + tests before closing | Trust that a semantic merge compiled |
| Old un-stamped files: match them to assets by path, then treat as MERGE | Assume no stamp = not a kit file |

## 4. Verification checklist

- [ ] `check-kit-freshness.mjs` re-run after applying → previously-UPDATE files
      now CURRENT; merged files still MERGE (expected) but on the new version
- [ ] `npm run build` + tests pass
- [ ] Owning skills' `verify.mjs` green for touched areas
- [ ] มติบันทึกใน `docs/project-context/decisions.md`
