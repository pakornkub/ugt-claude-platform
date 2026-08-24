// kit: ugt-nextjs-platform 4.48.1 · ugt-nextjs-design-setup/messages/kit.en.ts
// kit-hash: a55694edf171
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
} as const;
