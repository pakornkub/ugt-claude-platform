#!/usr/bin/env node
// Contract drift check — the repo-level guard promised by contracts/harness.md.
//
// Contract text is DELIBERATELY duplicated into stack skills (skills must be
// self-contained). This script verifies every copy still agrees with the
// canonical contract value. Run from the repo root before every release:
//
//   node scripts/check-contract-drift.mjs
//
// Exit 0 = all copies agree · exit 1 = a copy is missing or disagrees.
//
// When a contract value changes: update the contract, update every copy listed
// here, and update the check's regexes if the value itself changed.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CORE = 'plugins/ugt-core';
const NEXT = 'plugins/ugt-nextjs-platform/skills';

// Each check: every file must match ALL its regexes.
// Keys are repo-relative paths; values are the patterns that pin the value.
const CHECKS = [
  {
    name: 'Quality Gate: new_coverage >= 60%',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/new_coverage/, /≥\s*60%/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/new_coverage/, /≥\s*60%/],
      [`${NEXT}/ugt-nextjs-clean-code/SKILL.md`]: [/new_coverage/, /≥\s*60%/],
      [`${NEXT}/ugt-nextjs-test-lint-setup/SKILL.md`]: [/new_coverage/, /≥\s*60%/],
    },
  },
  {
    name: 'Quality Gate: new_violations = 0',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/new_violations/, /=\s*0/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/new_violations/, /=\s*0/],
      [`${NEXT}/ugt-nextjs-clean-code/SKILL.md`]: [/new_violations/, /=\s*0/],
    },
  },
  {
    name: 'Quality Gate: new_duplicated_lines_density <= 3%',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/new_duplicated_lines_density/, /≤\s*3%/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/new_duplicated_lines_density/, /≤\s*3%/],
      [`${NEXT}/ugt-nextjs-clean-code/SKILL.md`]: [/new_duplicated_lines_density/, /≤\s*3%/],
    },
  },
  {
    name: 'Quality Gate: new_security_hotspots_reviewed = 100%',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/new_security_hotspots_reviewed/, /100%/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/new_security_hotspots_reviewed/, /100%/],
      [`${NEXT}/ugt-nextjs-clean-code/SKILL.md`]: [/new_security_hotspots_reviewed/, /100%/],
    },
  },
  {
    name: 'Dependency scan: fail CRITICAL >= 1, unstable HIGH >= 1',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/CRITICAL\s*≥\s*1/, /HIGH\s*≥\s*1/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/CRITICAL\s*≥\s*1/, /HIGH\s*≥\s*1/],
    },
  },
  {
    name: 'Pipeline: 10 stages',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/all 10, in order/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/all 10, in order|10-stage/],
    },
  },
  {
    name: 'Credential naming: env-<project> / env-<project>-dev',
    files: {
      [`${CORE}/contracts/cicd.md`]: [/env-<project>/, /env-<project>-dev/],
      [`${NEXT}/ugt-nextjs-cicd-setup/SKILL.md`]: [/env-<project>/, /env-<project>-dev/],
    },
  },
  {
    name: 'Session policy: 8h lifetime, refresh at 30m remaining',
    files: {
      [`${CORE}/contracts/auth.md`]: [/8 hours/, /30 minutes/],
      [`${NEXT}/ugt-nextjs-auth-setup/SKILL.md`]: [/8[\s-]?h(?:our)?/, /30[\s-]?m(?:in)?/],
    },
  },
  {
    name: 'Guard order: session -> permission -> action -> audit log',
    files: {
      [`${CORE}/contracts/auth.md`]: [
        /1\.\s*session[\s\S]*2\.\s*permission[\s\S]*3\.\s*action[\s\S]*4\.\s*audit log/,
      ],
      [`${NEXT}/ugt-nextjs-auth-setup/SKILL.md`]: [/session\s*→\s*permission\s*→\s*action\s*→\s*audit log/],
      [`${NEXT}/ugt-nextjs-full-setup/assets/CLAUDE-block.md`]: [/session\s*→\s*permission\s*→\s*action\s*→\s*audit log/],
    },
  },
  {
    name: 'Audit columns: Id/CreatedAt/UpdatedAt/CreatedBy/UpdatedBy/IsActive/IsDeleted',
    files: {
      [`${CORE}/contracts/database.md`]: [
        /Id/, /CreatedAt/, /UpdatedAt/, /CreatedBy/, /UpdatedBy/, /IsActive/, /IsDeleted/,
      ],
      [`${NEXT}/ugt-nextjs-database-setup/SKILL.md`]: [
        /CreatedAt/, /UpdatedAt/, /CreatedBy/, /UpdatedBy/, /IsActive/, /IsDeleted/,
      ],
      [`${NEXT}/ugt-nextjs-full-setup/assets/CLAUDE-block.md`]: [
        /CreatedAt/, /UpdatedAt/, /CreatedBy/, /UpdatedBy/, /IsActive/, /IsDeleted/,
      ],
    },
  },
  {
    name: 'Soft delete: IsDeleted = 1, never hard delete',
    files: {
      [`${CORE}/contracts/database.md`]: [/IsDeleted = 1/i, /never hard delete/i],
      [`${NEXT}/ugt-nextjs-database-setup/SKILL.md`]: [/IsDeleted = 1/i],
      [`${NEXT}/ugt-nextjs-full-setup/assets/CLAUDE-block.md`]: [/IsDeleted = 1/i],
    },
  },
];

let failed = 0;
for (const check of CHECKS) {
  const problems = [];
  for (const [rel, patterns] of Object.entries(check.files)) {
    let text;
    try {
      text = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      problems.push(`  ✘ ${rel} — file missing`);
      continue;
    }
    const misses = patterns.filter((re) => !re.test(text));
    if (misses.length > 0) {
      problems.push(`  ✘ ${rel} — no match for: ${misses.map((re) => re.source).join(' · ')}`);
    }
  }
  if (problems.length === 0) {
    console.log(`✔ ${check.name}`);
  } else {
    failed += 1;
    console.log(`✘ ${check.name}`);
    for (const p of problems) console.log(p);
  }
}

if (failed > 0) {
  console.log(`\n${failed} check(s) failed — contract and copies disagree. Fix before release.`);
  process.exit(1);
}
console.log(`\nAll ${CHECKS.length} checks passed — no contract drift.`);
