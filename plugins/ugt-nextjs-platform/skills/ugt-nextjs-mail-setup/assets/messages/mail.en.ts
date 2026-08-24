// kit: ugt-nextjs-platform 4.48.0 · ugt-nextjs-mail-setup/messages/mail.en.ts
// kit-hash: 59100785843f
// English catalog for ugt-nextjs-mail-setup's admin UI. Keys must match
// mail.th.ts exactly — scripts/check-i18n.mjs fails the build when they drift.
export const mailEn = {
  errors: {
    UNAUTHORIZED: 'Please sign in to continue.',
    FORBIDDEN: "You don't have permission for this action.",
    UNKNOWN_TEMPLATE: 'Unknown template.',
    VALIDATION_FAILED: 'Please check the information you entered.',
    SUBJECT_REQUIRED: 'Please enter an email subject.',
    SUBJECT_TOO_LONG: 'Subject must be at most 300 characters.',
    BODY_REQUIRED: 'Please enter the email body.',
    BODY_TOO_LONG: 'Body must be at most 20,000 characters.',
  },
  templates: {
    menuRequest: 'Requests/Approvals',
    menuAccount: 'User Account',
    requestSubmittedLabel: 'Notify approver: new request',
    requestSubmittedDescription: 'Sent to the approver when a new request comes in',
    requestApprovedLabel: 'Notify requester: request approved',
    requestApprovedDescription: 'Sent back to the requester once approved',
    requestRejectedLabel: 'Notify requester: request rejected',
    requestRejectedDescription: 'Sent back to the requester once rejected',
    passwordResetLabel: 'Password reset link',
    passwordResetDescription:
      'Sent when a user clicks "Forgot password" — the link is single-use and expires per resetPasswordTokenExpiresIn in lib/auth.ts',
  },
  page: {
    title: 'Email templates',
    description:
      "Edit the system's email subject and body without a deploy — the email frame (header/button/footer) is locked; only the text is editable.",
  },
  manager: {
    navLabel: 'Template list',
    overriddenBadge: 'Edited',
    subjectLabel: 'Email subject',
    bodyLabel: 'Body (HTML)',
    variablesHint: 'Available variables (substituted at send time · values are always escaped):',
    resetButton: 'Reset to default',
    previewButton: 'Preview',
    saveButton: 'Save',
    previewLabel: 'Email preview',
    resetDialogTitle: 'Reset to default — {label}',
    resetDialogDescription:
      'Your edits will be deleted, and the next email sent will use the system default text.',
    resetDialogSuccessMessage: 'Reset to default.',
    saveFailedTitle: 'Save failed',
    saveSuccessMessage: 'Template saved — the next email sent will use this text.',
    previewFailedTitle: 'Could not generate preview',
  },
} as const;
