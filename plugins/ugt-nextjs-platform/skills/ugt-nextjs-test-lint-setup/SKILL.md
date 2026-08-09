---
name: ugt-nextjs-test-lint-setup
description: >
  Use when a Next.js/TypeScript project needs its test and code-quality tooling
  set up so the org CI pipeline can pass — Vitest (with JUnit output + lcov
  coverage), ESLint, Prettier, husky/lint-staged pre-commit — or when the
  pipeline is already failing at the Code Quality / Unit Tests / Quality Gate
  stages because `lint`, `format:check`, or `test:coverage` is missing, produces
  no `test-results/junit.xml`, or reports coverage that SonarQube can't read.
  Triggers in Thai: "ตั้ง test", "ใส่ vitest", "ยังไม่มี test เลย", "ตั้ง eslint /
  prettier", "pipeline แดงที่ lint", "coverage ไม่ขึ้นใน sonar".
  Use it proactively before ugt-nextjs-cicd-setup: the Jenkins pipeline calls these four
  npm scripts by exact name and goes red immediately if any is absent.
  Don't use for writing the tests themselves (that's normal dev work) or for
  Jenkins/SonarQube server config (→ ugt-nextjs-cicd-setup).
  (เดิมชื่อ ugt-nextjs-quality-setup)
---

# UGT Test-Lint Setup — Vitest / ESLint / Prettier so the pipeline can pass

## Overview

The org pipeline calls **4 npm scripts by exact name** and enforces a Quality
Gate that needs both a JUnit report and lcov coverage. This skill installs the
project-side tooling before `ugt-nextjs-cicd-setup` lays the pipeline down. Starter
code lives in `assets/`.

## Org Standards

| Rule | Why |
| --- | --- |
| npm scripts must be named **`lint`, `format:check`, `test:coverage`, `build`** | The Jenkinsfile calls them literally (the Code Quality stage runs three of them in parallel) — wrong name = instant red stage |
| The test runner must emit **`test-results/junit.xml` when `CI=true`** | The Unit Tests stage's `junit` publisher reads this file; no file = no test results on the build page |
| Coverage must emit **lcov** | SonarQube reads it via `sonar.javascript.lcov.reportPaths` — without lcov, `new_coverage` reads 0% and the gate (≥ 60%) blocks every build |
| `coverage.include` must cover **all real source** | Including only dirs that already have tests inflates coverage — the gate passes while the code is untested |
| Tests must run with **no real env** (`SKIP_ENV_VALIDATION=1`) | No secrets needed on CI just to run unit tests |
| Pre-commit runs **prettier + eslint --fix** via lint-staged | Kills the "pushed, pipeline red over formatting" loop — the most common early-project build breaker |
| Tests are written **with** the feature | The gate measures **new code** — new code without tests fails the whole PR even when overall project coverage is high |

## Interview

1. What test/lint tooling already exists? (jest present → discuss first: migrate
   to vitest or keep jest with adjusted reporters · existing eslint/prettier → merge, don't overwrite)
2. Which dirs hold source? (default `app/ components/ lib/ hooks/` — drives `coverage.include`)
3. Tailwind in use? (no → drop `prettier-plugin-tailwindcss` + `tailwindStylesheet` from `.prettierrc`)

## Setup Steps

### 1. Dependencies

```bash
npm i -D vitest @vitest/coverage-v8 @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  eslint eslint-config-next prettier prettier-plugin-tailwindcss \
  husky lint-staged
```

(No Tailwind → drop `prettier-plugin-tailwindcss`.)

### 2. Copy assets

| Asset | Destination |
| --- | --- |
| `assets/vitest.config.ts` | `vitest.config.ts` |
| `assets/vitest.setup.ts` | `vitest.setup.ts` |
| `assets/vitest.server-only-stub.js` | `vitest.server-only-stub.js` |
| `assets/eslint.config.mjs` | `eslint.config.mjs` |
| `assets/prettierrc.json` | `.prettierrc` |
| `assets/prettierignore` | `.prettierignore` |
| `assets/husky-pre-commit` | `.husky/pre-commit` |

No placeholders to substitute — but adjust `coverage.include` in
`vitest.config.ts` to the real layout (interview answer 2).

### 3. Add scripts + lint-staged to `package.json`

**Merge in — never overwrite existing `scripts`:**

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

### 4. Enable husky

```bash
npx husky init      # creates .husky/ + the prepare script (if absent)
```

Then copy `assets/husky-pre-commit` over `.husky/pre-commit`
(`husky init` generates a sample that runs `npm test` — replace it with
`npx lint-staged`, because running the whole test suite on commit pushes people
to `--no-verify`).

### 5. Prove it works

```bash
npm run lint && npm run format:check && npm run test:coverage
CI=true npm run test:coverage && ls test-results/junit.xml coverage/lcov.info
```

## Quick Rules

| DO ✅ | DON'T ❌ |
| --- | --- |
| Script names exactly as the four above | Invent names (`test:ci`, `lint:all`) and patch the Jenkinsfile to match |
| `reporters: process.env.CI ? [..., 'junit'] : [...]` | junit always on (report files litter every local run) |
| `coverage.reporter` includes `lcov` | `text` only (Sonar can't read it → gate sees 0%) |
| Stub `server-only` with a file in the project | Alias into `node_modules/next` (breaks in worktrees without a full install) |
| Write `globalIgnores` including all eslint-config-next defaults | Declare only your own ignores (overrides next's set → eslint crawls `.next/`) |
| pre-commit = `npx lint-staged` | pre-commit = `npm test` (slow → `--no-verify` → pointless) |
| `SKIP_ENV_VALIDATION: '1'` in `test.env` | Tests requiring a real `.env` |

## Verification Checklist

**Run the script first** (cwd = target project root):

```bash
node <skill-dir>/scripts/verify.mjs
```

- [ ] `package.json` has all 4 scripts: `lint`, `format:check`, `test:coverage`, `build`
- [ ] `npm run lint` passes · `npm run format:check` passes
- [ ] `CI=true npm run test:coverage` actually produces **`test-results/junit.xml`**
- [ ] **`coverage/lcov.info`** actually produced
- [ ] `coverage.include` covers every source dir (not just dirs that have tests)
- [ ] `test.env` has `SKIP_ENV_VALIDATION: '1'` — tests run without `.env.local`
- [ ] `eslint.config.mjs` ignores `.next/`, `out/`, `build/`, `next-env.d.ts`, `coverage/`
- [ ] `.husky/pre-commit` runs `npx lint-staged` and `package.json` has the `lint-staged` block
- [ ] One trial commit → pre-commit fires (auto-formats files)
- [ ] `coverage/`, `test-results/` are gitignored
