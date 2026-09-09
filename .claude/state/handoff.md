# Handoff

Last updated: 2026-09-09

## In progress
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
- 2026-08-31 **Bundle split**: `ugt-nextjs-standard` → `ugt-nextjs-standard-superpowers` 3.0.0 (เดิม) + `ugt-nextjs-standard-mattpocock` 1.0.0 (ใหม่ — pipeline manual/token ต่ำ เลือกตอน install แทน runtime toggle ที่ถูกปัดตกเพราะเสี่ยง Claude เรียกผิดฝั่ง) · ugt-nextjs-platform 4.55.0, ugt-core 2.9.1 · spec: docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md (มติ 2.1–2.11) · tag + push แล้ว · หมายเหตุ: เลข 4.55.1 เป็น phantom ใน commit title ห้ามใช้ซ้ำ
- 2026-08-26 ugt-nextjs-platform **4.54.0** — upload-setup: virus scan เป็นคำถาม interview §3 Q5 (opt-out ผ่าน marker `[SCAN]` + deviation + งาน retrofit), verify.mjs รองรับโหมด scan-off, §7 troubleshooting `SCANNER_UNAVAILABLE` จาก field report ugt-customer-request · tag + push แล้ว
- 2026-08-26 ugt-nextjs-platform **4.53.0** — return-to-page `?from=` ครบทุกทางเข้า login: `proxy.ts` (แนบ ?from= + forward header `x-from`), `session-expired-dialog.tsx`, `login-form.tsx` (`sanitizeFrom()` กัน open redirect), SKILL.md §5.5 + auth-flows.md §Return-to-page · merge main + push + tag แล้ว (รวม tag ย้อน `ugt-nextjs-platform--v4.52.0` ที่ตกหล่น)
- 2026-08-26 ugt-nextjs-platform **4.52.0** — `SessionExpiredDialog` ตัวรับ CustomEvent `session-expired` (401 กลางหน้า) mount ใน protected layout
