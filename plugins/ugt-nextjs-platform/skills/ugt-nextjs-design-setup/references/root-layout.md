# Root layout wiring — fonts, providers, DEV environment bar, next-intl plugin (SKILL.md Step 3.3)

Contents: §Fonts + `lang` · §Provider stack · §DEV environment indicator ·
§next-intl plugin (`next.config.ts`)

## Fonts + `lang`

Fonts + providers go in `app/layout.tsx` — the exact wiring below.
**Preserve mode with ข้อ 10 = คงฟ้อนต์เดิม**: keep the project's existing
`next/font` import instead of Inter, point `--font-sans` in `@theme inline`
at its variable — keep Noto Sans Thai as the Thai fallback when that font has
no Thai glyphs — and write the มติ sentence `ฟ้อนต์: คงของเดิม (<ชื่อ>)` into
DESIGN.md §10; `verify.mjs` reads that sentence and stops demanding Inter/Noto.

```tsx
import { Geist_Mono, Inter, Noto_Sans_Thai } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-noto-sans-thai' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
// <html lang="th" className={`${inter.variable} ${notoSansThai.variable} ${geistMono.variable}`}>
```

`<html lang="th">` → `<html lang={locale}>` เมื่อ ภาษา = th+en (อ่าน locale
ด้วย `getLocale()` จาก `next-intl/server` ใน RootLayout ซึ่งเป็น Server
Component อยู่แล้ว) — `lang` ที่ไม่ตรงภาษาจริงทำให้ screen reader อ่านผิดภาษา
และ `:lang()` ใน CSS เลือกฟอนต์ผิด

## Provider stack

Body wraps: **`NextIntlClientProvider` (นอกสุด — provider อื่นและ children
ทุกตัวต้องอยู่ข้างใน ไม่งั้น `useTranslations` โยน error ตอน render)** →
**`QueryProvider` (from `assets/components/query-provider.tsx`
— the app's single QueryClient; also copy `assets/lib/http-error.ts`, and
`assets/ui/query-progress.tsx` + its CSS block rendered just inside the
provider)** → `ThemeProvider` (from `assets/components/theme-provider.tsx`,
when dark mode = มี) → **`TooltipProvider` (required — the mira styles'
Tooltip does not self-wrap a provider; sidebar tooltips crash prerender
without it; delay 0 per the agreement)** → children + `<Toaster richColors />`.

## DEV environment indicator

**dev ต้องมองออกทันทีว่าไม่ใช่ prod** — สองตัวอยู่ host เดียวกัน ต่างกันแค่ basePath
(`/<project>` vs `/<project>-dev`, ตาม `ugt-nextjs-cicd-setup`) · ผู้ใช้จึงกรอกข้อมูลจริงลง
dev หรือทดสอบบน prod โดยไม่รู้ตัว · มี 2 จุด ใช้ `isDevEnvironment()` ตัวเดียวกัน:
**(1) แถบเหลืองเต็มความกว้างบนสุดของทุกหน้า** (รวมหน้า login ที่อยู่นอก shell — จึงต้อง
mount ที่ root layout ไม่ใช่ใน site-header) และ **(2) แท็บ browser ขึ้นต้น `[DEV] `**
(prefix ไม่ใช่ suffix: แท็บแคบตัดท้ายทิ้ง — และตรงกับ `[DEV] ` ที่หัวเรื่องอีเมลของ
mail-setup)

**ก่อนอื่นให้ `lib/env.ts` รู้จัก basePath** (design-setup รันก่อน auth-setup จึงอาจยังไม่มี):
`NEXT_PUBLIC_BASE_PATH: z.string().default('')` ใน `client` block **และ**
`NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH` ใน `runtimeEnv` — มีอยู่แล้วก็อย่า
ซ้ำ (auth-setup §5.4 ประกาศตัวเดียวกัน) · แล้ว copy `assets/lib/environment.ts`
(+ `environment.test.ts`) → `lib/` และ `assets/components/dev-environment-bar.tsx`
→ `components/`:

```tsx
import { DevEnvironmentBar } from '@/components/dev-environment-bar';
import { isDevEnvironment } from '@/lib/environment';

const DEV_PREFIX = isDevEnvironment() ? '[DEV] ' : '';
export const metadata: Metadata = { title: `${DEV_PREFIX}<App name>`, ... };

// <NextIntlClientProvider> ... — แถบเป็นลูกคนแรก อยู่เหนือ provider/shell ทั้งหมด (ไม่ sticky)
//   {isDevEnvironment() && <DevEnvironmentBar />}
//   <QueryProvider> ...{children}... </QueryProvider>
```

ถ้าหน้าไหนตั้ง `title` เอง ให้ root ใช้
`title: { template: `${DEV_PREFIX}%s · <App name>`, default: `${DEV_PREFIX}<App name>` }`
แทน ไม่งั้นหน้านั้นทับ prefix หาย · **โปรเจคที่ลง 4.71.0–4.75.0 มา** ใช้ suffix ` (DEV)` →
เปลี่ยนเป็น prefix ตามนี้ (ป้าย `DEV` ใน site-header คงไว้เป็นตัวเตือนเล็กตอนแถบเลื่อนพ้นจอ)

- `isDevEnvironment()` เป็น **server-only** (ใช้ `env` จาก `@/lib/env`) — Client Component
  ห้าม import · `?? ''` ข้างในห้ามตัด (CI build ตั้ง `SKIP_ENV_VALIDATION` → ค่าเป็น
  `undefined` → ไม่มี `?? ''` = Jenkins stage Build พัง `Cannot read properties of
  undefined (reading 'endsWith')` ที่ `app/layout.tsx` · เจอจริงตอนทำ 4.71.0)
- โปรเจคที่ deploy **ไม่มี basePath** (cicd interview ข้อ 3 = ไม่มี) ไม่มีอะไรแยก dev/prod —
  `isDevEnvironment()` เป็น false เสมอ แถบไม่ขึ้น · แจ้งเจ้าของ ไม่ต้องเดา
- ข้อความมาตรฐานเป็นกลาง ("DEV environment — test data only" / "สภาพแวดล้อมทดสอบ (DEV) —
  ข้อมูลในระบบนี้ไม่ใช่ข้อมูลจริง") ใน `kit.devEnvironment` · โปรเจคที่ลง **dev mode ของ
  mail-setup** ต่อประโยคเรื่องอีเมลได้ผ่าน `note` — เขียนใน `messages/app.*.ts` ของโปรเจค
  (ไม่ใช่ namespace kit): `<DevEnvironmentBar note={tApp('devMailNote')} />` เช่น "every email
  goes back to the person who triggered it" · ประโยคนี้จริงเฉพาะเมื่อ dev mode เปิดอยู่

## next-intl plugin (`next.config.ts`)

**แล้วลงทะเบียน plugin ของ next-intl ใน `next.config.ts` — ไม่ใช่ของเสริม**:

```ts
import createNextIntlPlugin from 'next-intl/plugin';
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
// ...existing nextConfig...
export default withNextIntl(nextConfig);
```

next-intl หา `getRequestConfig` ผ่าน alias ที่ plugin ตัวนี้สร้างให้ตอน build
เท่านั้น ไม่ลงทะเบียน = `i18n/request.ts` ไม่เคยถูกโหลดเลยสักครั้ง แล้ว
`getLocale()` ใน RootLayout กับ `t()` ทุกตัวโยน error ตอน render —
**แอปไม่ขึ้นทั้งแอป ไม่ใช่แค่ประสบการณ์ที่แย่ลง** และตั้งแต่ 4.46.0 คิต 5 ตัว
เรียก `useTranslations` โดย `next-intl` เป็น dependency ของทุกโปรเจค
จึงพังทุกโปรเจค ไม่ใช่เฉพาะที่ตอบ th+en · ต้องส่ง path `'./i18n/request.ts'`
ให้ชัด เพราะเรา copy ไฟล์ไปไว้ที่ `i18n/` ไม่ใช่ตำแหน่ง default ของ next-intl ·
`scripts/verify.mjs` fail ถ้าไม่มีบรรทัดนี้
