# Handoff

Last updated: 2026-09-01

## In progress
- Nothing in progress

## Next
- Tag + push ชุดแก้ code-review (4.56.0 / 2.9.2) — งานแก้ commit ครบแล้ว รอเคาะ tag
- Post-deploy standard — รอเจ้าของระบบตอบเช็ค infra 8 ข้อ (docs/backlog.md §1, เลื่อนไว้ 2026-08-12)
- ugt-python-platform / ugt-php-platform 0.6.0 — รอ pilot พิสูจน์ซ้ำก่อน tag (README ตาราง plugin)
- E2E Playwright skill — เลื่อนโดยมติผู้ดูแล 2026-08-10 (docs/backlog.md §2)
- Pilot bundle mattpocock กับโปรเจคจริง 1 ตัวก่อนแนะนำวงกว้าง (walkthrough + setup-matt-pocock-skills ยังไม่เคยถูกใช้จริง)

## Open Questions
- เช็คความพร้อม infra 8 ข้อของ post-deploy standard — เจ้าของระบบเป็นคนตอบ (รายการอยู่ docs/backlog.md §1)
- โปรเจค ugt-customer-request: root cause ของ `SCANNER_UNAVAILABLE` ยังไม่ได้ diagnose จบ (ถอด scan ออกชั่วคราวแล้ว — ยังไม่เห็นบรรทัด `virus scan unavailable <สาเหตุ>` ใน log แอป) ตอน retrofit ให้ไล่ตาม SKILL.md upload-setup §7
- ทีมที่ใช้ `ugt-nextjs-standard` เดิม (ก่อน split) ต้องประกาศ migration: `/plugin install ugt-nextjs-standard-superpowers@ugt` + ลบ key เก่าใน settings.json (รายละเอียด CHANGELOG 4.56.0) — ยังไม่ได้ประกาศ

## Done (newest first — keep only ~10; older history lives in git and CHANGELOG)
- 2026-09-01 แก้ครบ 13 findings จาก /code-review อิสระหลัง bundle split — ugt-nextjs-platform **4.56.0** (CLAUDE-block generate ตาม bundle ด้วย marker `[PIPELINE:*]`, merge ลบ key ตาย `ugt-nextjs-standard@ugt`, fallback ถามแทนเดา, verify.mjs จับ stale key), ugt-core **2.9.2** (IT redeploy note), drift-check +5 pins (รวม bundle parity), docs sync (setup step, /code-review namespaced, คำเคลม manual แม่นขึ้น), ลบ worktree ค้าง sharp-jones · **ยังไม่ tag/push**
- 2026-08-31 **Bundle split**: `ugt-nextjs-standard` → `ugt-nextjs-standard-superpowers` 3.0.0 (เดิม) + `ugt-nextjs-standard-mattpocock` 1.0.0 (ใหม่ — pipeline manual/token ต่ำ เลือกตอน install แทน runtime toggle ที่ถูกปัดตกเพราะเสี่ยง Claude เรียกผิดฝั่ง) · ugt-nextjs-platform 4.55.0, ugt-core 2.9.1 · spec: docs/superpowers/specs/2026-08-31-pipeline-bundle-choice-design.md (มติ 2.1–2.11) · tag + push แล้ว · หมายเหตุ: เลข 4.55.1 เป็น phantom ใน commit title ห้ามใช้ซ้ำ
- 2026-08-26 ugt-nextjs-platform **4.54.0** — upload-setup: virus scan เป็นคำถาม interview §3 Q5 (opt-out ผ่าน marker `[SCAN]` + deviation + งาน retrofit), verify.mjs รองรับโหมด scan-off, §7 troubleshooting `SCANNER_UNAVAILABLE` จาก field report ugt-customer-request · tag + push แล้ว
- 2026-08-26 ugt-nextjs-platform **4.53.0** — return-to-page `?from=` ครบทุกทางเข้า login: `proxy.ts` (แนบ ?from= + forward header `x-from`), `session-expired-dialog.tsx`, `login-form.tsx` (`sanitizeFrom()` กัน open redirect), SKILL.md §5.5 + auth-flows.md §Return-to-page · merge main + push + tag แล้ว (รวม tag ย้อน `ugt-nextjs-platform--v4.52.0` ที่ตกหล่น)
- 2026-08-26 ugt-nextjs-platform **4.52.0** — `SessionExpiredDialog` ตัวรับ CustomEvent `session-expired` (401 กลางหน้า) mount ใน protected layout
- 2026-08-25 docs reorganize ตามผู้อ่าน (web/training/proposals/archive) + version-sync guard ใน `check-contract-drift.mjs` (README + docs/web/index.html ต้องตรง plugin.json)
- 2026-08-25 ugt-php-platform / ugt-python-platform **0.6.0** — audit fixes: volume chown bug + runtime gaps
- 2026-08-25 ugt-nextjs-platform **4.51.0** + ugt-core **2.9.0** — audit ปูพรม 7 มิติ (contract fixes + verified-wrong facts)
