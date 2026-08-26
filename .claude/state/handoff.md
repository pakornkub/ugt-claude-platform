# Handoff

Last updated: 2026-08-26

## In progress
- Nothing in progress

## Next
- Post-deploy standard — รอเจ้าของระบบตอบเช็ค infra 8 ข้อ (docs/backlog.md §1, เลื่อนไว้ 2026-08-12)
- ugt-python-platform / ugt-php-platform 0.6.0 — รอ pilot พิสูจน์ซ้ำก่อน tag (README ตาราง plugin)
- E2E Playwright skill — เลื่อนโดยมติผู้ดูแล 2026-08-10 (docs/backlog.md §2)

## Open Questions
- เช็คความพร้อม infra 8 ข้อของ post-deploy standard — เจ้าของระบบเป็นคนตอบ (รายการอยู่ docs/backlog.md §1)
- โปรเจค ugt-customer-request: root cause ของ `SCANNER_UNAVAILABLE` ยังไม่ได้ diagnose จบ (ถอด scan ออกชั่วคราวแล้ว — ยังไม่เห็นบรรทัด `virus scan unavailable <สาเหตุ>` ใน log แอป) ตอน retrofit ให้ไล่ตาม SKILL.md upload-setup §7

## Done (newest first — keep only ~10; older history lives in git and CHANGELOG)
- 2026-08-26 ugt-nextjs-platform **4.54.0** — upload-setup: virus scan เป็นคำถาม interview §3 Q5 (opt-out ผ่าน marker `[SCAN]` + deviation + งาน retrofit), verify.mjs รองรับโหมด scan-off, §7 troubleshooting `SCANNER_UNAVAILABLE` จาก field report ugt-customer-request · tag + push แล้ว
- 2026-08-26 ugt-nextjs-platform **4.53.0** — return-to-page `?from=` ครบทุกทางเข้า login: `proxy.ts` (แนบ ?from= + forward header `x-from`), `session-expired-dialog.tsx`, `login-form.tsx` (`sanitizeFrom()` กัน open redirect), SKILL.md §5.5 + auth-flows.md §Return-to-page · merge main + push + tag แล้ว (รวม tag ย้อน `ugt-nextjs-platform--v4.52.0` ที่ตกหล่น)
- 2026-08-26 ugt-nextjs-platform **4.52.0** — `SessionExpiredDialog` ตัวรับ CustomEvent `session-expired` (401 กลางหน้า) mount ใน protected layout
- 2026-08-25 docs reorganize ตามผู้อ่าน (web/training/proposals/archive) + version-sync guard ใน `check-contract-drift.mjs` (README + docs/web/index.html ต้องตรง plugin.json)
- 2026-08-25 ugt-php-platform / ugt-python-platform **0.6.0** — audit fixes: volume chown bug + runtime gaps
- 2026-08-25 ugt-nextjs-platform **4.51.0** + ugt-core **2.9.0** — audit ปูพรม 7 มิติ (contract fixes + verified-wrong facts)
