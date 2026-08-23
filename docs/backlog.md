# Platform Backlog — งานที่รู้แล้วว่าต้องทำ แต่ยังไม่ได้ทำ

> **Status:** Living · **Date:** 2026-08-12 · **Applies-to:** ทั้ง marketplace
> **Last-reviewed:** 2026-08-21 (audit ปูพรม 4 agents หลัง field report CR System — ของวิกฤตปิดใน 4.25.0, ที่เหลือลงข้อ 5) — ที่เดียวของ backlog ระดับ platform; ปิดข้อไหนให้ขีดพร้อมชี้รุ่นใน CHANGELOG (แบบเดียวกับ Addendum ของ app-patterns-audit ที่ปิดครบแล้ว)

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

### 5. คงค้างจาก audit ปูพรม 2026-08-21 (4 agents: Base UI API / DESIGN / SKILL flows / stale ports)

ของวิกฤตแก้ไปแล้วใน 4.25.0 (ดู CHANGELOG) — ที่เหลือจัดกลุ่มตามชนิด:

**ต้องมีมติ design ก่อน (ขัดกันเองระหว่างข้อตกลง/preview/asset):**
- ~~ปุ่ม "เพิ่ม/สร้าง" — เขียวทึบ vs primary~~ → มติ primary, 4.26.0
- ~~badge ชื่อ role — outline vs secondary~~ → มติ outline, 4.26.0
- ~~แถว system role — ซ่อน vs disabled+tooltip~~ → มติ disabled+tooltip (business rule) / ซ่อน (permission), 4.26.0
- ~~`detail-row.tsx` docblock ขัด §4~~ → 4.30.0 (justify-between + gap 16px + min-h 24px)
- ~~ฟอร์ม auth เป็น useState ไม่ใช่ ui/field+RHF+zod~~ → มติ migrate ทั้งหมด, 4.30.0 (พ่วง: `@hookform/resolvers` ไม่เคยอยู่ใน dep list ทั้งที่ form-validation.md สั่งใช้ zodResolver — เพิ่มแล้ว)
- ~~ข้อความ title/subtitle/หัวคอลัมน์ admin ไม่ตรง preview~~ → 4.27.0 (sync สองทางทั้ง §13)
- ~~audit-logs: ขอบ filter +07:00 แต่จอ format ตาม timezone ผู้ดู~~ → 4.30.0 (formatDateTime pin Asia/Bangkok ตาม §5)
- audit-logs toolbar มี Input ค้นหาเปล่าที่ชน §3 (ช่องค้นหาเป็นของ DataTable) และชน verify ของ skill เอง — ต้องออกแบบ global-search โหมด server ใน DataTable
- ~~DataTable สามก้อนยังไม่ห่อการ์ดตาม §3~~ → มติห่อใน DataTable กลาง (prop `card` default เปิด), 4.26.0
- ~~theme-toggle / ปุ่ม icon นอกตาราง~~ → มติขยาย §0.4, 4.30.0 (size=icon ใช้ได้ทุกที่ + aria-label บังคับ · ในตารางยังต้องผ่าน IconAction · ห้าม override ขนาดด้วย className)

- ~~`destructive` ของ base-mira เป็นพื้นจาง ไม่ใช่แดงทึบ~~ → มติ 2026-08-21 ยึด preset, 4.33.0 (preview วาดตามแล้ว · soft-* ใน preview ก็แก้ให้โปร่งใสตอนพักด้วย)

**งานโค้ดที่ตามมาได้เลย:**
- ~~`AdminNav` fallback rebuild บน shadcn Sidebar~~ → 4.27.0
- ~~date-picker label ไม่ผ่าน lib/format~~ → 4.30.0 (prop `formatLabel` default `formatDate`) · เหลือรวม `toDateKey` ซ้ำสองที่เข้า formatExportDate
- ~~admin-setup-form `text-2xl` override~~ → 4.30.0 · เหลือ hand-built icon circle ของหน้า (admin-setup)
- tiptap toolbar: ปุ่ม `size="sm"`+`size-7 p-0` override + native title — ควรเข้า IconAction/ระบบขนาด
- ~~`check-kit-freshness.mjs` ไม่ scan root files~~ → 4.27.0 (root files + prisma/; ชนิดไฟล์อื่นยัง out of scope โดยประกาศใน SKILL แล้ว)
- ~~mail-setup สัญญา `/admin/mail-templates` แต่ไม่มีหน้า~~ → 4.27.0 (หน้า+editor+preview+actions ครบ)
- ~~upload-setup: placeholder table/verify · ลำดับ Upload↔CI~~ → 4.27.0 · คำถาม retention ยังรอมติ cron ข้อ 3 (SKILL บอกตรง ๆ แล้วว่าเป็นแค่ decision record)
- ~~verify checks ที่ประกาศแต่ไม่ implement (ฝั่ง nextjs: mkdir-p↔bind, handoff scan, no-memo, zod deprecated, S6606/S3735, design placeholder scan, full-setup rules list)~~ → 4.27.0 · ~~ฝั่ง php/python~~ → python/php 0.3.0 (ยังไม่ tag — รอ pilot): emailext ×4, shape `[WEB]`/`[BATCH]` ตรงกัน 3 ที่, `CMD` JSON array, subpath สองฝั่ง, coverage.xml, `[LARAVEL]`↔framework, health ใต้ docroot จริง, `volumes:` ก้อนเดียว, composer/require-dev, schema `phpunit.xml`↔lock, SmokeTest entry file, ไฟล์ §5.1 ที่ copy ทุกโปรเจค · ทุก check อ่านเฉพาะบรรทัดที่ยังทำงานจริง (เพิ่ม `dockerfileActive`/`composeActive` คู่กับ `jfActive`) · ข้อที่ไม่ตรวจประกาศไว้ใน SKILL §7 แล้ว
- ~~pitfalls อธิบายด้วยพฤติกรรม Radix~~ → 4.27.0 (re-word เป็น Base UI-first)
- ~~full-setup: rules mail/upload + เลขข้อ interview~~ → 4.27.0
- ~~database: dev/prod question, requestTimeout, naming exception, `__LINKED_SERVER__`~~ → 4.27.0
- ~~design-setup: placeholder table · verify scan MOTION/design-questions · export.test.ts inventory~~ → 4.27.0
- ~~python/php cicd: subpath steps · `[BATCH]` dev marker · `.env.example` · `[WEB]` checklist · mkdir-p↔bind + handoff placeholder checks~~ → python/php 0.2.0 (ยังไม่ tag — รอ pilot)
- ~~nextjs cicd: `.dockerignore` + ตาราง placeholder admin-handoff~~ → 4.27.0
- ~~ugt-core: board.md copy skeleton · ugt-handoff date format~~ → core 2.7.0 (Workflow-tool ที่ audit ว่า "ไม่มีจริง" ตรวจแล้วมีจริงใน harness ปัจจุบัน — เพิ่มแค่ fallback สำหรับ harness ที่ไม่มี)

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
