# Org kit i18n — Phase 0 + 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทำให้ปุ่มสลับภาษาของ org kit เปลี่ยนภาษาได้จริง โดยวางโครง next-intl ที่ยังขาด แล้วแปลง `ugt-nextjs-design-setup` ทั้ง skill ให้ใช้ catalog

**Architecture:** เพิ่ม `i18n/request.ts` (อ่าน locale จากคุกกี้ที่ `lib/actions/locale.ts` เขียนอยู่แล้ว — ไม่มี `[locale]` ใน URL) + `NextIntlClientProvider` ใน `app/layout.tsx` + message catalog เป็นไฟล์ `.ts` แยก namespace ต่อ skill จากนั้นเปลี่ยนสตริงไทยใน design kit ให้เรียก `useTranslations` และปิดท้ายด้วยด่านใน `verify.mjs` ที่กันสตริงไหลกลับ

**Tech Stack:** Next.js App Router · next-intl (cookie-based, ไม่มี i18n routing) · TypeScript · Node.js สำหรับสคริปต์ verify

**Spec:** `docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md`

## Global Constraints

- **catalog ต้องเป็น `.ts` เท่านั้น ห้าม `.json`** — `check-kit-freshness.mjs:70,93` และ `stamp-kit-assets.mjs:83` กรอง `/\.tsx?$/` ไฟล์ `.json` จะล่องหนจาก kit-sync และไม่มี stamp (มติ 2.4)
- **catalog แยกไฟล์ต่อ skill** ชื่อ `messages/<namespace>.<locale>.ts` — ห้ามรวมเป็นไฟล์เดียว (มติ 2.5)
- **ทุกโปรเจคใช้ `useTranslations` เหมือนกันหมด** ไม่แยกสองเวอร์ชันตามคำตอบ interview (มติ 2.2)
- **อีเมลนอกขอบเขต** — ห้ามแตะ `mail-setup/lib/types/mail-templates.ts` bucket 6 (มติ 2.3)
- **ห้ามแตะคอมเมนต์ภาษาไทย 845 บรรทัด** — แปลเฉพาะสตริงที่ผู้ใช้เห็น
- ทุก asset ที่แก้ต้องผ่าน `node scripts/lint-kit-assets.mjs` และ `node scripts/stamp-kit-assets.mjs` ก่อน commit
- ภาษาในไฟล์ที่โหลดเข้า context เป็นอังกฤษ ยกเว้นประโยค trigger (กติกา repo)
- ปีปฏิทินเป็น **ค.ศ. เสมอทุก locale** — `locale` ไม่ใช่ตัวคุมปฏิทิน (spec §8)

---

## File Structure

**สร้างใหม่ (design-setup เป็นเจ้าของโครง):**

| ไฟล์ | หน้าที่ |
| --- | --- |
| `assets/i18n/request.ts` | `getRequestConfig` — อ่านคุกกี้ `locale`, รวม catalog ทุก namespace, คืนให้ next-intl |
| `assets/i18n/messages.ts` | จุดรวม catalog — import ทุก namespace แล้ว merge เป็น object เดียวต่อ locale |
| `assets/messages/kit.th.ts` | catalog ภาษาไทยของ design kit (namespace `kit`) |
| `assets/messages/kit.en.ts` | catalog ภาษาอังกฤษของ design kit |
| `scripts/check-i18n.mjs` | ด่าน: key parity th↔en + ไม่มีสตริงไทยนอกคอมเมนต์ในไฟล์ที่แปลงแล้ว |

**แก้ไข:**

| ไฟล์ | แก้อะไร |
| --- | --- |
| `assets/ui/data-table.tsx` | 22 บรรทัด → `useTranslations('kit.dataTable')` |
| `assets/ui/confirm-action-dialog.tsx` | 2 (`'ยกเลิก'`, `'เกิดข้อผิดพลาด'`) |
| `assets/ui/export-menu.tsx` | 4 (`'ดาวน์โหลดไม่สำเร็จ'` ×2, `'ดาวน์โหลดแล้ว'`, `aria-label="ดาวน์โหลด"`) |
| `assets/ui/date-picker.tsx` | 2 (`'เลือกวันที่'`, `วันหยุดประเพณี`) |
| `assets/ui/tiptap-editor.tsx` | 2 (`ลบลิงก์`, `บันทึก`) |
| `SKILL.md` | Step 3 provider stack + Step 6 รายการไฟล์ที่ copy + §Verification |
| `scripts/verify.mjs` | เรียก `check-i18n.mjs` |
| `references/conventions.md` | หัวข้อใหม่: กติกาการเพิ่มสตริงใหม่ |

**ไม่แตะ:**

- `lib/format.ts` — คอมเมนต์ล้วน รับ `AppLocale` อยู่แล้ว
- `ui/icon-action.tsx`, `ui/bulk-action-bar.tsx`, `ui/status-badge.tsx`, `ui/query-state.tsx`, `ui/page-shell.tsx`, `ui/detail-*.tsx` — label เป็น prop ผู้เรียกแปลเอง (ไทยในไฟล์เหล่านี้เป็น**คอมเมนต์ล้วน** ยืนยันด้วยตัวแยกคอมเมนต์แล้ว)
- `lib/export.test.ts`, `lib/format.test.ts` — ชื่อ test และ fixture ไม่ใช่ UI (bucket 7 ของ spec)
- `ui/chart-example.tsx` — ไฟล์ตัวอย่างสำหรับอ้างอิงกฎสี ไม่ใช่คอมโพเนนต์ที่ใช้จริง
- `ui/tiptap-editor.tsx:290` `placeholder="https://…"` — เป็น URL ตัวอย่าง ไม่ใช่ข้อความ

---

### Task 1: Message catalog ของ design kit + ด่าน key parity

**Files:**
- Create: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/messages/kit.th.ts`
- Create: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/messages/kit.en.ts`
- Create: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs`

**Interfaces:**
- Consumes: ไม่มี (task แรก)
- Produces: `kitTh` / `kitEn` — object ที่ export จาก `kit.th.ts` / `kit.en.ts` โครงเป็น `{ dataTable: {...}, confirmDialog: {...} }` · `check-i18n.mjs` รับ argument `<projectRoot>` และ exit 1 เมื่อ key ไม่ตรงกัน

- [ ] **Step 1: เขียน catalog ภาษาไทย**

สร้าง `assets/messages/kit.th.ts` — ค่าทุกตัวคัดลอกจากสตริงเดิมในโค้ดแบบคำต่อคำ:

```ts
// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/messages/kit.th.ts
// kit-hash: PENDING
// Thai catalog for the org UI kit. Keys must match kit.en.ts exactly —
// scripts/check-i18n.mjs fails the build when they drift.
export const kitTh = {
  dataTable: {
    emptyTitleSearchable: 'ไม่พบข้อมูล',
    emptyTitle: 'ยังไม่มีรายการ',
    emptyBodySearchable: 'ลองปรับ filter หรือค้นหาด้วยคำอื่น',
    emptyBody: 'เมื่อมีข้อมูลจะแสดงที่นี่',
    selectAllFiltered: 'เลือกทุกแถวที่กรองอยู่',
    filterAria: 'กรอง {label}',
    filterValuePlaceholder: 'ค่าที่ต้องการกรอง...',
    columnSettings: 'ตั้งค่าคอลัมน์',
    columns: 'คอลัมน์',
    reorderAria: 'ลำดับของ {label} — ลากเพื่อสลับ หรือกดลูกศรขึ้น/ลง',
    filterPlaceholder: 'กรอกเพื่อกรอง...',
    clearFilterAria: 'ล้างกรอง {label}',
    rangeSummary: '{start}–{end} จาก {total}',
    rangeEmpty: '0 รายการ',
    pageSummary: 'หน้า {page} จาก {pages}',
    firstPage: 'ไปหน้าแรก',
    prevPage: 'ไปหน้าก่อน',
    nextPage: 'ไปหน้าถัดไป',
    lastPage: 'ไปหน้าสุดท้าย',
  },
  confirmDialog: {
    cancel: 'ยกเลิก',
    genericError: 'เกิดข้อผิดพลาด',
  },
  exportMenu: {
    trigger: 'ดาวน์โหลด',
    success: 'ดาวน์โหลดแล้ว',
    failed: 'ดาวน์โหลดไม่สำเร็จ',
  },
  datePicker: {
    placeholder: 'เลือกวันที่',
    holidayLegend: 'วันหยุดประเพณี',
  },
  tiptap: {
    removeLink: 'ลบลิงก์',
    save: 'บันทึก',
  },
} as const;
```

- [ ] **Step 2: เขียน catalog ภาษาอังกฤษ**

สร้าง `assets/messages/kit.en.ts` — key ชุดเดียวกันเป๊ะ:

```ts
// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/messages/kit.en.ts
// kit-hash: PENDING
// English catalog for the org UI kit. Keys must match kit.th.ts exactly.
export const kitEn = {
  dataTable: {
    emptyTitleSearchable: 'No results',
    emptyTitle: 'Nothing here yet',
    emptyBodySearchable: 'Try adjusting the filters or searching for something else',
    emptyBody: 'Records will appear here once there are any',
    selectAllFiltered: 'Select every filtered row',
    filterAria: 'Filter {label}',
    filterValuePlaceholder: 'Value to filter by...',
    columnSettings: 'Column settings',
    columns: 'Columns',
    reorderAria: 'Position of {label} — drag to reorder, or use the up and down arrows',
    filterPlaceholder: 'Type to filter...',
    clearFilterAria: 'Clear filter {label}',
    rangeSummary: '{start}–{end} of {total}',
    rangeEmpty: 'No records',
    pageSummary: 'Page {page} of {pages}',
    firstPage: 'Go to first page',
    prevPage: 'Go to previous page',
    nextPage: 'Go to next page',
    lastPage: 'Go to last page',
  },
  confirmDialog: {
    cancel: 'Cancel',
    genericError: 'Something went wrong',
  },
  exportMenu: {
    trigger: 'Download',
    success: 'Downloaded',
    failed: 'Download failed',
  },
  datePicker: {
    placeholder: 'Pick a date',
    holidayLegend: 'Public holiday',
  },
  tiptap: {
    removeLink: 'Remove link',
    save: 'Save',
  },
} as const;
```

- [ ] **Step 3: เขียนด่าน key parity ให้ fail ก่อน**

สร้าง `scripts/check-i18n.mjs`:

```js
#!/usr/bin/env node
// Gate for the org kit's message catalogs.
//   node <skill-dir>/scripts/check-i18n.mjs [projectRoot]
// 1. every namespace has the same key set in every locale
// 2. files already converted carry no Thai outside comments
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.argv[2] ?? process.cwd();
const results = [];
const check = (name, fn) => {
  try {
    results.push({ name, ...(fn() ?? { ok: true }) });
  } catch (error) {
    results.push({ name, ok: false, msg: error.message });
  }
};

// Flatten { a: { b: 'x' } } to ['a.b'] so a missing leaf is named precisely.
function keyPaths(src) {
  const keys = [];
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, path);
      else keys.push(path);
    }
  };
  walk(src, '');
  return keys.sort();
}

// The catalogs are .ts (มติ 2.4) so they cannot be imported here without a
// build step. Parse the object literal instead: strip the export wrapper and
// `as const`, then evaluate the remaining literal in an isolated Function.
function loadCatalog(file) {
  const raw = readFileSync(file, 'utf8');
  const start = raw.indexOf('{', raw.indexOf('export const'));
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error(`${file}: no object literal found`);
  return Function(`return (${raw.slice(start, end + 1)})`)();
}

check('catalog key parity across locales', () => {
  const dir = join(ROOT, 'messages');
  if (!existsSync(dir)) return { ok: true, msg: 'no messages/ — nothing to compare' };
  const byNamespace = new Map();
  for (const f of readdirSync(dir)) {
    const m = /^(.+)\.(th|en)\.ts$/.exec(f);
    if (!m) continue;
    const [, ns, locale] = m;
    if (!byNamespace.has(ns)) byNamespace.set(ns, {});
    byNamespace.get(ns)[locale] = keyPaths(loadCatalog(join(dir, f)));
  }
  const problems = [];
  for (const [ns, locales] of byNamespace) {
    if (!locales.th || !locales.en) {
      problems.push(`${ns}: has only ${Object.keys(locales).join(', ')} — both th and en are required`);
      continue;
    }
    const missingEn = locales.th.filter((k) => !locales.en.includes(k));
    const missingTh = locales.en.filter((k) => !locales.th.includes(k));
    if (missingEn.length) problems.push(`${ns}.en missing: ${missingEn.join(', ')}`);
    if (missingTh.length) problems.push(`${ns}.th missing: ${missingTh.join(', ')}`);
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});

const icon = { true: '✔', false: '✘' };
let failed = 0;
for (const r of results) {
  if (r.ok !== true) failed++;
  console.log(`  ${icon[String(r.ok === true)]} ${r.name}`);
  if (r.msg) console.log(`      ${r.msg}`);
}
console.log(`\n${results.length - failed} passed · ${failed} failed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: พิสูจน์ว่าด่านจับ key ที่ขาดได้จริง**

```bash
cd plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets
node ../scripts/check-i18n.mjs .
```
Expected: `✔ catalog key parity across locales` · `1 passed · 0 failed`

จากนั้นลบ key ออกหนึ่งตัวเพื่อพิสูจน์ว่าด่านจับได้:

```bash
cp messages/kit.en.ts /tmp/kit.en.bak
node -e "const f='messages/kit.en.ts';const s=require('fs').readFileSync(f,'utf8');require('fs').writeFileSync(f,s.replace(/^\s*lastPage:.*$/m,''))"
node ../scripts/check-i18n.mjs .
```
Expected: FAIL พร้อมข้อความ `kit.en missing: dataTable.lastPage`

คืนไฟล์เดิม:
```bash
cp /tmp/kit.en.bak messages/kit.en.ts && node ../scripts/check-i18n.mjs .
```
Expected: กลับมา `1 passed · 0 failed`

- [ ] **Step 5: Commit**

```bash
cd D:/Project_2026/ugt-claude-platform
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/messages/ plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs
git commit -m "feat(design-setup): message catalog for the org kit + key-parity gate"
```

---

### Task 2: โครง next-intl — request config + provider

**Files:**
- Create: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/i18n/request.ts`
- Create: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/i18n/messages.ts`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/SKILL.md` (Step 3 provider stack, Step 6 copy list)

**Interfaces:**
- Consumes: `kitTh` จาก `messages/kit.th.ts` · `kitEn` จาก `messages/kit.en.ts` (Task 1)
- Produces: `messages: Record<AppLocale, Record<string, unknown>>` จาก `i18n/messages.ts` · default export `getRequestConfig` จาก `i18n/request.ts` · ชื่อคุกกี้ `'locale'` ตรงกับที่ `lib/actions/locale.ts` เขียน

- [ ] **Step 1: เขียนตัวรวม catalog**

สร้าง `assets/i18n/messages.ts`:

```ts
// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/i18n/messages.ts
// kit-hash: PENDING
// Every namespace the kit ships, merged per locale. A skill that adds its own
// catalog (auth, mail, upload) registers it here — one import + one spread.
// Project-owned strings belong in messages/app.*.ts, NOT in a kit namespace:
// kit files are overwritten wholesale on plugin update.
import { kitEn } from '@/messages/kit.en';
import { kitTh } from '@/messages/kit.th';

export type AppLocale = 'th' | 'en';

export const messages: Record<AppLocale, Record<string, unknown>> = {
  th: { kit: kitTh },
  en: { kit: kitEn },
};

export const DEFAULT_LOCALE: AppLocale = 'th';
```

- [ ] **Step 2: เขียน request config**

สร้าง `assets/i18n/request.ts`:

```ts
// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/i18n/request.ts
// kit-hash: PENDING
// Cookie-based locale — no [locale] segment in the URL. The cookie is written
// by lib/actions/locale.ts (session-guarded Server Action); this only reads it.
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, messages, type AppLocale } from '@/i18n/messages';

const SUPPORTED: readonly AppLocale[] = ['th', 'en'];

function isSupported(value: string | undefined): value is AppLocale {
  return value !== undefined && (SUPPORTED as readonly string[]).includes(value);
}

export default getRequestConfig(async () => {
  // An unknown or absent cookie falls back rather than throwing: a stale cookie
  // from an older deploy must not 500 every page.
  const cookieValue = (await cookies()).get('locale')?.value;
  const locale: AppLocale = isSupported(cookieValue) ? cookieValue : DEFAULT_LOCALE;
  return { locale, messages: messages[locale] };
});
```

- [ ] **Step 3: อัปเดตคำสั่ง provider ใน SKILL.md**

ใน `SKILL.md` Step 3 (`Fonts + providers in app/layout.tsx`) แก้บล็อกคำสั่ง — เดิม:

```
   Body wraps: **`QueryProvider` (from `assets/components/query-provider.tsx`
```

เป็น:

```
   `<html lang="th">` → `<html lang={locale}>` เมื่อ ภาษา = th+en (อ่าน locale
   ด้วย `getLocale()` จาก `next-intl/server` ใน RootLayout ซึ่งเป็น Server
   Component อยู่แล้ว) — `lang` ที่ไม่ตรงภาษาจริงทำให้ screen reader อ่านผิดภาษา
   และ `:lang()` ใน CSS เลือกฟอนต์ผิด

   Body wraps: **`NextIntlClientProvider` (นอกสุด — provider อื่นและ children
   ทุกตัวต้องอยู่ข้างใน ไม่งั้น `useTranslations` โยน error ตอน render)** →
   **`QueryProvider` (from `assets/components/query-provider.tsx`
```

- [ ] **Step 4: เพิ่มไฟล์ใหม่เข้ารายการ copy ใน SKILL.md**

ใน Step 6 (`Copy the org UI kit`) เพิ่มต่อจากรายการ `assets/lib/`:

```
   `assets/i18n/` → `i18n/` และ `assets/messages/` → `messages/` (**ทุกโปรเจค
   ไม่ใช่เฉพาะ th+en** — kit ทั้งชุดอ่านสตริงผ่าน catalog ตั้งแต่ 4.46.0
   โปรเจคไทยล้วนได้ catalog ภาษาเดียวและไม่ต้องแปลอะไร มติ 2.2) · ตั้ง
   `next-intl` เป็น dependency เสมอ ไม่ใช่เฉพาะ th+en
```

และแก้บรรทัด 218 ที่เขียนว่า `` `next-intl` only when ภาษา = th+en `` เป็น
`` `next-intl` เสมอทุกโปรเจค (มติ 2.2 — kit อ่านสตริงผ่าน catalog) ``

- [ ] **Step 5: ตรวจว่า import path สอดคล้องกับที่ SKILL สั่ง copy**

```bash
cd D:/Project_2026/ugt-claude-platform/plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup
grep -n "@/i18n/\|@/messages/" assets/i18n/request.ts assets/i18n/messages.ts
grep -n "assets/i18n/\|assets/messages/" SKILL.md
```
Expected: `@/i18n/messages` และ `@/messages/kit.*` ตรงกับปลายทาง `i18n/` และ `messages/` ที่ SKILL สั่ง copy

- [ ] **Step 6: Commit**

```bash
cd D:/Project_2026/ugt-claude-platform
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/i18n/ plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/SKILL.md
git commit -m "feat(design-setup): next-intl request config + provider wiring"
```

---

### Task 3: แปลง data-table.tsx (25 สตริง)

**Files:**
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/data-table.tsx`

**Interfaces:**
- Consumes: namespace `kit.dataTable` จาก Task 1 (key ทั้ง 19 ตัวตามรายการใน `kit.th.ts`)
- Produces: ไม่มี export ใหม่ — signature ของ `DataTable` และ props ทุกตัวคงเดิม

- [ ] **Step 1: เพิ่ม hook เข้าคอมโพเนนต์ที่ใช้สตริง**

`data-table.tsx` เป็น client component อยู่แล้ว (มี `'use client'`) เพิ่ม import:

```ts
import { useTranslations } from 'next-intl';
```

ในแต่ละคอมโพเนนต์ย่อยที่มีสตริง (`DataTableEmpty`, `selectionColumn`, ส่วน filter, ส่วน column settings, ส่วน pagination) เรียก:

```ts
const t = useTranslations('kit.dataTable');
```

> `selectionColumn()` เป็นฟังก์ชันสร้าง column ไม่ใช่คอมโพเนนต์ — เรียก hook ในนั้นไม่ได้ · ให้เปลี่ยน default ของ `allLabel` จากสตริงไทยเป็น `undefined` แล้วให้ `cell`/`header` (ซึ่งเป็น React component) เรียก `t('selectAllFiltered')` เมื่อ `allLabel` ไม่ถูกส่งมา

- [ ] **Step 2: แทนสตริงคงที่**

แก้ทีละจุดตามตารางนี้ (บรรทัดอ้างอิงจากไฟล์ก่อนแก้ — เลื่อนได้หลังแก้จุดแรก ให้ค้นด้วยข้อความแทน):

| เดิม | ใหม่ |
| --- | --- |
| `'ไม่พบข้อมูล'` | `t('emptyTitleSearchable')` |
| `'ยังไม่มีรายการ'` | `t('emptyTitle')` |
| `'ลองปรับ filter หรือค้นหาด้วยคำอื่น'` | `t('emptyBodySearchable')` |
| `'เมื่อมีข้อมูลจะแสดงที่นี่'` | `t('emptyBody')` |
| `allLabel = 'เลือกทุกแถวที่กรองอยู่'` | `allLabel` (ไม่มี default) + `allLabel ?? t('selectAllFiltered')` ที่จุดใช้ |
| `"ค่าที่ต้องการกรอง..."` | `{t('filterValuePlaceholder')}` |
| `aria-label="ตั้งค่าคอลัมน์"` | `aria-label={t('columnSettings')}` |
| `คอลัมน์` (JSX text) | `{t('columns')}` |
| `'กรอกเพื่อกรอง...'` | `t('filterPlaceholder')` |
| `<span className="sr-only">ไปหน้าแรก</span>` | `<span className="sr-only">{t('firstPage')}</span>` |
| `ไปหน้าก่อน` | `{t('prevPage')}` |
| `ไปหน้าถัดไป` | `{t('nextPage')}` |
| `ไปหน้าสุดท้าย` | `{t('lastPage')}` |

- [ ] **Step 3: แทนสตริงที่มีตัวแปร**

next-intl ใช้ `{name}` ไม่ใช่ `${name}` — แปลง 5 จุด:

```ts
// เดิม: aria-label={`กรอง ${label}`}
aria-label={t('filterAria', { label })}

// เดิม: aria-label={`ลำดับของ ${entry.label} — ลากเพื่อสลับ หรือกดลูกศรขึ้น/ลง`}
aria-label={t('reorderAria', { label: entry.label })}

// เดิม: aria-label={`ล้างกรอง ${label}`}
aria-label={t('clearFilterAria', { label })}

// เดิม: `หน้า ${table.getState().pagination.pageIndex + 1} จาก ${Math.max(1, table.getPageCount())}`
{t('pageSummary', {
  page: table.getState().pagination.pageIndex + 1,
  pages: Math.max(1, table.getPageCount()),
})}
```

สรุปช่วงแถว — เดิมเป็น ternary ที่มีสาขา 0:

```ts
// เดิม:
//   total > 0
//     ? `${formatNumber(start)}–${formatNumber(end)} จาก ${formatNumber(total)}`
//     : '0 รายการ'
total > 0
  ? t('rangeSummary', {
      start: formatNumber(start),
      end: formatNumber(end),
      total: formatNumber(total),
    })
  : t('rangeEmpty')
```

> คงรูป ternary ไว้ **ห้ามเปลี่ยนเป็น ICU plural** — ตัวเลขถูก `formatNumber` จัดรูปแบบมาก่อนแล้วจึงเป็น string ที่ ICU นับ plural ไม่ได้ และ contract กำหนดว่าตัวเลขทุกตัวผ่าน `formatNumber` (คั่นหลักพัน ไม่ปัดเศษ)

- [ ] **Step 4: ตรวจว่าไม่เหลือสตริงไทยนอกคอมเมนต์**

```bash
cd D:/Project_2026/ugt-claude-platform/plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup
node -e "
const s=require('fs').readFileSync('assets/ui/data-table.tsx','utf8').split('\n');
const bad=[];let block=false;
s.forEach((l,i)=>{
  let line=l;
  if(block){const e=line.indexOf('*/');if(e<0)return;line=line.slice(e+2);block=false;}
  const b=line.indexOf('/*');if(b>=0){const e=line.indexOf('*/',b);if(e<0){block=true;line=line.slice(0,b);}else line=line.slice(0,b)+line.slice(e+2);}
  const c=line.indexOf('//');if(c>=0)line=line.slice(0,c);
  if(/[\u0E00-\u0E7F]/.test(line))bad.push((i+1)+': '+l.trim());
});
console.log(bad.length?'เหลือ '+bad.length+' จุด:\n'+bad.join('\n'):'✔ ไม่เหลือสตริงไทยนอกคอมเมนต์');
"
```
Expected: `✔ ไม่เหลือสตริงไทยนอกคอมเมนต์`

- [ ] **Step 5: ตรวจว่า key ที่เรียกมีอยู่จริงใน catalog ทั้งสองภาษา**

```bash
cd D:/Project_2026/ugt-claude-platform/plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup
node -e "
const src=require('fs').readFileSync('assets/ui/data-table.tsx','utf8');
const used=[...src.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map(m=>m[1]).sort();
const th=require('fs').readFileSync('assets/messages/kit.th.ts','utf8');
const missing=[...new Set(used)].filter(k=>!th.includes(k+':'));
console.log('เรียกใช้ '+new Set(used).size+' key · ขาดใน catalog: '+(missing.length?missing.join(', '):'ไม่มี'));
"
```
Expected: `ขาดใน catalog: ไม่มี`

- [ ] **Step 6: รันด่านของ repo**

```bash
cd D:/Project_2026/ugt-claude-platform
node scripts/lint-kit-assets.mjs
node plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets
```
Expected: `✔ kit assets clean` และ `1 passed · 0 failed`

- [ ] **Step 7: Commit**

```bash
cd D:/Project_2026/ugt-claude-platform
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/data-table.tsx
git commit -m "feat(design-setup): data-table reads its 25 strings from the catalog"
```

---

### Task 4: แปลงอีกสี่ไฟล์ที่เหลือ + ด่านกันสตริงไหลกลับ

**Files:**
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/confirm-action-dialog.tsx`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/export-menu.tsx`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/date-picker.tsx`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/tiptap-editor.tsx`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs`

**Interfaces:**
- Consumes: namespace `kit.confirmDialog`, `kit.exportMenu`, `kit.datePicker`, `kit.tiptap` จาก Task 1 · ฟังก์ชัน `check` และ `results` ที่มีอยู่แล้วใน `check-i18n.mjs` จาก Task 1
- Produces: ค่าคงที่ `CONVERTED_FILES` ใน `check-i18n.mjs` — รายชื่อไฟล์ (path สัมพัทธ์จาก `assets/`) ที่ผ่านเฟสแล้วและห้ามมีสตริงไทยนอกคอมเมนต์อีก

- [ ] **Step 1: แปลง confirm-action-dialog.tsx**

ทั้งสี่ไฟล์มี `'use client'` อยู่แล้ว — แต่ละไฟล์เพิ่ม `import { useTranslations } from 'next-intl';` แล้วเรียก hook ในตัวคอมโพเนนต์

```ts
const t = useTranslations('kit.confirmDialog');

// เดิม: toast.error('เกิดข้อผิดพลาด');
toast.error(t('genericError'));

// เดิม: <AlertDialogCancel disabled={pending}>ยกเลิก</AlertDialogCancel>
<AlertDialogCancel disabled={pending}>{t('cancel')}</AlertDialogCancel>
```

> `title`, `description`, `confirmLabel`, `successMessage` เป็น props ที่ผู้เรียกส่งมา — **ห้ามแตะ** ผู้เรียกเป็นคนแปลเอง (แบบเดียวกับ `ui/icon-action.tsx` และ `ui/bulk-action-bar.tsx`)

- [ ] **Step 2: แปลง export-menu.tsx (4 จุด)**

```ts
const t = useTranslations('kit.exportMenu');

// บรรทัด 45 — เดิม: ... ?? 'ดาวน์โหลดไม่สำเร็จ'
(data as { error?: { message?: string } } | null)?.error?.message ?? t('failed')

// บรรทัด 63 — เดิม: toast.success('ดาวน์โหลดแล้ว');
toast.success(t('success'));

// บรรทัด 65 — เดิม: toast.error('ดาวน์โหลดไม่สำเร็จ');
toast.error(t('failed'));

// บรรทัด 77 — เดิม: aria-label="ดาวน์โหลด"
aria-label={t('trigger')}
```

- [ ] **Step 3: แปลง date-picker.tsx (2 จุด)**

```ts
const t = useTranslations('kit.datePicker');

// บรรทัด 89 — เดิม: {value ? formatLabel(value) : (placeholder ?? 'เลือกวันที่')}
{value ? formatLabel(value) : (placeholder ?? t('placeholder'))}

// บรรทัด 108 — เดิม: <span className="size-2 rounded-full bg-status-red" /> วันหยุดประเพณี
<span className="size-2 rounded-full bg-status-red" /> {t('holidayLegend')}
```

- [ ] **Step 4: แปลง tiptap-editor.tsx (2 จุด)**

```ts
const t = useTranslations('kit.tiptap');

// บรรทัด 302 — เดิม: ลบลิงก์
{t('removeLink')}

// บรรทัด 306 — เดิม: บันทึก
{t('save')}
```

> `placeholder="https://…"` บรรทัด 290 **ห้ามแตะ** — เป็น URL ตัวอย่าง ไม่ใช่ข้อความที่ต้องแปล

- [ ] **Step 5: เพิ่มด่านกันสตริงไหลกลับ**

เพิ่มใน `scripts/check-i18n.mjs` ต่อจาก check เดิม:

```js
// Files that have been through an i18n phase. Adding a file here is the commit
// that finishes it — the gate then keeps Thai from creeping back in as the next
// person adds a feature out of habit.
const CONVERTED_FILES = [
  'ui/data-table.tsx',
  'ui/confirm-action-dialog.tsx',
  'ui/export-menu.tsx',
  'ui/date-picker.tsx',
  'ui/tiptap-editor.tsx',
];

// A regex that cuts at the first `//` is wrong here: the kit uses backtick
// template literals spanning lines, and `//` appears inside URLs. Track quote
// and comment state character by character instead.
function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      if (c === '\\') { out += '  '; i += 2; continue; }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

check('converted files carry no Thai outside comments', () => {
  const problems = [];
  for (const rel of CONVERTED_FILES) {
    const file = join(ROOT, rel);
    if (!existsSync(file)) {
      problems.push(`${rel}: listed as converted but the file is missing`);
      continue;
    }
    const code = stripComments(readFileSync(file, 'utf8'));
    const hits = code.split('\n').reduce((n, l) => n + (/[\u0E00-\u0E7F]/.test(l) ? 1 : 0), 0);
    if (hits) problems.push(`${rel}: ${hits} line(s) still hold Thai in code — move them into messages/`);
  }
  return problems.length ? { ok: false, msg: problems.join(' · ') } : { ok: true };
});
```

- [ ] **Step 6: พิสูจน์ว่าด่านจับได้จริง — ฉีดสตริงเข้าไปแล้วดูว่ามันแดง**

รันปกติก่อน:

```bash
cd D:/Project_2026/ugt-claude-platform/plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup
node scripts/check-i18n.mjs assets
```
Expected: `2 passed · 0 failed`

**ด่านที่ผ่านทันทีโดยไม่เคยเห็นมันแดง พิสูจน์อะไรไม่ได้** — ฉีดสตริงไทยเข้าไฟล์
ที่แปลงแล้วชั่วคราวเพื่อดูว่ามันจับ:

```bash
cp assets/ui/date-picker.tsx /tmp/dp.bak
printf '\nconst __probe = "ทดสอบด่าน";\n' >> assets/ui/date-picker.tsx
node scripts/check-i18n.mjs assets
```
Expected: FAIL — `ui/date-picker.tsx: 1 line(s) still hold Thai in code`

พิสูจน์ต่อว่ามัน**ไม่**จับไทยในคอมเมนต์ (ไม่งั้นจะฟ้องคอมเมนต์ 845 บรรทัดทั้งคิต):

```bash
cp /tmp/dp.bak assets/ui/date-picker.tsx
printf '\n// คอมเมนต์ภาษาไทย ไม่ควรถูกจับ\n' >> assets/ui/date-picker.tsx
node scripts/check-i18n.mjs assets
```
Expected: `2 passed · 0 failed`

คืนไฟล์เดิม:

```bash
cp /tmp/dp.bak assets/ui/date-picker.tsx && rm /tmp/dp.bak
node scripts/check-i18n.mjs assets
```
Expected: `2 passed · 0 failed`

- [ ] **Step 7: ต่อด่านเข้า verify.mjs ของ skill**

ใน `scripts/verify.mjs` เพิ่ม check ที่เรียกสคริปต์นี้ — วางต่อจาก check ตัวสุดท้ายก่อนบล็อกสรุปผล:

```js
check('i18n catalogs consistent (delegates to check-i18n.mjs)', () => {
  const script = join(import.meta.dirname, 'check-i18n.mjs');
  const r = spawnSync(process.execPath, [script, ROOT], { encoding: 'utf8' });
  return r.status === 0
    ? { ok: true }
    : { ok: false, msg: (r.stdout + r.stderr).trim().split('\n').slice(-3).join(' · ') };
});
```

เพิ่ม import ที่หัวไฟล์ถ้ายังไม่มี:

```js
import { spawnSync } from 'node:child_process';
```

- [ ] **Step 8: ตรวจ syntax, key ที่เรียก, และด่านของ repo**

```bash
cd D:/Project_2026/ugt-claude-platform
node --check plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/check-i18n.mjs
node --check plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/verify.mjs
node scripts/lint-kit-assets.mjs
```
Expected: syntax ผ่านทั้งสอง · `✔ kit assets clean`

ตรวจว่า key ที่ทั้งสี่ไฟล์เรียกมีอยู่จริงใน catalog:

```bash
cd plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup
node -e "
const fs=require('fs');
const th=fs.readFileSync('assets/messages/kit.th.ts','utf8');
const files=['confirm-action-dialog','export-menu','date-picker','tiptap-editor'];
let bad=[];
for(const f of files){
  const s=fs.readFileSync('assets/ui/'+f+'.tsx','utf8');
  for(const m of s.matchAll(/\bt\('([a-zA-Z0-9_]+)'/g)) if(!th.includes(m[1]+':')) bad.push(f+' → '+m[1]);
}
console.log(bad.length?'ขาดใน catalog: '+bad.join(', '):'✔ key ครบทุกตัว');
"
```
Expected: `✔ key ครบทุกตัว`

- [ ] **Step 9: Commit**

```bash
cd D:/Project_2026/ugt-claude-platform
git add plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/assets/ui/ plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/scripts/
git commit -m "feat(design-setup): the last four kit components read from the catalog + regression gate"
```

---

### Task 5: เอกสาร + stamp + bump

**Files:**
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/references/conventions.md`
- Modify: `plugins/ugt-nextjs-platform/skills/ugt-nextjs-design-setup/SKILL.md` (§Verification Checklist)
- Modify: `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json`
- Modify: `plugins/ugt-nextjs-platform/CHANGELOG.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: ทุก task ก่อนหน้า
- Produces: ไม่มี interface ใหม่ — เป็น task ปิดรุ่น

- [ ] **Step 1: เขียนกติกาการเพิ่มสตริงใหม่ลง conventions.md**

เพิ่มหัวข้อใหม่ท้ายไฟล์:

```markdown
## i18n — เพิ่มข้อความใหม่ต้องทำอะไร

ตั้งแต่ 4.46.0 ทุกข้อความที่ผู้ใช้เห็นในคิตอ่านจาก `messages/` ไม่ใช่จาก jsx

**เพิ่มข้อความในคอมโพเนนต์ของคิต** (ไฟล์ใต้ `components/ui/`):

1. เพิ่ม key ใน `messages/kit.th.ts` **และ** `messages/kit.en.ts` — key ต้องตรงกัน
   ทั้งสองไฟล์ ไม่งั้น `check-i18n.mjs` FAIL
2. เรียกด้วย `const t = useTranslations('kit.<namespace>')` แล้ว `t('key')`
3. มีตัวแปรแทรก ใช้ `{name}` ของ next-intl **ไม่ใช่** `${name}` ของ JS:
   `t('filterAria', { label })` คู่กับ `filterAria: 'กรอง {label}'`

**เพิ่มข้อความของโปรเจคเอง** (ไม่ใช่ของคิต): สร้าง `messages/app.th.ts` /
`app.en.ts` ของตัวเองแล้วลงทะเบียนใน `i18n/messages.ts` — **ห้ามเพิ่ม key ลง
ไฟล์ `kit.*`** เพราะ `/plugin update` เขียนทับไฟล์ของคิตทั้งไฟล์ ของที่เพิ่มเข้าไป
จะหายเงียบ (`ugt-nextjs-kit-sync` เตือนตอนไฟล์ตกรุ่น แต่กู้ของที่หายไปแล้วไม่ได้)

**คอมโพเนนต์ที่รับ label เป็น prop ไม่ต้องแตะ** — `ui/icon-action.tsx`,
`ui/bulk-action-bar.tsx`, `ui/status-badge.tsx`, `ui/page-shell.tsx`,
`ui/query-state.tsx`, `ui/detail-*.tsx` ออกแบบมาให้ผู้เรียกประกอบข้อความเอง
ตั้งแต่ต้นแล้ว ผู้เรียกเป็นคนแปล
```

- [ ] **Step 2: เพิ่มข้อตรวจใน SKILL.md §Verification Checklist**

```markdown
- [ ] `node <skill-dir>/scripts/check-i18n.mjs` เขียว — catalog `th`/`en` มี key
      ชุดเดียวกัน และไฟล์ที่แปลงแล้วไม่มีสตริงไทยนอกคอมเมนต์
- [ ] `i18n/request.ts` + `i18n/messages.ts` + `messages/kit.*.ts` copy เข้าโปรเจคแล้ว
      (**ทุกโปรเจค ไม่ใช่เฉพาะ th+en**) และ `NextIntlClientProvider` อยู่นอกสุด
      ของ provider stack ใน `app/layout.tsx`
- [ ] th+en เท่านั้น: กดสลับภาษาแล้ว **ข้อความในตารางเปลี่ยนจริง** (หัวคอลัมน์
      ที่ผู้เรียกส่งมาจะยังเป็นภาษาเดิมจนกว่าโปรเจคจะแปลเอง — ที่ต้องเปลี่ยนคือ
      ปุ่มหน้า, ตัวกรอง, empty state, สรุปจำนวนแถว)
```

- [ ] **Step 3: ประทับ stamp ให้ asset ใหม่**

```bash
cd D:/Project_2026/ugt-claude-platform
node scripts/stamp-kit-assets.mjs
node scripts/stamp-kit-assets.mjs --check
```
Expected: `✔ kit stamps current on N asset(s)` โดย N เพิ่มขึ้น 4 จากเดิม (catalog 2 + i18n 2)

- [ ] **Step 4: Bump + CHANGELOG**

ใน `plugins/ugt-nextjs-platform/.claude-plugin/plugin.json` เปลี่ยน `"version"` เป็น `"4.46.0"`

เพิ่มหัวข้อบนสุดของ `plugins/ugt-nextjs-platform/CHANGELOG.md`:

```markdown
## 4.46.0 (2026-08-24)

**เฟส 0+1 ของ i18n — ปุ่มสลับภาษาเปลี่ยนภาษาได้จริงแล้ว** (spec:
`docs/superpowers/specs/2026-08-24-org-kit-i18n-design.md`)

เดิมโปรเจคที่ตอบ `ภาษา = th+en` ได้ `next-intl`, ปุ่มสลับภาษา และ Server Action
เขียนคุกกี้ — แต่ไม่มี catalog, ไม่มี `i18n/request.ts`, ไม่มี provider และไม่มี
ไฟล์ไหนในคิตเรียก `useTranslations` เลย กดสลับแล้วคุกกี้เปลี่ยน จอเหมือนเดิมทุก
ตัวอักษร (ตัวปุ่มเองก็ throw ตอน render เพราะไม่มี provider ให้ `t()` อ่าน)

- `i18n/request.ts` + `i18n/messages.ts` + `messages/kit.{th,en}.ts` — catalog
  เป็น `.ts` **ไม่ใช่ `.json`** เพราะ `check-kit-freshness.mjs` และ
  `stamp-kit-assets.mjs` กรอง `/\.tsx?$/` ทั้งคู่ ไฟล์ json จะล่องหนจาก kit-sync
  คือตกรุ่นเงียบ ซึ่งเป็นความล้มเหลวแบบเดียวกับที่ kit-sync มีไว้กัน
- `next-intl` กลายเป็น dependency ของ **ทุกโปรเจค** ไม่ใช่เฉพาะ th+en — แจกไฟล์
  สองเวอร์ชันหรือ codemod ตอนติดตั้งจะตัดทุกโปรเจคขาดจาก kit-sync ถาวร
  โปรเจคไทยล้วนได้ catalog ภาษาเดียวและไม่ต้องแปลอะไร
- `ui/data-table.tsx` (25 ข้อความ) และ `ui/confirm-action-dialog.tsx` (2) อ่านจาก
  catalog แล้ว · คอมโพเนนต์ที่รับ label เป็น prop อยู่แล้วไม่ต้องแตะ — คิตส่วนใหญ่
  ออกแบบมาแบบนั้นตั้งแต่ต้น (18 จาก 26 ไฟล์ที่มีอักษรไทยเป็นคอมเมนต์ล้วน)
- `scripts/check-i18n.mjs` — ด่านสองข้อ: key `th`/`en` ตรงกัน และไฟล์ที่แปลงแล้ว
  ห้ามมีสตริงไทยนอกคอมเมนต์ (ตัวแยกคอมเมนต์เดินทีละอักขระ ไม่ใช่ตัดที่ `//`
  ตัวแรก เพราะ backtick คร่อมหลายบรรทัดและ `//` โผล่ใน URL)

**ยังไม่ครบทุกหน้า** — auth-setup (166 ข้อความ), mail admin UI (36) และ
upload-setup (16) เป็นเฟส 2-3 ดู spec §6.2
```

- [ ] **Step 5: อัปเดตตารางรุ่นใน README**

```bash
cd D:/Project_2026/ugt-claude-platform
sed -i 's/| `ugt-nextjs-platform` | 4.45.0 |/| `ugt-nextjs-platform` | 4.46.0 |/' README.md
grep -n "ugt-nextjs-platform\` |" README.md
```
Expected: แสดง `4.46.0`

- [ ] **Step 6: รันด่านทั้งชุดของ repo**

```bash
cd D:/Project_2026/ugt-claude-platform
node scripts/lint-kit-assets.mjs
node scripts/check-contract-drift.mjs | tail -1
node scripts/check-doc-status.mjs | tail -1
node scripts/check-preview-tokens.mjs | tail -1
node scripts/stamp-kit-assets.mjs --check
claude plugin validate ./plugins/ugt-nextjs-platform --strict
```
Expected: เขียวทุกตัว · `✔ Validation passed`

- [ ] **Step 7: Commit**

```bash
cd D:/Project_2026/ugt-claude-platform
git add -A
git commit -m "feat(4.46.0): i18n phase 0+1 — the language switcher switches something now"
```

---

## Self-Review

รอบแรกของ review นี้จับข้อบกพร่องจริงได้สองข้อ ทั้งคู่แก้ในแผนแล้ว — บันทึกไว้
เพราะเป็นชนิดข้อผิดพลาดที่จะเกิดซ้ำในแผนเฟส 2:

- **แผนตกไป 3 ไฟล์** (`export-menu` 4, `date-picker` 2, `tiptap-editor` 2 = 8
  ข้อความ) เพราะผมไล่จากไฟล์ที่ "จำได้" ไม่ได้สแกนด้วยตัวแยกคอมเมนต์จริง ·
  เฟส 2 ต้องเริ่มด้วยการรันตัวสแกนก่อนเขียน task ไม่ใช่หลัง
- **ขั้นพิสูจน์ด่านเลือกไฟล์ผิด** — เดิมใช้ `ui/status-badge.tsx` เป็นตัวที่
  "ยังไม่แปลง" เพื่อดูด่านแดง แต่ไทยในไฟล์นั้น**เป็นคอมเมนต์ล้วน** ด่านจะผ่านฟรี
  และพิสูจน์อะไรไม่ได้ · เปลี่ยนเป็นฉีดสตริงเข้าไฟล์ที่แปลงแล้วชั่วคราว ซึ่ง
  ไม่ขึ้นกับว่าไฟล์ไหนบังเอิญมีไทยเหลืออยู่ และยังได้พิสูจน์ขาที่สองด้วยว่า
  ด่าน**ไม่**จับคอมเมนต์

**1. Spec coverage** — เฟส 0: โครง §6.1 → Task 2, catalog → Task 1 ·
**error-code contract ของ bucket 4 ไม่อยู่ในแผนนี้โดยตั้งใจ** เพราะ bucket 4 ทั้ง
31 ข้อความอยู่ใน auth/mail/upload ซึ่งเป็นเฟส 2-3 — design-setup มี bucket 4 เป็น
**ศูนย์** (ยืนยันด้วย grep หา `{ error:` ที่มีอักษรไทยใน `design-setup/assets`
ได้ 0 ผลลัพธ์) จึงไม่มีอะไรให้แปลงในเฟสนี้ · จะเป็น Task แรกของ plan เฟส 2 ·
เฟส 1: design-setup → Task 3 (data-table 22 บรรทัด) + Task 4 (อีก 4 ไฟล์ 10
ข้อความ) + ที่เหลือเป็น prop-driven/test/example ตามรายการ "ไม่แตะ" ·
§6.3 verify → Task 1 (key parity) + Task 4 (กันไหลกลับ) + Task 5 (ต่อเข้า
checklist) · §7 ความเสี่ยงข้อ 2 (โปรเจคแก้ catalog เอง) → Task 5 Step 1

**2. Placeholder scan** — ไม่มี TBD/TODO · ทุก step ที่เป็นโค้ดมีโค้ดจริง ·
คำสั่งทดสอบทุกอันมี expected output · ไม่มี step ไหนอ้าง "เหมือน Task N"

**3. Type consistency** — `AppLocale` นิยามใน `i18n/messages.ts` (Task 2) และชน
กับที่มีอยู่แล้วใน `lib/format.ts:23`: ทั้งคู่เป็น `'th' | 'en'` เหมือนกัน แต่
**`format.ts` เป็นเจ้าของเดิม** — ถ้า TypeScript ฟ้อง duplicate ตอนติดตั้งจริง
ให้ `i18n/messages.ts` ใช้ `import type { AppLocale } from '@/lib/format'` แทน
การประกาศซ้ำ · `kitTh`/`kitEn` (Task 1) ถูก import ใน Task 2 ด้วยชื่อเดียวกัน ·
namespace ที่ Task 3/4 เรียก (`kit.dataTable`, `kit.confirmDialog`,
`kit.exportMenu`, `kit.datePicker`, `kit.tiptap`) ตรงกับ key ชั้นบนสุดใน
`kit.th.ts`/`kit.en.ts` ของ Task 1 ครบทั้ง 5 · `CONVERTED_FILES` (Task 4) ใช้
path สัมพัทธ์จาก `assets/` ตรงกับที่ `check-i18n.mjs` รับ `ROOT` เป็น `assets/`
