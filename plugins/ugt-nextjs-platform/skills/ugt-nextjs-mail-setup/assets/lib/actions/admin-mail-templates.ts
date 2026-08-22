// kit: ugt-nextjs-platform 4.27.0 · ugt-nextjs-mail-setup/lib/actions/admin-mail-templates.ts
// kit-hash: 7a835848c195
'use server';

// lib/actions/admin-mail-templates.ts — save/reset/preview for /admin/mail-templates.
// Guard order per org contract: session → permission → action → audit log.
// ต้องเพิ่ม MAIL_TEMPLATES_MANAGE ใน lib/permissions.ts ก่อน (SKILL.md §4.5)
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getUserPermissions } from '@/lib/get-user-permissions';
import { renderComposedMail } from '@/lib/mail-templates';
import {
  MAIL_TEMPLATE_DEFINITION_BY_KEY,
  MAIL_TEMPLATE_KEYS,
  MAIL_TEMPLATE_PREVIEW_SAMPLE_BASE,
  mailTemplateSchema,
  mailTemplateSettingKey,
  type MailTemplateKey,
} from '@/lib/types/mail-templates';

type ActionResult = { success: true } | { success: false; error: string };

// schema ให้ error เป็น CODE (ไม่มี i18n ฝั่ง action) — แปลที่นี่ก่อนส่งกลับ UI
const ERROR_TH: Record<string, string> = {
  subjectRequired: 'กรอกหัวข้ออีเมล',
  subjectTooLong: 'หัวข้อยาวเกิน 300 ตัวอักษร',
  bodyRequired: 'กรอกเนื้อหาอีเมล',
  bodyTooLong: 'เนื้อหายาวเกิน 20,000 ตัวอักษร',
};

function isTemplateKey(key: string): key is MailTemplateKey {
  return (MAIL_TEMPLATE_KEYS as readonly string[]).includes(key);
}

async function requirePermission(key: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false as const, error: 'Unauthorized' };
  const perms = await getUserPermissions(session.user.id);
  if (!perms.includes(key)) return { ok: false as const, error: 'Forbidden' };
  return { ok: true as const, session };
}

async function auditLog(userId: string, action: string, detail: unknown) {
  await prisma.activityLog.create({ data: { userId, action, detail: JSON.stringify(detail) } }).catch(() => {});
}

/** บันทึก override ของ template ลง AppSettings (`mailTemplate:<key>`). */
export async function saveMailTemplateAction(
  key: string,
  input: { subject: string; html: string }
): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.MAIL_TEMPLATES_MANAGE);
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isTemplateKey(key)) return { success: false, error: 'Unknown template' };

  const parsed = mailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? '';
    return { success: false, error: ERROR_TH[code] ?? 'ข้อมูลไม่ถูกต้อง' };
  }

  await prisma.appSetting.upsert({
    where: { key: mailTemplateSettingKey(key) },
    update: { value: JSON.stringify(parsed.data), updatedBy: gate.session.user.email },
    create: {
      key: mailTemplateSettingKey(key),
      value: JSON.stringify(parsed.data),
      updatedBy: gate.session.user.email,
    },
  });

  await auditLog(gate.session.user.id, 'mail-templates.update', { key });
  revalidatePath('/admin/mail-templates');
  return { success: true };
}

/** ลบ override → อีเมลกลับไปใช้ค่าเริ่มต้นในโค้ด (fail-open design เดิม). */
export async function resetMailTemplateAction(key: string): Promise<ActionResult> {
  const gate = await requirePermission(PERMISSIONS.MAIL_TEMPLATES_MANAGE);
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isTemplateKey(key)) return { success: false, error: 'Unknown template' };

  await prisma.appSetting.deleteMany({ where: { key: mailTemplateSettingKey(key) } });

  await auditLog(gate.session.user.id, 'mail-templates.reset', { key });
  revalidatePath('/admin/mail-templates');
  return { success: true };
}

/**
 * Preview ด้วย renderer ตัวเดียวกับตอนส่งจริง (renderComposedMail + chrome) —
 * สิ่งที่แอดมินเห็นคือสิ่งที่ผู้รับได้ ค่าตัวอย่างมาจาก preview sample ของ
 * template นั้น ๆ · ยังไม่บันทึก — preview จาก draft ที่กำลังพิมพ์
 */
export async function previewMailTemplateAction(
  key: string,
  input: { subject: string; html: string }
): Promise<{ success: true; subject: string; html: string } | { success: false; error: string }> {
  const gate = await requirePermission(PERMISSIONS.MAIL_TEMPLATES_MANAGE);
  if (!gate.ok) return { success: false, error: gate.error };
  if (!isTemplateKey(key)) return { success: false, error: 'Unknown template' };

  const parsed = mailTemplateSchema.safeParse(input);
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message ?? '';
    return { success: false, error: ERROR_TH[code] ?? 'ข้อมูลไม่ถูกต้อง' };
  }

  const def = MAIL_TEMPLATE_DEFINITION_BY_KEY[key];
  const vars = { ...MAIL_TEMPLATE_PREVIEW_SAMPLE_BASE, ...def.previewSample };
  const rendered = renderComposedMail(key, parsed.data, vars);
  return { success: true, ...rendered };
}
