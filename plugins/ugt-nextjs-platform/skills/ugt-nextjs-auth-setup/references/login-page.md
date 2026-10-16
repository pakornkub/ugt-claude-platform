# Login page — the dark hero + glass card (DESIGN.md §3)

SKILL.md §5.5 step 1. Every org login page has the same shape, so users meet
the same entrance in every app (มติ A4 2026-10-16, ported from ugt-hrms):

```
lg and up                                        < lg (mobile)
┌──────────────────────┬──────────────────┐      ┌──────────────┐
│░ ube-logo-long (white)│                  │      │░ logo        │
│░   photo, slow zoom   │   ┌──────────┐   │      │░┌──────────┐ │
│░                      │   │  login   │   │      │░│glass card│ │
│░ App name (big text)  │   │  form    │   │      │░│  + form  │ │
│░ one-line purpose     │   └──────────┘   │      │░└──────────┘ │
│░ [tile][tile]         │                  │      │░ footer      │
│░ [tile][tile]         │  footer line     │      │░ (photo fills│
└──────────────────────┴──────────────────┘      └─the screen)──┘
  fixed indigo-950 panel  bg-background            same panel, full screen
```

The layout is the kit's `components/login-shell.tsx` (`<LoginShell hero={…}>`).
It holds **no copy**: the words belong to the project and come from its own
catalog, so a kit update never overwrites them and th+en works like every
other screen. What the shell draws, and why, is §6.

## 1. The page (project-owned)

`app/(auth)/login/page.tsx` — the form goes in as children, so the SSO button
and the LDAP/Local tabs sit in the form column (the glass card on a phone):

```tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FileUp, ListChecks, QrCode, Timer } from 'lucide-react'; // the project's own picks
import { auth } from '@/lib/auth';
import { LoginForm } from '@/components/login-form';
import { LoginShell } from '@/components/login-shell';

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ reason?: string; error?: string; from?: string }> }>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect('/'); // valid session only — a stale cookie falls through to the form

  const { reason, error, from } = await searchParams;
  const t = await getTranslations('app.loginHero');
  const hero = {
    title: t('title'),
    description: t('description'),
    features: [
      { icon: FileUp, title: t('f1Title'), text: t('f1Text') },
      { icon: ListChecks, title: t('f2Title'), text: t('f2Text') },
      { icon: QrCode, title: t('f3Title'), text: t('f3Text') },
      { icon: Timer, title: t('f4Title'), text: t('f4Text') },
    ],
    footer: t('footer', { year: new Date().getFullYear() }),
  };

  return (
    <LoginShell hero={hero}>
      <LoginForm sessionExpired={reason === 'session_expired'} ssoError={error} from={from} />
    </LoginShell>
  );
}
```

No `<main>` in the page — `LoginShell` renders the form column as the page's
`<main>` (the root layout has none; only the `(admin)` shell renders its own).
The form keeps the page's single `<h1>`; the hero title is large text, not a
heading, so nothing outranks it in document order. `useSearchParams` inside the
form needs no `<Suspense>` because the page passes the values as props.

## 2. The copy (project catalog)

`messages/app.th.ts` / `app.en.ts` — the project's own namespace (design-setup's
`i18n/messages.ts` header: project strings belong in `app`, never a kit
namespace); register `app` there next to `kit`/`auth` the same way
(`i18n-wiring.md`):

```ts
export const appTh = {
  loginHero: {
    title: 'Transportation Invoice Tracking',
    description: 'ระบบติดตามใบแจ้งหนี้ค่าขนส่ง ตั้งแต่ vendor ส่งเอกสาร จนถึงส่งต่อฝ่ายบัญชี',
    f1Title: 'ส่ง invoice ออนไลน์', f1Text: 'กรอกข้อมูลและแนบเอกสารได้ในที่เดียว',
    // … f2–f4
    footer: '© {year} UBE · Developed by SW',
  },
} as const;
```

Write the features from the requirement brief: what the app does for its
users, 3–4 tiles (2 per row — an odd last tile spans the row), one short line
each — not a feature dump. The description is one sentence. The footer prints
under the form on every screen size.

## 3. The photo (optional)

`public/login-hero.webp` is picked up automatically (`existsSync` once per
process). Without it the panel draws a CSS-only backdrop (two soft indigo light
pools + a faint grid on indigo-950, same slow zoom) — it looks finished, never
a broken image. If the project wants a photo:

1. **Generate** — with the `gemini-image` MCP when it is available, otherwise
   any licensed stock photo: **portrait 4:5**, the app's real-world setting
   (trucks/warehouse, office desk, plant floor …), **no text, no logos, no
   recognisable faces**. The same photo is the left column on a laptop AND the
   full-screen backdrop on a phone (`object-cover`, centred): keep the subject
   in the middle third. The top and bottom are shaded dark for the logo and
   the hero text — a bright sky or white floor there just turns grey.
2. **Convert** to webp about **1440 px wide at quality ≈ 78** (≈ 150 KB — the
   trn-invoice-tracking photo is 146 KB):

   ```bash
   cwebp -q 78 -resize 1440 0 hero.png -o public/login-hero.webp
   ```

   or with sharp (`npm i -D sharp` if absent):
   `node -e "require('sharp')('hero.png').resize({width:1440}).webp({quality:78}).toFile('public/login-hero.webp')"`
3. Commit only the webp. `verify.mjs` warns above 400 KB — the login page is the
   one every user loads first (on a phone too now), often on a slow
   branch-office link.
4. **Changing the photo later**: the name is fixed, so browsers and the `next/image`
   cache keep the old one for hours (pitfalls `ui-rendering.md` §3) — after a swap,
   tell users to hard-refresh or expect the old photo until the cache expires.

## 4. Preserve mode / a project keeping its own form (§5.7)

`LoginShell` does not know about `LoginForm` — wrap the project's own form
instead (`<LoginShell hero={hero}><ProjectLoginForm /></LoginShell>`), keep its
routes and redirect targets, and record "login hero adopted, own form kept" in
DESIGN.md §10. On a phone that form sits on the translucent glass card: an
element painted `bg-background`/`bg-white` inside it (an "or" divider, a
header strip) shows as a solid bar — use borders, not fills (the kit form's
divider is two `h-px` rules). A project that keeps its whole page (no hero)
records that as a deviation instead; `verify.mjs` warns, it does not fail.

## 5. Existing installs (kit-sync)

- **Installed 4.79.0 or later** — `components/login-shell.tsx` already exists,
  so kit-sync lists it: overwrite when untouched (it holds no copy, the page
  keeps working unchanged — same `hero` prop). `components/login-form.tsx`
  changed too (divider without a background · primary buttons `size="cta"`):
  merge — and check `components/ui/button.tsx` has the `cta` size
  (design-setup `assets/ui/button-variants.md`); without it the form does not
  type-check. No new i18n keys, no globals.css edit (§6).
- **Installed before 4.79.0** — the shell is a new file kit-sync cannot list:
  1. Copy `assets/components/login-shell.tsx` → `components/login-shell.tsx`.
  2. Add `auth.login.orgLogoLabel` to `messages/auth.th.ts` / `auth.en.ts` (or
     merge the two catalogs kit-sync lists) and the `app.loginHero` keys of §2
     to the project's own `messages/app.*.ts` (register `app` if it is new).
  3. Rewrite `app/(auth)/login/page.tsx` per §1. If the old page (or a project
     layout around `/login`) rendered its own `<main>`, remove it — the shell
     now provides the landmark.
  4. Check `public/brand/ube-logo-long.svg` exists (design-setup ships it); add
     `public/login-hero.webp` only if wanted (§3).

Then run `node <auth-skill>/scripts/verify.mjs` — the login-page check warns on
anything left over, including a pre-A4 `bg-primary` shell.

## 6. What the shell draws (and the one token exception)

- **Fixed dark panel.** The panel is dark in light AND dark mode, so its
  colours are fixed palette steps — `indigo-950` ground and shading, white text
  and logo, `white/10` glass tiles — not theme tokens. This is the one
  sanctioned exception (DESIGN.md §3); the form column keeps the normal tokens.
  `bg-primary` is wrong here: a project re-tinted to a light primary would
  lose the white text. To re-tint, change `indigo-950` in the `PANEL_*`
  constants at the top of the shell (a project edit → kit-sync will merge).
- **Phones.** The panel becomes the full-screen backdrop; the form sits on a
  frosted-glass card `bg-card/90 backdrop-blur-xl border-white/30` — `bg-card`,
  not white, so dark mode stays readable. Hero text and tiles are desktop-only;
  the white long logo sits above the card.
- **Motion.** A slow Ken Burns zoom (1 → 1.08 over 30 s, alternating) on the
  photo or the fallback — `motion-safe:` only, and the global reduced-motion
  block in `globals.css` (design-setup) stops it as well. The keyframes ship
  inside the component (`<style href precedence>`, which React hoists into
  `<head>` once), so **globals.css needs no addition**. No 3D or JS animation
  library on the page everyone loads first.
- **Logo.** `public/brand/ube-logo-long.svg` through a CSS mask (never `<img>`),
  painted white; the URL carries the basePath explicitly, as does the photo
  (`next/image` does not prefix `/public` paths).
