# Handoff

Last updated: 2026-09-11

## In progress
- **plugin เครื่องนี้ยังไม่ update** — repo อยู่ที่ nextjs 4.62.2 / core 2.12.1
  แล้ว แต่เครื่องนี้ยังอยู่ nextjs 4.61.0 — รอ `/plugin marketplace update ugt` +
  `/plugin update ugt-nextjs-platform` + `/reload-plugins`
- field report AI Studio (2026-09-09) — แก้ platform แล้ว (4.61.0) แต่**ยังไม่ได้
  ยืนยันอาการที่ 3** ("template default เองก็เพี้ยน") จากโปรเจคจริง: สมมติฐาน
  = Tailwind v3 (`@tailwind base;`) ที่ token file v4-only ถูกมองข้าม — รอค่า
  `tailwindcss` ใน package.json + 3 บรรทัดแรก `app/globals.css` จากน้อง

## Next
- Post-deploy standard — รอเจ้าของระบบตอบเช็ค infra 8 ข้อ (docs/backlog.md §1, เลื่อนไว้ 2026-08-12)
- ugt-python-platform / ugt-php-platform 0.6.0 — รอ pilot พิสูจน์ซ้ำก่อน tag (README ตาราง plugin)
- E2E Playwright skill — เลื่อนโดยมติผู้ดูแล 2026-08-10 (docs/backlog.md §2)
- Pilot bundle mattpocock กับโปรเจคจริง 1 ตัวก่อนแนะนำวงกว้าง (walkthrough + setup-matt-pocock-skills ยังไม่เคยถูกใช้จริง)

## Open Questions
- เช็คความพร้อม infra 8 ข้อของ post-deploy standard — เจ้าของระบบเป็นคนตอบ (รายการอยู่ docs/backlog.md §1)
- โปรเจค ugt-customer-request: root cause ของ `SCANNER_UNAVAILABLE` ยังไม่ได้ diagnose จบ (ถอด scan ออกชั่วคราวแล้ว — ยังไม่เห็นบรรทัด `virus scan unavailable <สาเหตุ>` ใน log แอป) ตอน retrofit ให้ไล่ตาม SKILL.md upload-setup §7
- ทีมที่ใช้ `ugt-nextjs-standard` เดิม (ก่อน split) ต้องประกาศ migration: `/plugin install ugt-nextjs-standard-superpowers@ugt` + ลบ key เก่าใน settings.json (รายละเอียด CHANGELOG 4.56.0) — ยังไม่ได้ประกาศ

## Done (newest first — keep only ~10; older history lives in git and CHANGELOG)
- 2026-09-12 ugt-core **2.12.1** — `ugt-model-mode` eval 4 (dispatch-plan-before-spawn)
  รัน baseline ครั้งแรก **5/5 PASS** (executor+grader subagent, fixture โปรเจค
  จริงที่มี model-mode.md โหมด auto): dispatch plan พิมพ์ก่อน spawn จริง,
  review → fable (auth risk domain), test → haiku, model ที่ dispatch ตรงแผน
  ทุกแถว, ไม่หยุดรอ confirm, ไม่แก้ model-mode.md — ไม่มี defect ต้องแก้ · เก็บกวาด
  branch/worktree ค้างทั้งหมดเสร็จ (local branch เหลือแค่ main, remote เหลือแค่
  main, worktrees ว่าง) · commit + tag แล้ว
- 2026-09-11 **merge** `claude/wizardly-dijkstra-ev60pz` เข้า main — ugt-core
  **2.12.0** + ugt-nextjs-platform **4.62.0** (model-mode dispatch plan, ดูรายละเอียด
  แถวถัดไป) รวมกับ 4.61.2–4.61.4 (preserve mode baseline) ที่ค้าง push อยู่ก่อนหน้า ·
  conflict 5 ไฟล์ (plugin.json version, README/index.html version chip,
  CHANGELOG.md ลำดับรุ่น, handoff.md) แก้แบบ union ไม่ทิ้งเนื้อหาฝั่งไหน · tag ครบ
  ทั้ง `ugt-core--v2.12.0`, `ugt-nextjs-platform--v4.62.0`, `--v4.61.2/.3/.4` · push แล้ว
- 2026-09-10 ugt-core **2.12.0** + ugt-nextjs-platform **4.62.0** — ตอบคำถาม
  ผู้ดูแล "spawn sub agent ใช้ model เหมาะไหม / โชว์แผนก่อนไหม": การเลือก model
  ต่อประเภทงานมีอยู่แล้ว แต่ไม่มีกติกาให้โชว์แผนก่อน และ audit log ไม่เก็บ model
  → เพิ่ม **dispatch plan** (ตาราง Work · Task type · Model · Why ก่อน spawn ชุดแรก
  แล้วทำต่อ ไม่หยุดรอ confirm) ใน SKILL.md + template ทุก preset + CLAUDE-block,
  audit-log เก็บ `model`/`subagent_type`, **ค่าเริ่มต้นโปรเจคใหม่เป็น `auto`**
  (asset, harness.md, full-setup step 4, verify msg, README, index.html chip
  auto), eval 4 ใหม่, drift check ข้อใหม่ (22/22 ผ่าน) · **ยังไม่ tag/ยังไม่รัน eval**
  (ปิดแล้วในรอบ merge ด้านบน — tag ไปแล้ว)
- 2026-09-11 ugt-nextjs-platform **4.61.4** — baseline eval ที่เหลือครบ: database
  #1 fresh-DB 10/10, #2 existing+SP+linked-server 7/7, #3 reserved-word 6/6 ·
  auth sidebar #1 fresh-no-shell 3/3, #2 existing-menu RBAC 5/5 · full-setup #5
  defer-migration 6/6 · แก้ 8 finding ของ grader: prisma.config.ts dotenv quiet
  (migration SQL พัง), migrations.md แยกทาง existing-DB, linked-server ต้องถามชื่อ
  4 ส่วน, `CHANGE_ME_DB_USER/PASSWORD` เป็นกติกา, ไม่แต่งตาราง domain เอง,
  database verify รองรับ `docs/adr/` (2 รอบ — รอบแรก regex ยังพลาด ยืนยันแล้วว่า
  แก้ตรง), `shadcn add sidebar` เตือนเรื่องทับ scale-bridge, `SESSION_COOKIE_NAME`
  อธิบายเหตุผล 'use server' · executor ดับกลางทาง 2 รอบ (session ดับ + 429 rate
  limit) ต้อง reset + rerun หลายรอบ · commit + tag แล้ว ยังไม่ push
- 2026-09-10 ugt-nextjs-platform **4.61.3** — baseline ที่เหลือ: database eval 4
  **9/9** + auth sidebar-eval 0 **8/8** (รันต่อเป็นสาย design → database → auth บน
  โปรเจคเดียว) · แก้ finding ของ grader: `CreatedBy` ยึด NOT NULL + marker
  `'prototype-import'`/`'system'` (reference เคยขัดกันเอง), pin `zod@^4`
  database+auth, `[METHOD: LOCAL]` บน `users:create`/`users:reset-password`,
  auth §5.1 `--legacy-peer-deps` (better-auth peer vitest ^2–4 vs org ^5), auth
  verify จับ shell ที่สองที่สร้างมือใน `(admin)`, database verify บอกชื่อไฟล์ที่ใช้
  prisma · backlog §11 +2 (NavUser บังคับ SidebarProvider · migrations.md ขาด path
  offline) · commit + tag แล้ว ยังไม่ push
- 2026-09-09 ugt-nextjs-platform **4.61.2** — eval baseline รอบแรก: design eval 8
  **10/10**, full-setup eval 4 **17/18** (FAIL เดียวเป็นช่องว่าง skill) · แก้ 6 finding
  (design verify site-header gate ยึด SidebarInset/<Sidebar> ใน layout · DataTable-id
  ข้าม JSDoc · `cn` package ห้ามถอด · admin-handoff path เก่า · `@types/mssql` ·
  auth asset รับ Base UI 1.8 `null`) · **ฟ้อนต์ใน preserve mode = ข้อ 10 default
  คงเดิม** (มติ (c)) · commit + tag แล้ว
- 2026-09-09 ugt-nextjs-platform **4.61.1** — evals ปิดช่องที่ทำให้ 4.20.0/4.22.0
  "ผ่าน test แล้วยังหลุด": (1) eval เดิมบอกสถานการณ์ใน prompt (2) design eval 3
  ไม่มี fixture + assert แค่ record ไม่ใช่ outcome (3) `fixtures/with-shell` ของ
  benchmark 4.20.0 ไม่เคย commit + sidebar-evals ไม่มี assertions → รันซ้ำไม่ได้ ·
  เพิ่ม fixture จริง `ugt-nextjs-full-setup/evals/fixtures/ai-studio-prototype/`
  (15 ไฟล์ ใช้ร่วม 4 skill) + full-setup eval 4–5, design eval 8 (+ assertion
  outcome ใน eval 3), database eval 4, auth sidebar-evals เขียนใหม่พร้อม
  assertions · JSON/path/drift ผ่าน · commit + tag (`ugt-nextjs-platform--v4.61.1`)
  + push แล้ว · **ยังไม่ได้รัน eval จริง** (ดู In progress)
- 2026-09-09 ugt-nextjs-platform **4.61.0** — **preserve mode**: full-setup §2
  Q0 "ของเดิมที่ใช้งานอยู่ — คงไว้ไหม" (default คงของเดิม) เป็นข้อบังคับที่ส่งลงทุก
  skill ลูก (ระดับ token + shell, มติ 2026-09-09) + Q0b ย้าย prototype store /
  Q0c ถอด fake login · design: scan ห้ามข้าม, ห้ามลง shell block ถ้ามี shell
  เดิม, Tailwind v3→v4 ก่อน init · auth: §5.6 merge mandatory + §5.7 ถอด
  prototype login · database: §4b migrate prototype data layer +
  references/prototype-migration.md · verify ใหม่ 6 ข้อ (ทดสอบ fixture ทั้ง
  บวก/ลบ) · แก้ drift README/index.html ที่หลุดตอน 4.60.0 · ที่มา: field report
  น้องรัน full-setup บนโปรเจค Google AI Studio "ใช้ design เดิม" → ยังรัน
  SQLite/mock + admin pages เป็น template แยกบน indigo default · commit + tag
  (`ugt-nextjs-platform--v4.61.0`) + push แล้ว · เครื่องนี้อัปเดต plugin เป็น nextjs 4.61.0 แล้ว
- 2026-09-09 ugt-nextjs-platform **4.60.0** — upload-setup: virus scan (ClamAV)
  เปลี่ยนจาก default-on (มติองค์กร 2026-08-09) เป็น **opt-in** (default: ไม่เอา)
  — ที่มา: ภาระ deviation ceremony ทุกโปรเจคที่ไม่เอา scan ไม่คุ้มกับต้นทุน infra
  จริง (RAM ~2GB, signature DB ~1GB ต้องมี outbound internet) marker `[SCAN]`
  ทุกจุดกลับทิศ (เพิ่มเมื่อเลือกเปิด แทน ตัดเมื่อไม่เอา), asset default พลิก
  (`scanStatus` เริ่มที่ `'unscanned'`, ไม่ import `scanBuffer`), verify.mjs
  ตัดข้อบังคับ `⚠ deviation` ออก · commit 68572af + tag
  (`ugt-nextjs-platform--v4.60.0`) + push แล้ว · เครื่องนี้ข้ามไป update เป็น 4.61.0 โดยตรง
- 2026-09-06 ugt-nextjs-platform **4.59.1** + ugt-core **2.11.1** — description ทุก skill ≤ 1,024 ตัวอักษร (7 ตัวเคยเกิน) รายละเอียดอาการย้ายไป body "When to use" · database-setup เพิ่มอาการ SP timeout · trigger-evals รอบใหม่ primary 558/558 + database-setup 48/48, kit-sync baseline แรก 30/30 · label 6 ข้อแก้ให้ตรงจริง (docs/backlog.md แถว kit-sync ปิดแล้ว) · commit + tag (`ugt-core--v2.11.1`, `ugt-nextjs-platform--v4.59.1`) + push แล้ว · เครื่องนี้อัปเดต plugin เป็น core 2.11.1 / nextjs 4.59.1 / php 0.6.2 / python 0.6.2 แล้ว
- 2026-09-06 ugt-nextjs-platform **4.59.0** + ugt-core **2.11.0** — ยึด pipeline skill เป็นหลัก ตัดของซ้ำฝั่ง mattpocock (ที่มา: เทียบไฟล์จริงจาก pilot dx-game กับ mattpocock-skills 1.2.3): mattpocock ไม่มี `decisions.md` (มติ → `docs/adr/`, ugt-context/handoff/harness.md รู้กฎ "บ้านมติที่เดียว"), `ugt-requirements` thin mode (ช่องว่าง → `/wayfinder`/`/grill-with-docs`), asset ใหม่ `CODING_STANDARDS.md` ให้ `/code-review` ของ matt เห็น `.claude/rules/`, CLAUDE-block แถว requirements แก้เป็น brief → grill → to-spec (เดิมข้าม grill) + แถวกัน auto-invoke ย้ายเข้า span superpowers + กฎ `.scratch/` ระดับ ticket, Close out บอกให้รัน `/setup-matt-pocock-skills` เอง, verify.mjs ตรวจ decision home + CODING_STANDARDS (ทดสอบ 3 เคสผ่าน) · superpowers ไม่ตัดอะไร · drift 21/21, validate ผ่าน · commit 2aa130b + tag + push แล้ว
- 2026-09-01 ugt-nextjs-platform **4.57.0** — ปิดช่อง skill auto-trigger ระหว่าง full-setup: guard §2.5 ขยายจาก superpowers-only เป็นครอบ `mattpocock-skills` (5 ตัว model-invocable ที่ trigger ชน setup ได้: writing-for-agents/wizard/diagnosing-bugs/tdd/domain-modeling) + `frontend-design` · CLAUDE-block routing rows เปลี่ยนเป็นถ้อยคำ pipeline-neutral นอก span (แถว infra ไม่หายในเคสไม่มี pipeline) · harness step 1 เพิ่มกติกาเคส none · verify.mjs check ใหม่จับ `[PIPELINE` ค้าง · ผ่าน opus review 2 รอบ (7 findings → แก้ครบ) · docs: คำอธิบายส่วนต่าง token สอง bundle (ประมาณการ — รอเลขจริงจาก pilot) + แก้การ์ด mattpocock/โลโก้ footer ใน index.html · **push + tag แล้ว** (`ugt-nextjs-platform--v4.57.0` ครอบชุด 4.56.0 ที่ไม่ได้ tag แยก; `ugt-core--v2.9.2` tag ไว้ก่อนแล้ว)
- 2026-09-01 แก้ครบ 13 findings จาก /code-review อิสระหลัง bundle split — ugt-nextjs-platform **4.56.0** (CLAUDE-block generate ตาม bundle ด้วย marker `[PIPELINE:*]`, merge ลบ key ตาย `ugt-nextjs-standard@ugt`, fallback ถามแทนเดา, verify.mjs จับ stale key), ugt-core **2.9.2** (IT redeploy note), drift-check +5 pins (รวม bundle parity), docs sync (setup step, /code-review namespaced, คำเคลม manual แม่นขึ้น), ลบ worktree ค้าง sharp-jones · **ยังไม่ tag/push**
