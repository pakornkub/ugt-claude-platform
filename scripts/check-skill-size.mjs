#!/usr/bin/env node
// Size gate (maintainer rule 2026-10-11): SKILL.md ≤ 500 lines; a reference over
// ~200 lines is a warning — split it by topic instead of appending (README
// "สำหรับทีมดูแล platform", step 1).
//
//   node scripts/check-skill-size.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SKILL_MAX = 500;
const REF_WARN = 200;
let failed = 0;
let warned = 0;

const lines = (f) => readFileSync(f, 'utf8').split('\n').length;

for (const plugin of readdirSync('plugins')) {
  const skillsDir = join('plugins', plugin, 'skills');
  if (!existsSync(skillsDir)) continue;
  for (const skill of readdirSync(skillsDir)) {
    const skillMd = join(skillsDir, skill, 'SKILL.md');
    if (existsSync(skillMd) && lines(skillMd) > SKILL_MAX) {
      console.log(`✘ ${skillMd} — ${lines(skillMd)} lines (max ${SKILL_MAX}): move detail into references/`);
      failed++;
    }
    const refs = join(skillsDir, skill, 'references');
    if (!existsSync(refs)) continue;
    for (const f of readdirSync(refs).filter((x) => x.endsWith('.md'))) {
      const n = lines(join(refs, f));
      if (n > REF_WARN) {
        console.log(`! ${join(refs, f)} — ${n} lines: split by topic if it covers more than one`);
        warned++;
      }
    }
  }
}
console.log(failed ? `\n${failed} SKILL.md over ${SKILL_MAX} lines` : `✔ every SKILL.md ≤ ${SKILL_MAX} lines (${warned} long reference(s) to watch)`);
process.exit(failed ? 1 : 0);
