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
//   - control-box override on <Button>/<IconAction> — `h-*` `p*-*` `size-*` in
//     className (DESIGN.md §0.4: size comes from the `size` prop; if no size
//     fits, the fix is components/ui/button.tsx). `w-*` is layout, not box, and
//     `variant="link"` is text not a button — both exempt. Added 4.37.0 after
//     tiptap-editor shipped `size="sm"` + `size-7 p-0`, which hand-rolled the
//     box `size="icon"` already draws
//   - native `title=` on <Button>/<IconAction> — the kit's Tooltip is the
//     label carrier; the browser tooltip is unthemed, ~1s late and never
//     appears on touch (same 4.37.0 tiptap report)
// WARN rules (reported, exit 0):
//   - `<h1` — pages compose PageTitle from ui/page-shell, not raw headings

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// เก็บ opening tag ของ JSX element ชื่อหนึ่งทั้งอัน แบบรู้ quote/วงเล็บ — หยุดที่
// `>` ที่ depth 0 เท่านั้น ไม่งั้น `onClick={() => …}` ตัดแท็กขาดกลางทางแล้วกฎ
// ข้างล่างจะมองไม่เห็น className ที่ตามมา
function openingTags(src, name) {
  const tags = [];
  const re = new RegExp('<' + name + '(?![A-Za-z0-9])', 'g');
  let m;
  while ((m = re.exec(src))) {
    let depth = 0;
    let quote = null;
    let i = m.index + m[0].length;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'" || c === '`') quote = c;
      else if (c === '{' || c === '(') depth++;
      else if (c === '}' || c === ')') depth--;
      else if (c === '>' && depth === 0) break;
    }
    tags.push(src.slice(m.index, i));
  }
  return tags;
}

// utility ที่กำหนด "กล่อง" ของ control · `w-*` ไม่อยู่ในนี้เพราะเป็น layout
const BOX_UTILITY = /^(?:h|p|px|py|pt|pb|pl|pr|size)-/;

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
      for (const name of ['Button', 'IconAction']) {
        for (const tag of openingTags(body, name)) {
          const flat = tag.replace(/\s+/g, ' ').slice(0, 70);
          if (/\btitle\s*=/.test(tag)) {
            failures.push(
              `${rel} — native title= on <${name}> (label goes in aria-label + the kit Tooltip; the browser tooltip is unthemed, late and invisible on touch) → ${flat}`
            );
          }
          if (/variant\s*=\s*"link"/.test(tag)) continue;
          const cls = tag.match(/className\s*=\s*(?:"([^"]*)"|\{([\s\S]*)\})/);
          if (!cls) continue;
          const literals =
            cls[1] === undefined
              ? [...cls[2].matchAll(/['"`]([^'"`]*)['"`]/g)].map((x) => x[1])
              : [cls[1]];
          const box = literals
            .flatMap((literal) => literal.split(/\s+/))
            .filter((token) => BOX_UTILITY.test(token.replace(/^(?:[a-z-]+:)+/, '')));
          if (box.length) {
            failures.push(
              `${rel} — control-box override on <${name}>: ${box.join(' ')} (DESIGN.md §0.4 — size comes from the \`size\` prop; no size fits → fix components/ui/button.tsx) → ${flat}`
            );
          }
        }
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
