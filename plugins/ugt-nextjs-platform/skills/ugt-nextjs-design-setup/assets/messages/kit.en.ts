// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/messages/kit.en.ts
// kit-hash: PENDING
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
} as const;
