// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-mail-setup/lib/email.ts
// kit-hash: 08631b5c8986
// source: ugt-hrms lib/email.ts — installed by ugt-nextjs-mail-setup
import nodemailer from 'nodemailer';
import { env } from '@/lib/env';
import {
  buildDevBanner,
  getMailTemplate,
  renderComposedMail,
  type MailTemplateVars,
} from '@/lib/mail-templates';
import type { MailTemplateKey } from '@/lib/types/mail-templates';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE === 'true',
  // Corporate relays usually accept unauthenticated mail from inside the
  // network — only attach auth when a user is actually configured.
  ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
});

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: nodemailer.SendMailOptions['attachments'];
}

/**
 * Low-level send. Prefer `sendTemplatedMail` — it is the one that honours the
 * admin-editable template and dev mode.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  // Fail fast rather than let nodemailer default to localhost:25, where mail
  // silently vanishes (or, worse, relays) with no error anyone would notice.
  if (!env.SMTP_HOST) {
    throw new Error('SMTP_HOST environment variable is required');
  }
  await transporter.sendMail({
    from: `"${env.NEXT_PUBLIC_APP_NAME}" <${env.SMTP_FROM}>`,
    ...options,
  });
}

/** The user whose action triggered the email. */
export interface MailActor {
  /** Acting user's email — required to redirect in dev mode. */
  email: string | null | undefined;
  /** True when that user holds the `dev-mode:enable` permission. */
  hasDevMode: boolean;
}

export interface SendTemplatedMailOptions {
  templateKey: MailTemplateKey;
  /** Values substituted into the template's `{{token}}`s. */
  vars: MailTemplateVars;
  /** Real recipient(s) — used when NOT in dev mode. */
  to: string | string[];
  cc?: string | string[];
  actor: MailActor;
}

/**
 * The single entry point for workflow email.
 *
 * - Loads the active template (admin override, else the in-code default) and
 *   renders it with `vars`.
 * - **Dev mode** — when the acting user holds `dev-mode:enable` and has a known
 *   email, the message goes ONLY to that user: CC is dropped, `[DEV] ` is
 *   prefixed to the subject, and a banner lists the intended recipients. This
 *   lets a tester exercise a real approval flow end to end without notifying
 *   anyone else, which is why it is mandatory rather than optional.
 *
 * Callers must not let a mail failure roll back their work — see the rule in
 * `.claude/rules/ugt-nextjs-mail.md`.
 */
export async function sendTemplatedMail(opts: SendTemplatedMailOptions): Promise<void> {
  const template = await getMailTemplate(opts.templateKey);
  const { subject, html } = renderComposedMail(opts.templateKey, template, opts.vars);

  const devMode = opts.actor.hasDevMode && !!opts.actor.email;
  if (devMode) {
    await sendMail({
      to: opts.actor.email as string,
      subject: `[DEV] ${subject}`,
      html: buildDevBanner({ to: opts.to, cc: opts.cc }) + html,
    });
    return;
  }

  await sendMail({ to: opts.to, cc: opts.cc, subject, html });
}
