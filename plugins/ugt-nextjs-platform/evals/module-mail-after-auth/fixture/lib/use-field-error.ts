'use client';
// kit: ugt-nextjs-platform 4.46.1 · ugt-nextjs-auth-setup/lib/use-field-error.ts
// kit-hash: 88cc48e308ba

// Every zod schema in this skill that validates user input uses a CODE
// (e.g. 'EMAIL_REQUIRED') as its message, not prose — see auth.errors in
// messages/auth.th.ts. react-hook-form puts that code straight into
// `formState.errors.<field>.message`. This hook translates it at render
// time, right before it reaches <FieldError>, so the schema itself never
// needs access to `useTranslations` (module-scope schemas can't call hooks).
import { useTranslations } from 'next-intl';
import type { FieldError } from 'react-hook-form';

export function useFieldErrorText() {
  const t = useTranslations('auth.errors');
  return (error: FieldError | undefined, vars?: Record<string, string | number>) =>
    error ? [{ ...error, message: t(error.message as Parameters<typeof t>[0], vars) }] : undefined;
}
