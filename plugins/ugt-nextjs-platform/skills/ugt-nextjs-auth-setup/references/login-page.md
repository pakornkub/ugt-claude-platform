# Login page — the two-column hero (DESIGN.md §3)

SKILL.md §5.5 step 1. Every org login page has the same shape, so users meet
the same entrance in every app:

```
lg and up                                        < lg (mobile)
┌──────────────────────┬──────────────────┐      ┌──────────────┐
│ ▓ ube-logo-long      │                  │      │              │
│ ▓                    │   ┌──────────┐   │      │  login form  │
│ ▓ App name (h2)      │   │  login   │   │      │  alone,      │
│ ▓ one-line purpose   │   │  form    │   │      │  centred     │
│ ▓ [icon] feature × 3–4│   └──────────┘   │      │              │
│ ▓ footer line        │   bg-muted/30    │      └──────────────┘
└──────────────────────┴──────────────────┘
  bg-primary (+ optional photo under a bg-primary/65 overlay)
```

The layout is the kit's `components/login-shell.tsx` (`<LoginShell hero={…}>`).
It holds **no copy**: the words belong to the project and come from its own
catalog, so a kit update never overwrites them and th+en works like every
other screen.

## 1. The page (project-owned)

`app/(auth)/login/page.tsx` — the form goes in as children, so the SSO button
and the LDAP/Local tabs sit in the right column exactly as before:

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

No `<main>` here — the root layout already wraps the route in one. `useSearchParams`
inside the form needs no `<Suspense>` because the page passes the values as props.

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
    footer: '© {year} UBE · Develop by SW',
  },
} as const;
```

Write the features from the requirement brief: what the app does for its
users, 3–4 rows, one short line each — not a feature dump. The description is
one sentence.

## 3. The photo (optional)

`public/login-hero.webp` is picked up automatically (`existsSync` once per
process); without it the panel is plain primary — no broken image. If the
project wants one:

1. **Generate** — with the `gemini-image` MCP when it is available, otherwise
   any licensed stock photo: **portrait 4:5**, the app's real-world setting
   (trucks/warehouse, office desk, plant floor …), **no text, no logos, no
   recognisable faces**, colours in the brand tones (the indigo primary reads
   through the overlay anyway — busy or warm-coloured photos turn muddy).
2. **Convert** to webp about **1440 px wide at quality ≈ 78** (≈ 150 KB — the
   trn-invoice-tracking photo is 146 KB):

   ```bash
   cwebp -q 78 -resize 1440 0 hero.png -o public/login-hero.webp
   ```

   or with sharp (`npm i -D sharp` if absent):
   `node -e "require('sharp')('hero.png').resize({width:1440}).webp({quality:78}).toFile('public/login-hero.webp')"`
3. Commit only the webp. `verify.mjs` warns above 400 KB — the login page is the
   one every user loads first, often on a slow branch-office link.

## 4. Preserve mode / a project keeping its own form (§5.7)

`LoginShell` does not know about `LoginForm` — wrap the project's own form
instead (`<LoginShell hero={hero}><ProjectLoginForm /></LoginShell>`), keep its
routes and redirect targets, and record "login hero adopted, own form kept" in
DESIGN.md §10. A project that keeps its whole page (no hero) records that as a
deviation instead; `verify.mjs` warns, it does not fail.
