# Design — i18n ของ org UI kit (th+en)

> **Status:** Approved-in-chat, รอ review ลายลักษณ์อักษร · **Date:** 2026-08-24
> **Applies-to:** ugt-nextjs-platform 4.45.0
> **ที่มา:** ความต้องการที่ระบุชัด 2026-08-24 — *"เมื่อมีการใช้ TH/ENG แล้วเปลี่ยน
> เป็น ENG ต้อง cover ทุกหน้าและทุก Menu"* · ปัจจุบันโปรเจคที่ตอบ interview ว่า
> `ภาษา = th+en` ได้ปุ่มสลับภาษาที่**เปลี่ยนคุกกี้แล้วจอเหมือนเดิมทุกตัวอักษร**

## 1. ปัญหาที่แก้

`next-intl` ถูกติดตั้งเมื่อ th+en และ `language-switcher.tsx` ก็เรียก
`useTranslations` จริง — แต่ **ไม่มี message catalog, ไม่มี `i18n/request.ts`,
ไม่มี `NextIntlClientProvider` และไม่มีไฟล์อื่นในคิตที่เรียก `useTranslations`
เลยสักไฟล์** ตัว switcher เองจะพังตอน render ด้วยซ้ำเพราะไม่มี provider ให้
`t('english')` อ่าน

**ในขอบเขต:** หน้าจอและเมนูของ org kit ทั้ง 4 skills
**นอกขอบเขต:** อีเมล (มติ 2.3) · ปฏิทิน พ.ศ. (§8)

## 2. มติที่เคาะแล้ว

| # | มติ | เหตุผล |
| --- | --- | --- |
| 2.1 | **ผู้ได้ประโยชน์ = โปรเจคที่เลือก th+en** | ไทยล้วนไม่ต้องแปลอะไรเลย ได้ catalog ภาษาเดียวติดไป |
| 2.2 | **กลไก = `useTranslations` ทุกโปรเจค ไม่แยกสองเวอร์ชัน** | แจกไฟล์ 2 ชุดหรือ codemod ตอนติดตั้ง **ตัดทุกโปรเจคขาดจาก `kit-sync` ถาวร** — แพงกว่าปัญหาที่แก้ |
| 2.3 | **อีเมลไม่อยู่ในขอบเขต** | ไม่ใช่หน้าหรือเมนู · เป็นกลไกที่แพงที่สุด (template เก็บ DB + แอดมินแก้เอง → ต้องเก็บสองชุด + ต้องมีคอลัมน์ locale ใน user ซึ่งยังไม่มี) · ตัดออกแล้วเหลือ **256 จาก 289 ข้อความ** |
| 2.4 | **catalog เป็น `.ts` ไม่ใช่ `.json`** | `check-kit-freshness.mjs:70,93` และ `stamp-kit-assets.mjs:83` กรอง `/\.tsx?$/` ทั้งคู่ — `.json` จะ**ล่องหนจาก kit-sync และไม่มี stamp** คือตกรุ่นเงียบ ซึ่งเป็นความล้มเหลวแบบเดียวกับที่ kit-sync มีไว้กัน · next-intl รับ object จากที่ไหนก็ได้ และได้ type safety แถม |
| 2.5 | **catalog แยกไฟล์ต่อ skill** (`messages/<ns>.<locale>.ts`) | 4 skills ต่างคนต่างแจกสตริง ถ้ารวมไฟล์เดียว kit-sync merge ไม่ได้ · แยกแล้วแต่ละไฟล์เป็น asset ปกติที่ stamp/sync ได้ |
| 2.6 | **bucket 4 (server-returned) ต้องมี error-code contract ก่อนแปล** | §5 — ตอนนี้มีโค้ดที่ **branch จากข้อความไทย** อยู่จริง แปลแล้วพังเงียบ |

## 3. ขนาดงานจริง (นับด้วยสคริปต์ + อ่านมือทุกบรรทัด)

ตัวเลข "~440" ที่ประเมินไว้ตอนแรก**สูงเกินจริงเพราะรวมคอมเมนต์** — grep แบบ
"ไทยในเครื่องหมายคำพูด" ได้ 433 บรรทัด ซึ่ง **216 (49.9%) เป็นคอมเมนต์**

| ตัวชี้วัด | จำนวน |
| --- | ---: |
| บรรทัดที่มีอักษรไทย (ไฟล์โค้ด ไม่รวม `.md`) | 1,149 |
| → คอมเมนต์/docblock | **845 (73.5%)** |
| → ฝั่งโค้ด | 305 บรรทัด = 313 หน่วยข้อความ |
| **user-facing จริง** | **289** |
| test title + CLI stdout (ไม่ใช่ UI) | 24 |
| **ในขอบเขตรอบนี้ (ตัด bucket 6 ของอีเมล 33)** | **256** |

ต่อ skill (user-facing):

| Skill | UI label | Toast | Validation | Server-returned | Seed | รวม | ในขอบเขต |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| auth-setup | 113 | 17 | 21 | 15 | 0 | 166 | **166** |
| design-setup | 34 | 4 | 0 | 0 | 0 | 38 | **38** |
| mail-setup | 26 | 4 | 0 | 6 | 33 | 69 | **36** |
| upload-setup | 3 | 3 | 0 | 10 | 0 | 16 | **16** |
| **รวม** | 176 | 28 | 21 | 31 | 33 | 289 | **256** |

**ไฟล์ 10 ตัวถือ 190 จาก 289 (66%)** ที่เหลือเป็นหางยาว 22 ไฟล์ เฉลี่ยไฟล์ละ 4.5

| # | ไฟล์ | จำนวน |
| ---: | --- | ---: |
| 1 | `mail-setup/lib/types/mail-templates.ts` | 42 *(32 เป็นเนื้ออีเมล = นอกขอบเขต)* |
| 2 | `design-setup/ui/data-table.tsx` | 25 |
| 3 | `auth-setup/components/login-form.tsx` | 23 |
| 4 | `auth-setup/components/roles-manager.tsx` | 22 |
| 5 | `auth-setup/components/admin-user-actions.tsx` | 21 |
| 6 | `mail-setup/components/mail-templates-manager.tsx` | 18 |
| 7= | `auth-setup/components/audit-logs-table.tsx` · `forgot-password-dialog.tsx` · `lib/actions/password.ts` | 10 each |
| 10 | `auth-setup/components/role-form.tsx` | 9 |

## 4. สามอย่างที่ทำให้งานเบากว่าที่กลัว

**4.1 โครง next-intl สร้างไว้แล้ว แค่ยังไม่ต่อสาย.** `language-switcher.tsx`
เรียก `useTranslations`/`useLocale` อยู่แล้ว · `lib/actions-locale.ts` เป็น
Server Action ที่ guard session + `z.enum(['en','th'])` แล้วเขียนคุกกี้อายุ 1 ปี ·
`__LANG__` อยู่ใน interview ข้อ 7 และ `DESIGN.md §5` แล้ว — **งานนี้คือต่อของที่มี
ไม่ใช่สร้างใหม่** ที่ขาดจริงมี 3 ชิ้น: `i18n/request.ts` · `NextIntlClientProvider`
ใน `app/layout.tsx` · ตัว catalog

**4.2 design kit ออกแบบมาให้แปลได้อยู่แล้วโดยตั้งใจ.** 18 จาก 26 ไฟล์ที่มีอักษร
ไทยเป็น**คอมเมนต์ล้วน** เพราะ label ทุกตัวเป็น prop — `ui/bulk-action-bar.tsx:13`
เขียนเหตุผลไว้ตรง ๆ ว่า *"เพราะ i18n"* และ `ui/icon-action.tsx:7` บังคับให้ผู้เรียก
ส่ง `label` มา · **`ui/data-table.tsx` ไฟล์เดียว = 25 จาก 38 (66%) ของ design-setup**

**4.3 `lib/format.ts` ไม่ต้องแตะเลย.** 59 บรรทัดไทยเป็นคอมเมนต์ล้วน ไม่มีสตริง
สักตัว · รับ `AppLocale` อยู่แล้ว (`INTL_LOCALES` บรรทัด 25) · **ไม่มี `+543`
ไม่มีตารางชื่อเดือนไทยที่ไหนในคิตเลย** · วันที่สั้นเป็น `DD/MM/YYYY` เหมือนกัน
ทั้งสอง locale ตาม contract — ต่างจริงแค่ `formatLongDate` เหลือแค่ต่อ locale เข้าไป

## 5. อุปสรรคจริง: 85 สตริงฝั่ง server และโค้ดที่อ่านภาษาไทย

การแบ่ง client/server ของ **component** เอียงไปทาง client มาก (190 : 6) ซึ่งดี —
Server Component ที่มีไทยมีแค่ 6 สตริงใน 3 ไฟล์ page shell

งานฝั่ง server ตัวจริง**ไม่ได้อยู่ใน `.tsx`**: 85 สตริงอยู่ใน Server Actions,
Route Handlers และ `.ts` ที่ client/server ใช้ร่วมกัน ซึ่งใช้ hook ไม่ได้ทั้ง
`useTranslations` และ `getTranslations` แบบตรง ๆ

**และมีกับดักที่ต้องแก้ก่อนแตะสตริงเหล่านี้** —
`auth-setup/assets/components/admin-user-actions.tsx:82`:

```ts
if (/อีเมล|email/i.test(result.error)) setError('email', { message: result.error });
```

โค้ดนี้เลือกว่าจะโยน error ไปช่องไหน**โดยอ่านข้อความไทยของ error ที่ server ส่งมา**
แปล bucket 4 โดยไม่แก้ตรงนี้ก่อน = การ route error พังเงียบ ไม่มี test จับ

→ **มติ 2.6:** ทำ error-code contract ก่อน (server คืน `{ code }` ไม่ใช่
`{ error: 'ข้อความไทย' }`) ซึ่งนอกจากปิดกับดักแล้วยัง **ยุบ bucket 4 ทั้งก้อนไป
เป็น bucket 1/2 ฝั่ง client** และทำให้ปัญหา "เรียก `getTranslations` ใน Server
Action" หายไปทั้งหมด · `mail-setup/lib/actions/admin-mail-templates.ts:28-31`
มี `ERROR_TH` map code→ไทย อยู่แล้ว — ใช้เป็นต้นแบบได้

**ข้อความที่มีตัวแปรแทรก** มี 13 ตัว · **แค่ 2 ตัวที่ต้องใช้ ICU plural/select
จริง** (`data-table.tsx:1187-1188` ที่มีสาขา `'0 รายการ'` และขนาดไฟล์ใน
`upload-setup/app/api/files/route.ts:60`) ที่เหลือ 11 ตัวเป็นการแทนค่าธรรมดา

## 6. สิ่งที่จะ ship

### 6.1 โครงพื้นฐาน (design-setup เป็นเจ้าของ)

- `assets/i18n/request.ts` — `getRequestConfig` อ่าน locale จากคุกกี้ที่
  `actions-locale.ts` เขียนไว้แล้ว (ไม่มี `[locale]` ใน URL — เป็น cookie-based
  ซึ่ง next-intl รองรับโดยไม่ต้องมี routing)
- `app/layout.tsx` — เพิ่ม `NextIntlClientProvider` เข้า provider stack ที่ SKILL
  §Step 3 ระบุไว้ และ `<html lang="th">` → `<html lang={locale}>`
- `messages/<ns>.th.ts` + `<ns>.en.ts` ต่อ skill พร้อม index ที่รวมให้ request config

### 6.2 ลำดับเฟส

| เฟส | ขอบเขต | จำนวน | ทำไมอยู่ลำดับนี้ |
| --- | --- | ---: | --- |
| **0** | โครงพื้นฐาน §6.1 + error-code contract ของ bucket 4 | 31 แปลงเป็น code | ทุกเฟสหลังพึ่งมัน · ปิดกับดัก §5 ก่อนใครแตะสตริง |
| **1** | design-setup (`data-table.tsx` เป็นหลัก) | 38 | เป็นคิตที่ skill อื่นใช้ต่อ · ไฟล์เดียวถือ 66% ของเฟส |
| **2** | auth-setup | 166 | ก้อนใหญ่สุด · แตกย่อยตามไฟล์ได้ (10 ไฟล์แรกถือเกินครึ่ง) |
| **3** | mail admin UI + upload-setup | 52 | หางที่เหลือ · เนื้ออีเมลไม่รวม (มติ 2.3) |

เฟส 2 ใหญ่พอที่จะ**แตกเป็นหลาย session** — แนะนำแบ่งตามไฟล์ ไม่ใช่ตาม bucket
เพราะ review ทีละไฟล์เทียบของเดิมได้ตรง ๆ

### 6.3 verify

- `design-setup/scripts/verify.mjs`: มี `next-intl` ใน deps → ต้องมี
  `i18n/request.ts` + provider ใน layout + catalog ครบทุก namespace ที่ติดตั้ง
- **ด่านกัน regression:** ไฟล์ asset ที่ผ่านเฟสแล้ว ต้องไม่มีอักษรไทยนอกคอมเมนต์
  — ใช้ตัวแยกคอมเมนต์แบบเดียวกับที่ inventory ใช้ (ไม่ใช่ regex ตัดที่ `//` ตัวแรก
  เพราะ backtick คร่อมหลายบรรทัดจะหลุด)
- catalog `th`/`en` ต้องมี key ชุดเดียวกัน (ขาดข้างใดข้างหนึ่ง = FAIL)

## 7. ความเสี่ยง

1. **สตริงที่ผ่านเฟสแล้วไหลกลับ** — คนเขียน feature ใหม่ใส่ไทยตรง ๆ ตามความเคย
   ชิน · ด่านใน §6.3 เป็นตัวกัน แต่ต้องเปิดใช้ตั้งแต่เฟส 1 ไม่ใช่รอจบ
2. **`kit-sync` กับ catalog ที่โปรเจคแก้เอง** — โปรเจคที่เพิ่ม key ของตัวเองลง
   ไฟล์ namespace ของ kit จะชนตอน update · ต้องมีที่ให้เขาแยก (`messages/app.*.ts`
   ของโปรเจคเอง) และ SKILL ต้องบอกให้ชัดว่าห้ามแก้ไฟล์ของ kit
3. **แปลไม่ครบแล้วไม่มีใครรู้** — next-intl คืน key แทนข้อความเมื่อหา
   ไม่เจอ ซึ่งอ่านออกว่าพัง แต่เฉพาะตอนเปิดหน้านั้นจริง ๆ · ด่าน key-parity
   ใน §6.3 จับได้ก่อน

## 8. นอกขอบเขต (ประกาศชัด)

- **อีเมล** — มติ 2.3 · ขึ้น backlog พร้อมเงื่อนไข "ต้องมีคอลัมน์ locale ใน user
  และ UI ให้แอดมินแก้ template สองชุดก่อน"
- **ปฏิทิน พ.ศ.** — เป็นความขัดแย้งที่มีอยู่**ก่อน**งานนี้ และ **locale ไม่ใช่
  ตัวคุมมัน**: `contracts/design.md:81` เคาะแล้วว่า *"Gregorian (ค.ศ.) always"*
  และ `format.ts` บังคับ `-u-ca-gregory` ไม่มีโค้ดแปลง พ.ศ. เลย — แต่ interview
  ข้อ 8 **ยังถาม `__ERA__` ให้เลือก พ.ศ./ค.ศ.** แล้วเขียนคำตอบลง `DESIGN.md §5`
  โปรเจคที่ตอบ "พ.ศ." จึงได้ข้อตกลงที่โค้ดทำตามไม่ได้ · เขียนไว้กัน**คนอ่าน spec
  เข้าใจผิดว่าเปลี่ยน locale แล้วปีจะเปลี่ยนตาม** → ขึ้น backlog แยก
- **CLI + test titles** — 24 ข้อความ ไม่ใช่ UI
- **คอมเมนต์ 845 บรรทัด** — ไม่แตะ (และห้ามให้ตัวช่วยอัตโนมัติไปแตะด้วย)
