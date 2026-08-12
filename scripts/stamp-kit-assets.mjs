#!/usr/bin/env node
// Stamp every whole-file-copy asset with its plugin version + content hash,
// so installed projects can later tell "outdated copy, never touched" apart
// from "outdated copy the project edited" (→ ugt-nextjs-kit-sync).
//
//   node scripts/stamp-kit-assets.mjs           # (re)stamp — run at every release, AFTER the version bump
//   node scripts/stamp-kit-assets.mjs --check   # release gate: fail if any stamp is missing/stale
//
// Scope: .ts/.tsx under plugins/*/skills/*/assets/ — the files SKILLs copy
// verbatim into projects. Files that are merged/pasted/appended instead
// (globals.tokens.css, schema-*.prisma, env.example, *.md snippets) are NOT
// stamped: they never exist in a project as a whole-file copy, so a whole-file
// hash would be meaningless for them.
//
// Stamp = two comment lines right after 'use client' (or at the top):
//   // kit: <plugin> <version> · <skill>/<path-under-assets>
//   // kit-hash: <sha256-12 of content EXCLUDING the stamp lines, LF-normalized>
//
// LF-normalized because a Windows checkout flips endings — the hash must
// survive that, or every file on Windows reports as "edited".

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');

const STAMP_RE = /^\/\/ kit(?:-hash)?: .*\n?/gm;

export function contentHash(text) {
  const body = text.replace(/\r\n/g, '\n').replace(STAMP_RE, '');
  return createHash('sha256').update(body).digest('hex').slice(0, 12);
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const problems = [];
let stamped = 0;
let touched = 0;

for (const pluginDir of readdirSync(join(ROOT, 'plugins'))) {
  const manifestPath = join(ROOT, 'plugins', pluginDir, '.claude-plugin', 'plugin.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    continue;
  }

  const skillsDir = join(ROOT, 'plugins', pluginDir, 'skills');
  let skills = [];
  try {
    skills = readdirSync(skillsDir);
  } catch {
    continue;
  }

  for (const skill of skills) {
    const assetsDir = join(skillsDir, skill, 'assets');
    let files = [];
    try {
      files = [...walk(assetsDir)];
    } catch {
      continue;
    }

    for (const file of files) {
      if (!/\.tsx?$/.test(file)) continue;
      const relAsset = relative(assetsDir, file).split(sep).join('/');
      const original = readFileSync(file, 'utf8');
      const hash = contentHash(original);
      const stampLines =
        `// kit: ${manifest.name} ${manifest.version} · ${skill}/${relAsset}\n` +
        `// kit-hash: ${hash}\n`;

      const withoutStamp = original.replace(STAMP_RE, '');
      // Insert after the 'use client' directive when present — a stamp above it
      // would silently break the directive (it must be the first statement).
      const directive = withoutStamp.match(/^(['"]use client['"];\r?\n)/);
      const next = directive
        ? directive[1] + stampLines + withoutStamp.slice(directive[1].length)
        : stampLines + withoutStamp;

      stamped++;
      if (next !== original) {
        if (CHECK) {
          problems.push(`${manifest.name}/${skill}/${relAsset} — stamp missing or stale`);
        } else {
          writeFileSync(file, next, 'utf8');
          touched++;
        }
      }
    }
  }
}

if (CHECK) {
  if (problems.length) {
    console.error(`✘ ${problems.length} asset(s) need restamping (run: node scripts/stamp-kit-assets.mjs)`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`✔ kit stamps current on ${stamped} asset(s)`);
} else {
  console.log(`stamped ${stamped} asset(s), rewrote ${touched}`);
}
