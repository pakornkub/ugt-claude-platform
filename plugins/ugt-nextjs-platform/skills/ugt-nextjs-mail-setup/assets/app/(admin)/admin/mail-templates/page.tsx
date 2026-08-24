// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-mail-setup/app/(admin)/admin/mail-templates/page.tsx
// kit-hash: 68ea9bf17ed1
// app/(admin)/admin/mail-templates/page.tsx — server guard + fetch; editor in
// MailTemplatesManager. อยู่ใน (admin) group ของ ugt-nextjs-auth-setup จึงผ่าน
// syncPermissionsIfNeeded ของ layout อยู่แล้ว — คีย์ MAIL_TEMPLATES_MANAGE ที่
// เพิ่มตอนติดตั้ง (SKILL.md §4.5) เข้าฐานข้อมูลเองเมื่อเปิดหน้า admin ครั้งแรก
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { PageDescription, PageHeader, PageHeaderText, PageTitle } from '@/components/ui/page-shell';
import { MailTemplatesManager } from '@/components/mail-templates-manager';
import {
  DEFAULT_MAIL_TEMPLATES,
  MAIL_TEMPLATE_DEFINITIONS,
  mailTemplateSchema,
  mailTemplateSettingKey,
} from '@/lib/types/mail-templates';

export default async function AdminMailTemplatesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(PERMISSIONS.MAIL_TEMPLATES_MANAGE)) redirect('/');

  // override ทุกคีย์ใน query เดียว — parse แบบ fail-open เหมือน getMailTemplate:
  // แถวที่เสีย/ไม่ตรง schema ถือว่าไม่มี override (อีเมลจริงก็ fallback แบบเดียวกัน)
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: MAIL_TEMPLATE_DEFINITIONS.map((d) => mailTemplateSettingKey(d.key)) } },
    select: { key: true, value: true },
  });
  const overrideByKey = new Map(
    rows.flatMap((row) => {
      try {
        const parsed = mailTemplateSchema.safeParse(JSON.parse(row.value));
        return parsed.success ? [[row.key, parsed.data] as const] : [];
      } catch {
        return [];
      }
    })
  );

  // menuKey/labelKey/descriptionKey มาจาก definition ที่อยู่ module scope
  // (เรียก useTranslations ไม่ได้) — resolve เป็นข้อความจริงที่นี่ ซึ่งเป็น
  // Server Component เดียวที่มี request context ให้ getTranslations ใช้
  const t = await getTranslations('mail');
  const items = MAIL_TEMPLATE_DEFINITIONS.map((def) => {
    const override = overrideByKey.get(mailTemplateSettingKey(def.key));
    const fallback = DEFAULT_MAIL_TEMPLATES[def.key];
    return {
      key: def.key,
      menu: t(`templates.${def.menuKey}` as Parameters<typeof t>[0]),
      label: t(`templates.${def.labelKey}` as Parameters<typeof t>[0]),
      description: t(`templates.${def.descriptionKey}` as Parameters<typeof t>[0]),
      variables: def.variables,
      subject: (override ?? fallback).subject,
      html: (override ?? fallback).html,
      defaultSubject: fallback.subject,
      defaultHtml: fallback.html,
      isOverridden: override !== undefined,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader>
        <PageHeaderText>
          <PageTitle>{t('page.title')}</PageTitle>
          <PageDescription>{t('page.description')}</PageDescription>
        </PageHeaderText>
      </PageHeader>
      <MailTemplatesManager items={items} />
    </div>
  );
}
