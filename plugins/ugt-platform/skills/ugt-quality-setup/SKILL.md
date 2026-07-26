---
name: ugt-quality-setup
description: >
  Use when a Next.js/TypeScript project needs its test and code-quality tooling
  set up so the org CI pipeline can pass — Vitest (with JUnit output + lcov
  coverage), ESLint, Prettier, husky/lint-staged pre-commit — or when the
  pipeline is already failing at the Code Quality / Unit Tests / Quality Gate
  stages because `lint`, `format:check`, or `test:coverage` is missing, produces
  no `test-results/junit.xml`, or reports coverage that SonarQube can't read.
  Use it proactively before ugt-cicd-setup: the Jenkins pipeline calls these four
  npm scripts by exact name and goes red immediately if any is absent.
  Don't use for writing the tests themselves (that's normal dev work) or for
  Jenkins/SonarQube server config (→ ugt-cicd-setup).
---

# UGT Quality Setup — Vitest / ESLint / Prettier ให้ pipeline ผ่าน

## Overview

Pipeline มาตรฐานองค์กรเรียก npm script **4 ตัวโดยใช้ชื่อตรงเป๊ะ** และบังคับ
Quality Gate ที่ต้องการทั้ง JUnit report และ coverage แบบ lcov —
skill นี้ติดตั้งเครื่องมือฝั่งโปรเจคให้ครบก่อนที่ `ugt-cicd-setup` จะวาง pipeline ลงไป
โค้ดตั้งต้นอยู่ใน `assets/`

## Org Standards

| ข้อ | ทำไม |
| --- | --- |
| npm scripts ต้องมีชื่อ **`lint`, `format:check`, `test:coverage`, `build`** | Jenkinsfile เรียกตรง ๆ ตามชื่อนี้ (stage Code Quality รัน 3 ตัวขนานกัน) — ชื่อไม่ตรง = stage แดงทันที |
| test runner ต้องออก **`test-results/junit.xml` เมื่อ `CI=true`** | stage Unit Tests ใช้ `junit` publisher อ่านไฟล์นี้ ไม่มีไฟล์ = ไม่มีผล test บนหน้า build |
| coverage ต้องออก **`lcov`** | SonarQube อ่านผ่าน `sonar.javascript.lcov.reportPaths` — ไม่มี lcov แล้ว `new_coverage` จะเป็น 0% และ Quality Gate (≥ 60%) block ทุก build |
| `coverage.include` ต้องครอบ **source จริงทั้งหมด** | ถ้า include แค่ dir ที่มี test อยู่แล้ว coverage จะสูงปลอม — gate ผ่านทั้งที่โค้ดไม่ถูกทดสอบ |
| test ต้องรันได้โดย **ไม่มี env จริง** (`SKIP_ENV_VALIDATION=1`) | ไม่ต้องเอา secret ขึ้น CI แค่เพื่อรัน unit test |
| pre-commit รัน **prettier + eslint --fix** ผ่าน lint-staged | ตัดวงจร "push แล้ว pipeline แดงเพราะ format" ซึ่งเป็นสาเหตุ build เสียบ่อยที่สุดตอนเริ่มโปรเจค |
| เขียน test **มาพร้อม** feature | gate วัดบน **new code** — โค้ดใหม่ที่ไม่มี test ทำให้ทั้ง PR ผ่านไม่ได้ แม้ coverage รวมของโปรเจคจะสูง |

## Interview

1. โปรเจคมี test/lint อะไรอยู่แล้วบ้าง? (มี jest → ต้องคุยก่อนว่าจะย้ายเป็น vitest หรือคง jest แล้วปรับ reporter · มี eslint/prettier เดิม → merge ไม่ทับ)
2. source อยู่ dir ไหนบ้าง? (default `app/ components/ lib/ hooks/` — มีผลกับ `coverage.include`)
3. ใช้ Tailwind ไหม? (ไม่ใช้ → ตัด `prettier-plugin-tailwindcss` + `tailwindStylesheet` ออกจาก `.prettierrc`)

## Setup Steps

### 1. Dependencies

```bash
npm i -D vitest @vitest/coverage-v8 @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  eslint eslint-config-next prettier prettier-plugin-tailwindcss \
  husky lint-staged
```

(ไม่ใช้ Tailwind → ตัด `prettier-plugin-tailwindcss`)

### 2. Copy assets

| Asset | ปลายทาง |
| --- | --- |
| `assets/vitest.config.ts` | `vitest.config.ts` |
| `assets/vitest.setup.ts` | `vitest.setup.ts` |
| `assets/vitest.server-only-stub.js` | `vitest.server-only-stub.js` |
| `assets/eslint.config.mjs` | `eslint.config.mjs` |
| `assets/prettierrc.json` | `.prettierrc` |
| `assets/prettierignore` | `.prettierignore` |
| `assets/husky-pre-commit` | `.husky/pre-commit` |

ไม่มี placeholder ให้แทน — แต่ต้องปรับ `coverage.include` ใน `vitest.config.ts`
ให้ตรง layout จริง (คำตอบ interview ข้อ 2)

### 3. เพิ่ม scripts + lint-staged ใน `package.json`

**merge เข้าไป ห้ามเขียนทับ `scripts` ที่มีอยู่**:

```json
{
  "scripts": {
    "lint": "eslint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["prettier --write", "eslint --fix"],
    "*.{json,md,css,yml,yaml}": ["prettier --write"]
  }
}
```

### 4. เปิด husky

```bash
npx husky init      # สร้าง .husky/ + เติม script prepare (ถ้ายังไม่มี)
```

แล้ว copy `assets/husky-pre-commit` ทับ `.husky/pre-commit`
(`husky init` สร้างไฟล์ตัวอย่างที่รัน `npm test` มาให้ — เปลี่ยนเป็น `npx lint-staged`
เพราะรัน test ทั้งชุดตอน commit ทำให้คนเลี่ยงไปใช้ `--no-verify`)

### 5. ตรวจว่าใช้ได้จริง

```bash
npm run lint && npm run format:check && npm run test:coverage
CI=true npm run test:coverage && ls test-results/junit.xml coverage/lcov.info
```

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| ชื่อ script ตรงตาม 4 ตัวข้างบน | ตั้งชื่อเอง (`test:ci`, `lint:all`) แล้วไป patch Jenkinsfile ตาม |
| `reporters: process.env.CI ? [..., 'junit'] : [...]` | เปิด junit ตลอด (ได้ไฟล์ report ค้างในโปรเจคทุกครั้งที่รัน local) |
| `coverage.reporter` มี `lcov` | เอาแค่ `text` (Sonar อ่านไม่ได้ → gate เห็น coverage 0%) |
| stub `server-only` เป็นไฟล์ในโปรเจค | alias เข้า `node_modules/next` (พังใน worktree ที่ยังไม่ install) |
| เขียน `globalIgnores` ให้มี default ของ eslint-config-next ครบ | ประกาศ `globalIgnores` แค่ของตัวเอง (ทับของ next ทั้งชุด → eslint ไล่ lint `.next/`) |
| pre-commit = `npx lint-staged` | pre-commit = `npm test` (ช้า → คนใช้ `--no-verify` → หมดประโยชน์) |
| `SKIP_ENV_VALIDATION: '1'` ใน `test.env` | ให้ test ต้องมี `.env` จริง |

## Verification Checklist

**รันสคริปต์ก่อน** (cwd = root ของโปรเจคปลายทาง):

```bash
node <skill-dir>/scripts/verify.mjs
```

- [ ] `package.json` มี scripts ครบ 4 ตัว: `lint`, `format:check`, `test:coverage`, `build`
- [ ] `npm run lint` ผ่าน · `npm run format:check` ผ่าน
- [ ] `CI=true npm run test:coverage` แล้วมี **`test-results/junit.xml`** เกิดขึ้นจริง
- [ ] มี **`coverage/lcov.info`** เกิดขึ้นจริง
- [ ] `coverage.include` ครอบทุก dir ที่มี source (ไม่ใช่แค่ dir ที่มี test)
- [ ] `test.env` มี `SKIP_ENV_VALIDATION: '1'` — รัน test ได้โดยไม่มี `.env.local`
- [ ] `eslint.config.mjs` ignore `.next/`, `out/`, `build/`, `next-env.d.ts`, `coverage/`
- [ ] `.husky/pre-commit` รัน `npx lint-staged` และ `package.json` มี block `lint-staged`
- [ ] commit ทดลอง 1 ครั้ง → pre-commit ทำงาน (format ไฟล์ให้อัตโนมัติ)
- [ ] `coverage/`, `test-results/` อยู่ใน `.gitignore`
