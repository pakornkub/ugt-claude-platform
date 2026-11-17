#!/usr/bin/env node
// Bundles plugins/ugt-devops-mcp/src/{jenkins,sonarqube}.mjs with their deps
// into plugins/ugt-devops-mcp/mcp/ — committed, so the plugin ships no
// package.json and Claude Code never runs `npm ci` on install/update (its
// 60 s limit timed out on the office network and left the servers without
// node_modules → CONNECTION_CLOSED).
//   npm ci && node build.mjs           rebuild after editing src/ or bumping a dep
//   npm ci && node build.mjs --check   fail if mcp/ is not what src/ builds to
import { build } from 'esbuild';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const plugin = join(here, '../../plugins/ugt-devops-mcp');
const check = process.argv.includes('--check');
const out = join(plugin, 'mcp');
if (!check) rmSync(out, { recursive: true, force: true }); // no stale chunk-<hash> left behind

const result = await build({
  entryPoints: ['jenkins', 'sonarqube'].map((n) => join(plugin, 'src', `${n}.mjs`)),
  outdir: out,
  outExtension: { '.js': '.mjs' }, // the plugin has no package.json "type"
  bundle: true,
  splitting: true, // SDK + zod once, in a shared chunk
  format: 'esm',
  platform: 'node',
  target: 'node20',
  nodePaths: [join(here, 'node_modules')], // src/ has no node_modules of its own
  chunkNames: 'chunk-[hash]',
  // CJS deps inside an ESM bundle call require() for Node built-ins
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  legalComments: 'eof',
  logLevel: 'warning',
  write: !check,
});

if (check) {
  const stale = result.outputFiles.filter((f) => {
    try {
      return readFileSync(f.path, 'utf8') !== f.text;
    } catch {
      return true;
    }
  });
  const built = new Set(result.outputFiles.map((f) => f.path));
  for (const name of readdirSync(out)) {
    if (!built.has(join(out, name))) stale.push({ path: join(out, name) });
  }
  if (stale.length) {
    for (const f of stale) console.error(`✘ ${relative(join(here, '../..'), f.path)} is not what src/ builds to (stale, missing or extra)`);
    console.error('  → cd scripts/devops-mcp && npm ci && node build.mjs, then commit plugins/ugt-devops-mcp/mcp/');
    process.exit(1);
  }
  console.log(`✔ devops-mcp bundle matches src/ (${result.outputFiles.length} files)`);
}
