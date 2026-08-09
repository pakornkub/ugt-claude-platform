#!/usr/bin/env node
// Doc status check — every Markdown file in docs/ must declare what it IS, so a
// reader can tell "current standard" from "historical record" at a glance.
//
//   node scripts/check-doc-status.mjs
//
// The convention (put the block right under the H1, inside one blockquote):
//
//   > **Status:** Living · **Date:** 2026-07-29 · **Applies-to:** ugt-core 2.x
//   > **Last-reviewed:** 2026-08-09 — <one line on what was confirmed>
//
// Status values:
//   Living      — kept true as reality changes; requires Last-reviewed
//   Accepted    — a decision record still in force; body is never edited
//   Superseded  — replaced; requires Superseded-by pointing at a real path
//   Done        — the work it describes is finished; kept as history
//
// Rule of thumb at release time: does this release make any doc wrong?
//   Living → update it · record (Accepted/Done) → flip it to Superseded.
// Never edit a record's body to "modernize" it — that destroys the history it exists for.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DOCS = join(ROOT, 'docs');
const VALID = ['Living', 'Accepted', 'Superseded', 'Done'];
const STALE_DAYS = 180;
const HEADER_LINES = 15; // the block must be near the top, not buried
const TODAY = new Date();

const field = (text, name) => text.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([^·\\n]+)`))?.[1]?.trim();

if (!existsSync(DOCS)) {
  console.log('No docs/ directory — nothing to check.');
  process.exit(0);
}

const files = readdirSync(DOCS).filter((f) => f.endsWith('.md'));
let failed = 0;
let warned = 0;

for (const file of files) {
  const body = readFileSync(join(DOCS, file), 'utf8');
  const header = body.split('\n').slice(0, HEADER_LINES).join('\n');
  const problems = [];
  const warnings = [];

  const status = field(header, 'Status');
  const date = field(header, 'Date');

  if (!status) {
    problems.push(`no **Status:** block in the first ${HEADER_LINES} lines — a reader cannot tell if this is current`);
  } else if (!VALID.includes(status)) {
    problems.push(`Status "${status}" is not one of ${VALID.join(' | ')}`);
  }
  if (!date) problems.push('no **Date:** (when it was written — never changes afterwards)');

  if (status === 'Superseded') {
    const by = field(header, 'Superseded-by');
    if (!by) {
      problems.push('Status is Superseded but there is no **Superseded-by:** — the reader is left with no forward pointer');
    } else {
      const path = by.match(/`([^`]+)`/)?.[1];
      if (!path) problems.push('Superseded-by must name the replacement in `backticks`');
      else if (!existsSync(join(ROOT, path))) problems.push(`Superseded-by points at "${path}" which does not exist`);
    }
  }

  if (status === 'Living') {
    const reviewed = field(header, 'Last-reviewed');
    const day = reviewed?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!day) {
      problems.push('Status is Living but there is no **Last-reviewed:** YYYY-MM-DD — nobody can tell if it still holds');
    } else {
      const age = Math.floor((TODAY - new Date(day)) / 86_400_000);
      if (age > STALE_DAYS) warnings.push(`last reviewed ${age} days ago — confirm it is still true, then bump Last-reviewed`);
    }
  }

  if (problems.length) {
    failed++;
    console.log(`✘ docs/${file}`);
    for (const p of problems) console.log(`    ${p}`);
  } else if (warnings.length) {
    warned++;
    console.log(`! docs/${file}  [${status}]`);
    for (const w of warnings) console.log(`    ${w}`);
  } else {
    console.log(`✔ docs/${file}  [${status}]`);
  }
}

console.log(`\n${files.length - failed - warned} ok · ${warned} warning(s) · ${failed} failed`);
if (failed > 0) {
  console.log('Fix before release: update the doc (Living) or flip it to Superseded (record).');
  process.exit(1);
}
