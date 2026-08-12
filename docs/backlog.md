# Platform Backlog — งานที่รู้แล้วว่าต้องทำ แต่ยังไม่ได้ทำ

> **Status:** Living · **Date:** 2026-08-12 · **Applies-to:** ทั้ง marketplace
> **Last-reviewed:** 2026-08-12 — ที่เดียวของ backlog ระดับ platform; ปิดข้อไหนให้ขีดพร้อมชี้รุ่นใน CHANGELOG (แบบเดียวกับ Addendum ของ app-patterns-audit ที่ปิดครบแล้ว)

กติกา: ข้อที่ปิดแล้ว**ขีดทิ้งพร้อมชี้รุ่น** ไม่ลบ (ประวัติว่าเคยเป็น backlog มีค่า) ·
งานที่เป็นของโปรเจคใดโปรเจคหนึ่งไม่อยู่ที่นี่ (ไปที่ project-notes/decisions ของโปรเจคนั้น
— เช่นการทยอยย้ายหน้า HRMS มาใช้ toolbar แถวเดียว อยู่ใน `.claude/state/project-notes.md` ของ HRMS แล้ว)

## รอลงมือ (เรียงตามความคุ้ม)

### 1. Post-deploy standard — เลื่อนไว้ 2026-08-12 รอเช็ค infra

ความเสี่ยงอันดับหนึ่งที่ระบุไว้: pipeline จบที่ container healthy แล้วมืด — เมล
Jenkins เฝ้าเฉพาะช่วง build/deploy ไม่มีอะไรเฝ้าวันที่ 2 เป็นต้นไป (ระบบพังตอน
ไม่มี build = ไม่มีเมล), ถอย release ไม่มี runbook (โดยเฉพาะเมื่อ migrate DB ไป
แล้ว), backup ไม่มีมาตรฐานและไม่เคยซ้อม restore

**หลักออกแบบที่ตกลงแล้ว:** baseline ต้องไม่ลง software ใหม่ — ใช้ Jenkins
scheduler + emailext + SMTP relay + Docker host + SQL Server ที่มีอยู่

**บล็อกอยู่ที่:** เจ้าของระบบขอเช็คความพร้อม infra 8 ข้อก่อน:

1. Image เก่าเก็บที่ไหน — registry กลาง? prune policy บน host?
2. ใครถือสิทธิ์ deploy/rollback บน host (ssh? ผ่าน Jenkins เท่านั้น?)
3. SQL Server มี backup job / DBA อยู่แล้วไหม (SQL Agent = candidate ของมติ cron ข้อ 3 ด้วย)
4. Backup เก็บที่ไหน + retention เท่าไหร่
5. **เคยซ้อม restore จริงไหม** (ข้อสำคัญสุด — backup ที่ไม่เคย restore คือความหวัง)
6. Host เป็น VM ที่ snapshot ได้ไหม (กำหนดวิธี backup volume ของ upload)
7. Jenkins: ตั้ง cron trigger ได้ไหม + มองเห็น URL prod ทาง network + ssh เข้า host ได้ไหม
8. มี Sentry กลางไหม (pipeline มีบล็อก `[SENTRY]` รออยู่แล้ว)

หมายเหตุ: นโยบาย expand-contract migration เป็นเรื่องฝั่งโค้ด — เขียนเป็นกฎได้เลย
ไม่ต้องรอคำตอบ infra

### 2. E2E test (Playwright) — เลื่อนโดยมติผู้ดูแล 2026-08-10

HRMS มี `playwright.config.ts` + โฟลเดอร์ `e2e/` ให้สกัดได้ทันทีเมื่อเปิดงาน
น่าจะเป็น skill ใหม่หรือส่วนขยายของ `ugt-nextjs-test-lint-setup` (pipeline ต้อง
เพิ่ม stage ด้วย → แตะ cicd)

### 3. Cron / background job — รอมติองค์กร

ต้องตอบก่อนว่ารันที่ไหน: in-app scheduler / SQL Server Agent / Jenkins ตั้งเวลา
(แบบเดียวกับที่ upload เคยรอ 3 มติ) — **retention sweep ของ upload-setup รอ
ข้อนี้อยู่**: ตอนนี้ soft delete แล้วไม่มีใครกวาด bytes จริง และ pattern A
(polymorphic) ต้องการ orphan sweep ด้วย · คำตอบ infra ข้อ 3 ของ post-deploy
อาจตอบข้อนี้ไปพร้อมกัน

### 4. Security headers + rate limiting ชุดเต็ม

proxy มี CSP แล้ว แต่ยังไม่ครบชุด (HSTS, X-Frame-Options ฯลฯ) · rate limiter
ของ auth เป็น in-memory ต่อ instance (มี TODO ในโค้ดกำกับแล้ว) — deploy เดี่ยว
ตามมาตรฐานปัจจุบันไม่กระทบ ต้องแก้เมื่อไปหลาย instance

## รอเงื่อนไข (ทำไม่ได้จนกว่า)

| งาน | รออะไร | บันทึกตัวเองไว้ที่ |
| --- | --- | --- |
| Behavior evals 3 ชุด (ugt-context / mail / upload) | โปรเจคจริงที่ติดตั้ง | `evals.json` ทั้งสามประกาศ `"date": null` เอง |
| Trigger baseline ของ `ugt-nextjs-kit-sync` | release gate รอบถัดไป (ผู้ตัดสิน 3 คนตามแบบแผน) | `trigger-evals.json` ประกาศ pending เอง |
| Pilot `ugt-python-platform` / `ugt-php-platform` 0.1.0 → tag | โปรเจค pilot จริง | README ตาราง plugin |
| Multi-stack ต่อ (React SPA ฯลฯ) | มีโปรเจค stack นั้นจริง | `docs/multi-stack-proposal.md` |

## ปิดแล้ว (ย้ายมาจากรายการบน — ชี้รุ่นที่ปิด)

- ~~React Query provider + เกณฑ์ RQ vs RSC~~ → 4.12.0
- ~~zustand ยังไม่ converge~~ → ปฏิเสธ + client-state ladder, 4.15.0
- ~~RHF schema/resolver + zod ที่ boundary~~ → form-validation.md, 4.16.0
- ~~asset ตกรุ่นเงียบไม่มีกลไก sync~~ → `ugt-nextjs-kit-sync` + stamp, 4.14.0
  (พิสูจน์สนามจริงกับ HRMS 2026-08-12)
- ~~ui/chart · tiptap · motion มีกฎแต่ไม่มีของ~~ → 4.12.0
