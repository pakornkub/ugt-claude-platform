---
name: ugt-clean-code
description: >
  SonarQube clean-code rules for the org's TypeScript/React/Next.js stack —
  write code that passes the Quality Gate on the FIRST scan instead of fixing
  violations after the pipeline goes red. Covers the modern-JS idioms SonarQube
  enforces (S77xx/S65xx/S6xxx), `Readonly<>` props, the duplication strategy
  (refactor vs `sonar.cpd.exclusions`), and correct NOSONAR / `sonar.issue.ignore`
  placement. Load this BEFORE writing or editing any component, server action,
  validation schema, table, or hook — the gate blocks on `new_violations = 0`, so
  a single stray `parseInt` fails the build for the whole team.
  Don't use for Jenkins/SonarQube server or pipeline config (→ ugt-cicd-setup).
paths:
  - "**/*.{ts,tsx}"
---

# UGT Clean Code — เขียนให้ผ่าน Quality Gate ตั้งแต่สแกนแรก

SonarQube ที่ถูกที่สุดคือ violation ที่ไม่เคยถูกสร้าง — ไฟล์นี้คือ checklist
ก่อนเขียน ไม่ใช่คู่มือแก้ทีหลัง

## Quality Gate ให้คะแนนอย่างไร (อ่านก่อน)

Gate วัดบน **new code เท่านั้น** (โค้ดที่เพิ่ม/แก้ใน branch นี้) ตามมาตรฐานองค์กร:

| Condition | Threshold | สิ่งที่ทำให้พลาด |
| --- | --- | --- |
| `new_violations` | **= 0** | code smell เล็ก ๆ ตัวเดียวก็ block — ไม่มีโควตาให้ |
| `new_duplicated_lines_density` | **≤ 3%** | copy-paste — **NOSONAR ใช้ไม่ได้กับข้อนี้** |
| `new_coverage` | **≥ 60%** | เขียนโค้ดใหม่โดยไม่มี test |
| `new_security_hotspots_reviewed` | **= 100%** | hotspot ที่ยังไม่มีคน review ใน SonarQube UI |

สองข้อที่ต้องคิดตอน**เขียน** ไม่ใช่ตอนแก้: `new_violations = 0` ไม่เหลือที่ให้พลาด
และ duplication ไม่มีทางลัด suppress — ต้องออกแบบไม่ให้ซ้ำตั้งแต่แรก

## 1. Modern-JS idioms ที่ SonarQube บังคับ

เขียนคอลัมน์ขวาเป็น default ไปเลย

| ❌ ถูก flag | ✅ เขียนแบบนี้ | Rule |
| --- | --- | --- |
| `str.replace(/x/g, 'y')` | `str.replaceAll('x', 'y')` | S7781 |
| `parseInt(v, 10)` / `parseFloat(v)` | `Number.parseInt(v, 10)` / `Number.parseFloat(v)` | S7773 |
| `typeof window !== 'undefined'` | `globalThis.window !== undefined` | S7764 |
| `typeof x === 'undefined'` | `x === undefined` | S7741 |
| `arr[arr.length - 1]` | `arr.at(-1)` | S7755 |
| `x > 0 ? x : 0` | `Math.max(0, x)` | S7766 |
| `a !== null ? a : b` / `a ? a : b` | `a ?? b` | S6606 / S7735 |
| `if (!notReady)` ใน ternary | สลับ branch → เงื่อนไขเชิงบวก | S7735 |
| `catch (err)` / `catch (e)` | `catch (error_)` หรือ `catch (error)` | S7718 |
| `value as Foo` ทั้งที่ TS narrow ให้แล้ว | ลบ assertion ออก | S4325 |
| `void someExpr;` | ลบ expression ที่ตายแล้ว | S3735 |

**กฎเรื่อง component / type:**

| Rule | ข้อบังคับ |
| --- | --- |
| S6759 | prop type ของ function component ต้องครอบ `Readonly<>` ทุกตัว — ทั้ง inline object, named interface และ `React.ComponentProps<…>` |
| S3863 | ห้าม import จาก module เดียวกันสองบรรทัด — รวมเป็น statement เดียว |
| S1874 | ห้ามใช้ API ที่ deprecated · Zod v4: `z.flattenError(err)` ไม่ใช่ `err.flatten()`, `z.iso.datetime()` ไม่ใช่ `z.string().datetime()` |
| S3776 | cognitive complexity ≤ 15 — แตก helper ออกจากฟังก์ชันที่ซ้อนลึก/แตกแขนงมาก |

**ข้อยกเว้น S6759**: cell renderer ของ TanStack Table ต้องใช้
`Readonly<CellContext<TRow, unknown>>` เพราะ generic ของ value เป็น `unknown` ที่ระดับ column

## 2. Duplication — ตัวที่ block บ่อยสุดและ suppress ไม่ได้

พอจะ copy block ไหน ให้หยุดแล้วเลือกหนึ่งทาง:

**A. Refactor (default — เมื่อ DRY ทำให้อ่านง่ายขึ้น):**

- Zod schema สองตัวใช้ field/refinement ร่วมกัน → แยก field const + predicate function
  (type ctx ของ `superRefine` เป็น `z.core.$RefinementCtx`) · `path` ใน `.refine()`
  ต้องเป็น `PropertyKey[]` ที่ mutable — ห้ามใส่ `as const`
- Component ต่างกันแค่ config (endpoint, label, body) → ทำ component เดียวรับเป็น props
- Dialog/form ฝาแฝดที่ใช้ schema+field ชุดเดียวกัน → แยก schema module + `<Fields form={form} />`
- Server action ที่ซ้ำ block guard/notify/create → แยกเป็น `loadX`, `notifyX`, `createX`

**B. `sonar.cpd.exclusions` (เมื่อการยัด DRY ทำให้แย่ลง):** CRUD table ที่ type-safe
และซ้ำโครงแต่ต่าง generic row type, modal body ที่ต่างแค่เนื้อบน shell เดียวกัน,
DataTable variant, API-route guard ต่อ resource — เพิ่ม path ลง
`sonar-project.properties` **พร้อม comment ว่าทำไมจึงตั้งใจให้ซ้ำ**

> เส้นแบ่ง: ถ้ารวมของซ้ำแล้วต้องใช้ `any`/cast หรือได้ config object 5 พารามิเตอร์
> ที่อ่านยากกว่าเดิม → exclude · นอกนั้น → refactor

## 3. Suppress false positive ให้ถูกวิธี

### NOSONAR ต้องอยู่ **บรรทัดเดียวกับ** โค้ดที่ถูก flag

```ts
// ✅ บรรทัดเดียวกับ arrow/declaration ที่ SonarQube รายงาน
cell: ({ row }) => <RiskCell row={row} />, // NOSONAR typescript:S6478 — TanStack renderer
export function Wizard() { // NOSONAR typescript:S3776 — cohesive state machine

// ❌ บรรทัดถัดไป / JSX block comment → ไม่ suppress
header: () => (
  // NOSONAR …          ← ผิด: issue อยู่บรรทัด `() => (` ข้างบน
{/* NOSONAR … */}       ← ผิด: SonarQube ไม่อ่าน JSX block comment
```

### false positive เชิงระบบให้ใช้ `sonar.issue.ignore.multicriteria`

เมื่อ rule เดียวยิงทั้งไฟล์/ทั้ง glob เพราะ pattern ของ library (TanStack column
renderer, react-day-picker slot override, RHF render prop) ให้ suppress ครั้งเดียว
ใน `sonar-project.properties` แทนการโปรย NOSONAR รายบรรทัดที่พังง่าย:

```properties
sonar.issue.ignore.multicriteria=s6478tables,s4144ot
sonar.issue.ignore.multicriteria.s6478tables.ruleKey=typescript:S6478
sonar.issue.ignore.multicriteria.s6478tables.resourceKey=**/*table*.tsx
sonar.issue.ignore.multicriteria.s4144ot.ruleKey=typescript:S4144
sonar.issue.ignore.multicriteria.s4144ot.resourceKey=**/ot-approval-list.tsx
```

false positive จาก library ที่ควร ignore ด้วย glob: **S6478** (inline component) บน
`*table*`, `*-tab`, `*-list`, `calendar` · **S4144** (identical implementation) บน
component ที่ต่างแค่ generic type · **S6848 / S1082** (a11y) บน UI primitive
ที่ส่ง ARIA ให้ parent จัดการ

`console.*` ใน catch แบบ fire-and-forget → `// NOSONAR typescript:S106` บรรทัดเดียวกัน

## Checklist ก่อน commit

**รันสคริปต์ก่อน** (cwd = root ของโปรเจค) — default ตรวจเฉพาะไฟล์ที่แก้เทียบ HEAD
ซึ่งตรงกับที่ gate วัด (new code) ใส่ `--all` ถ้าอยากสแกนทั้งโปรเจค:

```bash
node <skill-dir>/scripts/verify.mjs
```



- [ ] ไม่มี `parseInt` / `.replace(/…/g)` / `typeof … 'undefined'` / `arr[len-1]` / ternary เชิงลบ — ใช้ idiom ใหม่แล้ว
- [ ] prop type ของทุก component ครอบ `Readonly<>`
- [ ] ไม่มี import ซ้ำจาก module เดียวกัน · ไม่มี Zod API ที่ deprecated
- [ ] ไม่มี block ที่ copy มา ≥ ~10 บรรทัด — refactor แล้ว หรือใส่ `sonar.cpd.exclusions` พร้อมเหตุผล
- [ ] NOSONAR ทุกตัวอยู่บรรทัดเดียวกับ issue · false positive เชิงระบบใช้ `multicriteria`
- [ ] มี test ครอบโค้ดใหม่ (gate ต้องการ `new_coverage` ≥ 60% บน new code)
- [ ] `npx tsc --noEmit` + `npm run lint` clean
