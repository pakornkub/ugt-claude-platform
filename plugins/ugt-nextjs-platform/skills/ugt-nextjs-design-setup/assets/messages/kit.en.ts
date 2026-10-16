// kit: ugt-nextjs-platform 4.82.0 · ugt-nextjs-design-setup/messages/kit.en.ts
// kit-hash: f1c4002c76e0
// English catalog for the org UI kit. Keys must match kit.th.ts exactly.
export const kitEn = {
  dataTable: {
    emptyTitleSearchable: 'No results',
    emptyTitle: 'Nothing here yet',
    emptyBodySearchable: 'Try adjusting the filters or searching for something else',
    emptyBody: 'Records will appear here once there are any',
    selectAllFiltered: 'Select every filtered row',
    filterAria: 'Filter {label}',
    filterValuePlaceholder: 'Value to filter by...',
    columnSettings: 'Column settings',
    columns: 'Columns',
    reorderAria: 'Position of {label} — drag to reorder, or use the up and down arrows',
    filterPlaceholder: 'Type to filter...',
    clearFilterAria: 'Clear filter {label}',
    rangeSummary: '{start}–{end} of {total}',
    rangeEmpty: 'No records',
    pageSummary: 'Page {page} of {pages}',
    firstPage: 'Go to first page',
    prevPage: 'Go to previous page',
    nextPage: 'Go to next page',
    lastPage: 'Go to last page',
    clear: 'Clear',
    apply: 'Filter',
    resetColumns: 'Reset to defaults',
    clearAllFilters: 'Clear all filters',
    rowsPerPage: 'Rows per page',
  },
  confirmDialog: {
    cancel: 'Cancel',
    genericError: 'Something went wrong',
  },
  exportMenu: {
    trigger: 'Download',
    success: 'Downloaded',
    failed: 'Download failed',
  },
  datePicker: {
    placeholder: 'Pick a date',
    holidayLegend: 'Public holiday',
  },
  tiptap: {
    removeLink: 'Remove link',
    save: 'Save',
  },
  // Series labels for ui/chart-example.tsx (a copy-and-edit example file) —
  // a project that copies it into a real chart moves the keys into its own
  // feature catalog and may delete this namespace.
  chartExample: {
    succeeded: 'Succeeded',
    skipped: 'Skipped',
    failed: 'Failed',
  },
  // Deliberately identical to kit.th.ts — each language is named in its own
  // script so a reader finds their language whichever locale is active.
  languageSwitcher: {
    english: 'English',
    thai: 'ไทย',
  },
  // Banner for components/dev-environment-bar.tsx (dev deployment only). Neutral on
  // purpose: a project with ugt-nextjs-mail-setup dev mode adds the mail clause
  // itself through the bar's `note` prop, from its own messages/app.*.ts.
  devEnvironment: {
    label: 'DEV environment',
    message: 'test data only',
  },
  // ── shell (components/app-sidebar.tsx + site-header.tsx — D7) ──
  // Menu labels and group headings are not here — they belong to the
  // project's nav config (lib/nav.ts).
  appSidebar: {
    searchPlaceholder: 'Search menu',
    noMatch: 'No menu matches',
  },
  siteHeader: {
    home: 'Home',
  },
  // ── ui/reason-dialog.tsx (2026-10-16 B5) — the shared reason prompt's own label/buttons;
  // title/description/confirm label belong to the caller
  reasonDialog: {
    reasonLabel: 'Reason',
    reasonRequired: 'Please enter a reason',
    cancel: 'Cancel',
    genericError: 'Something went wrong',
  },
  // ── period picker (ui/period-navigator · month-select — A6) ──
  period: {
    select: 'Select period',
    prev: 'Previous period',
    next: 'Next period',
    today: 'Today',
    thisYear: 'This year',
    year: 'Year',
    month: 'Month',
    allMonths: 'All months',
  },
  // ── filters button (ui/filter-popover — B4) ──
  filterPopover: {
    trigger: 'Filters',
    clear: 'Clear filters',
    activeCount: '{count} active',
  },
} as const;
