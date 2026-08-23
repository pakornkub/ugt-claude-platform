// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/i18n/messages.ts
// kit-hash: 1ee96fefb75c
// Every namespace the kit ships, merged per locale. A skill that adds its own
// catalog (auth, mail, upload) registers it here — one import + one spread.
// Project-owned strings belong in messages/app.*.ts, NOT in a kit namespace:
// kit files are overwritten wholesale on plugin update.
import { kitEn } from '@/messages/kit.en';
import { kitTh } from '@/messages/kit.th';
import type { AppLocale } from '@/lib/format';

export type { AppLocale };

// โครงของ catalog มาจาก kit.th.ts โดยตรง (มติ 2.4 — "type safety แถม"): เพิ่ม
// namespace หรือ key ใน th แล้วลืมใส่ใน en จะพังตั้งแต่ตอน type-check ไม่ต้อง
// รอด่าน check-i18n.mjs · ค่าเป็น `string` ไม่ใช่ literal ของภาษาไทย ไม่งั้น
// kit.en.ts assign เข้าไม่ได้เลยสักตัว
type KitCatalog = {
  [Namespace in keyof typeof kitTh]: Record<keyof (typeof kitTh)[Namespace], string>;
};

export const messages: Record<AppLocale, { kit: KitCatalog }> = {
  th: { kit: kitTh },
  en: { kit: kitEn },
};

export const DEFAULT_LOCALE: AppLocale = 'th';
