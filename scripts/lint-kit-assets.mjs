#!/usr/bin/env node
// Release gate: scan every plugin asset (.tsx under plugins/*/skills/*/assets/)
// for patterns the org design contract forbids. Born from the 4.25.0 field
// report — nav-user.tsx shipped with Radix `onSelect` into the Base UI
// (base-mira) kit, so the logout/profile menu items rendered fine and silently
// did nothing. The design contract lived in DESIGN.md but nothing enforced it
// on the assets themselves; this script is that missing enforcement.
//
//   node scripts/lint-kit-assets.mjs          # run at every release, next to stamp-kit-assets.mjs --check
//
// FAIL rules (exit 1):
//   - `asChild`             — Radix idiom; Base UI ignores it (kit rule: grep must stay 0)
//   - Radix-only overlay props (onEscapeKeyDown / onPointerDownOutside /
//     onInteractOutside / onOpenAutoFocus / onCloseAutoFocus / forceMount /
//     delayDuration) — Base UI names them differently, so they are silently
//     dropped: the dialog/tooltip just behaves like the prop was never passed
//   - `checked="indeterminate"` — Radix tri-state; Base UI Checkbox takes a
//     separate `indeterminate` boolean, and the string is truthy → shows as
//     fully checked (shipped once in role-form)
//   - `data-[state=…]` on a PRIMITIVE — Base UI emits data-open / data-closed /
//     data-popup-open; a data-[state=open] class is a dead selector. Markup that
//     sets its own data-state is exempt via an inline // lint-ok:data-state note
//   - `onSelect=` in a file that renders <DropdownMenuItem> — Radix menu API;
//     Base UI menu items take onClick (react-day-picker Calendar files exempt:
//     Calendar's own onSelect prop is legitimate)
//   - `window.confirm(` / `window.alert(` — destructive = ConfirmActionDialog (DESIGN.md §4)
//   - import from `@radix-ui/` — the kit is Base UI (มติ 2026-08-04)
// WARN rules (reported, exit 0):
//   - `<h1` — pages compose PageTitle from ui/page-shell, not raw headings

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const failures = [];
const warnings = [];
let scanned = 0;

for (const pluginDir of readdirSync(join(ROOT, 'plugins'))) {
  const skillsDir = join(ROOT, 'plugins', pluginDir, 'skills');
  let skills;
  try {
    skills = readdirSync(skillsDir);
  } catch {
    continue;
  }
  for (const skill of skills) {
    for (const file of walk(join(skillsDir, skill, 'assets'))) {
      if (!/\.tsx?$/.test(file)) continue;
      scanned++;
      const rel = relative(ROOT, file).split(sep).join('/');
      const raw = readFileSync(file, 'utf8');
      const body = stripComments(raw);

      // ไฟล์ที่มี control byte จะกลายเป็น "binary" สำหรับ grep/rg ทุกตัว —
      // asset ล่องหนจากทุก gate ในรีโปนี้ (เจอจริง: storage.ts 4.25.0)
      // eslint-disable-next-line no-control-regex
      if (/[\0\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw)) {
        failures.push(`${rel} — raw control byte(s) in source (file reads as binary → invisible to every grep-based gate)`);
      }
      if (/\basChild\b/.test(body)) {
        failures.push(`${rel} — asChild (Radix; Base UI ignores it — use render={<... />})`);
      }
      const radixProps = [
        'onEscapeKeyDown',
        'onPointerDownOutside',
        'onInteractOutside',
        'onOpenAutoFocus',
        'onCloseAutoFocus',
        'forceMount',
        'delayDuration',
      ].filter((prop) => new RegExp('\\b' + prop + '\\s*=').test(body));
      if (radixProps.length) {
        failures.push(
          `${rel} — Radix-only prop(s): ${radixProps.join(', ')} (Base UI drops them silently; TooltipProvider uses \`delay\`, overlays use their own close handlers)`
        );
      }
      if (/checked\s*=\s*[{"']\s*['"]indeterminate/.test(body)) {
        failures.push(
          `${rel} — checked="indeterminate" (Radix tri-state; Base UI Checkbox wants checked={boolean} + indeterminate={boolean} — the string is truthy and renders fully checked)`
        );
      }
      // data-[state=…] is only valid on markup that sets data-state itself
      if (/data-\[state=/.test(body) && !/lint-ok:data-state/.test(raw)) {
        failures.push(
          `${rel} — data-[state=…] selector (Base UI emits data-open / data-closed / data-popup-open). If this element sets its own data-state, add a // lint-ok:data-state comment`
        );
      }
      if (
        /<DropdownMenuItem/.test(body) &&
        /onSelect\s*=/.test(body) &&
        !/react-day-picker|<Calendar\b/.test(body)
      ) {
        failures.push(`${rel} — onSelect on a menu item (Radix; Base UI items take onClick — the button renders but does nothing)`);
      }
      if (/(?:globalThis\.)?window\.(confirm|alert|prompt)\s*\(/.test(body)) {
        failures.push(`${rel} — window.confirm/alert/prompt (native dialogs banned — kit dialogs only, DESIGN.md §4)`);
      }
      if (/from\s+['"]@radix-ui\//.test(body)) {
        failures.push(`${rel} — imports @radix-ui/* (the kit is Base UI / base-mira, มติ 2026-08-04)`);
      }
      // ui/* primitives own their internals (page-shell itself renders the h1);
      // login-form's h1 is the login-page hero title — no PageShell exists there;
      // mail templates are email HTML — h1 there is email markup, not a page
      if (
        /<h1[\s>]/.test(body) &&
        !/\/assets\/ui\//.test(rel) &&
        !rel.endsWith('components/login-form.tsx') &&
        !/mail-templates/.test(rel)
      ) {
        warnings.push(`${rel} — raw <h1> (pages compose PageTitle from ui/page-shell)`);
      }
    }
  }
}

for (const w of warnings) console.warn(`! ${w}`);
if (failures.length) {
  console.error(`✘ ${failures.length} forbidden pattern(s) in ${scanned} asset(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`✔ kit assets clean (${scanned} scanned, ${warnings.length} warning(s))`);
