// source: ugt-hrms lib/mail-templates.ts — installed by ugt-nextjs-mail-setup
import { prisma } from '@/lib/prisma';
import {
  composeEmail,
  DEFAULT_MAIL_TEMPLATES,
  MAIL_TEMPLATE_DEFINITION_BY_KEY,
  mailTemplateSchema,
  mailTemplateSettingKey,
  type MailTemplate,
  type MailTemplateKey,
} from '@/lib/types/mail-templates';

/** Values supplied for `{{token}}` substitution. */
export type MailTemplateVars = Record<string, string | null | undefined>;

const TOKEN_RE = /\{\{\s*(\w+)\s*\}\}/g;

/** Escape a value for safe interpolation into HTML (prevents email-body injection). */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Replace every `{{token}}` with its value. Unknown/nullish tokens become an
 * empty string (a missing value must never leave `{{token}}` visible in a real
 * email). Values are escaped when `escape` is true — which is the case for the
 * HTML body; the subject is plain text and rendered unescaped.
 *
 * `rawKeys` names tokens whose value is already-safe server-built HTML and is
 * inserted verbatim. **Never add a user-controlled value to rawKeys** — that is
 * the one route by which someone's free-text input could reach an inbox as markup.
 */
function substitute(
  text: string,
  vars: MailTemplateVars,
  escape: boolean,
  rawKeys?: ReadonlySet<string>
): string {
  return text.replaceAll(TOKEN_RE, (_, name: string) => {
    const raw = vars[name];
    if (raw === null || raw === undefined) return '';
    const str = String(raw);
    return escape && !rawKeys?.has(name) ? escapeHtml(str) : str;
  });
}

/** Render a template's subject + body against the supplied token values. */
export function renderTemplate(
  template: MailTemplate,
  vars: MailTemplateVars
): { subject: string; html: string } {
  return {
    subject: substitute(template.subject, vars, false),
    html: substitute(template.html, vars, true),
  };
}

/**
 * Render the full email for a key: wrap the editable content in the fixed
 * chrome via `composeEmail`, then substitute tokens. This is the send-time
 * renderer — the admin editor's preview composes exactly the same way, so what
 * an admin sees is what recipients get.
 */
export function renderComposedMail(
  key: MailTemplateKey,
  template: MailTemplate,
  vars: MailTemplateVars
): { subject: string; html: string } {
  const def = MAIL_TEMPLATE_DEFINITION_BY_KEY[key];
  const composed = composeEmail(def, template.html);
  const rawKeys = def.htmlVariables ? new Set(def.htmlVariables) : undefined;
  return {
    subject: substitute(template.subject, vars, false),
    html: substitute(composed, vars, true, rawKeys),
  };
}

/**
 * Active template for a key: the stored `AppSettings` override when it is valid,
 * otherwise the in-code default. A corrupt or schema-invalid override falls back
 * silently — a bad admin edit must not stop the workflow email from going out.
 */
export async function getMailTemplate(key: MailTemplateKey): Promise<MailTemplate> {
  const row = await prisma.appSetting.findUnique({
    where: { key: mailTemplateSettingKey(key) },
    select: { value: true },
  });
  if (!row?.value) return DEFAULT_MAIL_TEMPLATES[key];
  try {
    const parsed = mailTemplateSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : DEFAULT_MAIL_TEMPLATES[key];
  } catch {
    return DEFAULT_MAIL_TEMPLATES[key];
  }
}

/**
 * Dev-mode disclosure banner prepended to the body — states who the email
 * *would* have gone to in production, so a tester can verify routing without
 * anyone else receiving it.
 */
export function buildDevBanner(recipients: {
  to: string | string[];
  cc?: string | string[];
}): string {
  const toList = ([] as string[]).concat(recipients.to).filter(Boolean);
  const ccList = ([] as string[]).concat(recipients.cc ?? []).filter(Boolean);
  const rows = [
    `<tr><td style="padding:2px 12px 2px 0;color:#92400e;font-weight:600">Receiver</td>` +
      `<td style="color:#92400e">${escapeHtml(toList.join(', ') || '—')}</td></tr>`,
    ccList.length
      ? `<tr><td style="padding:2px 12px 2px 0;color:#92400e;font-weight:600">CC</td>` +
        `<td style="color:#92400e">${escapeHtml(ccList.join(', '))}</td></tr>`
      : '',
  ].join('');

  return `
    <div style="border:1px solid #f59e0b;background:#fffbeb;border-radius:8px;padding:12px 16px;margin:0 0 16px;font-size:13px">
      <div style="font-weight:700;color:#b45309;margin-bottom:6px">⚠️ DEV MODE — อีเมลนี้ถูกส่งหาคุณแทนผู้รับจริง</div>
      <table style="border-collapse:collapse;font-size:13px">${rows}</table>
    </div>
  `.trim();
}
