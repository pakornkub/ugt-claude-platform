import type { appTh } from './app.th';

// Named alias so check-i18n.mjs's parity check lands on the value, not the type
// (same shape as messages/auth.en.ts).
type AppCatalog = { [K in keyof typeof appTh]: Record<keyof (typeof appTh)[K], string> };

export const appEn: AppCatalog = {
  loginHero: {
    title: 'Leave Requests',
    description: 'Submit leave requests and track their status in one place — no paper forms.',
    f1Title: 'Request leave online',
    f1Text: 'Enter your dates and reason from anywhere',
    f2Title: 'Track status',
    f2Text: 'See right away whether a request is pending, approved or rejected',
    f3Title: 'Every request in one table',
    f3Text: 'Search and filter past leave requests',
    footer: '© {year} UBE',
  },
  profile: {
    empCode: 'Employee code',
    position: 'Position',
    department: 'Department',
  },
};
