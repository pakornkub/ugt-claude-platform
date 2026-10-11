# Export (Excel/CSV) — route shape and traps for `ui/export-menu` + `lib/export.ts`

`ui/export-menu` in the table's `toolbarExtra` → POSTs to a **Route Handler**
(never a Server Action — 1 MB body cap) → `lib/export.ts` turns rows into the
file. One `ExportColumn[]` spec feeds both formats, so CSV and Excel can never
drift apart.

```ts
const COLUMNS: ExportColumn<LeaveRow>[] = [
  { header: 'รหัสพนักงาน', width: 12, value: (r) => r.empCode },
  { header: 'วันที่',      width: 14, value: (r) => formatExportDate(r.date) },
  { header: 'จำนวนวัน',    width: 10, value: (r) => r.days },        // number → Excel คำนวณต่อได้
];
return toExportResponse(format, COLUMNS, rows, {
  filename: `leave-requests-${bangkokToday(new Date())}`,
  sheetName: 'Leave Requests',
});
```

Route order, every time: **session → permission → scope → validate body (zod)
→ query capped at `EXPORT_MAX_ROWS` → audit row → build**. The export bypasses
the table's pagination, so the scope check is the only thing standing between a
user and every row in the table — it is not optional, and it must re-derive
scope server-side rather than trust anything in the body.

| DO ✅ | DON'T ❌ |
| --- | --- |
| One `ExportColumn[]` for both formats | Separate header string + row array (HRMS shipped a 15-vs-13 mismatch this way) |
| `formatExportDate` → ISO `yyyy-MM-dd` | `DD/MM/YYYY` in a file — Excel re-reads it by locale and silently swaps day/month |
| Numbers stay numbers | `String(n)` — the column becomes text and SUM stops working |
| `take: EXPORT_MAX_ROWS` in the query | Fetch everything and cap afterwards |
| Audit row before the file is built | Export with no trace of who took what |
| Send the table's current filters in `buildBody` | Export the unfiltered set from a filtered screen |
| Filename from `Content-Disposition` | A second filename guessed on the client |

`lib/export.ts` handles the three things everyone forgets: a UTF-8 **BOM** (no
BOM = Thai is garbage in Excel on Windows), a `'` in front of `= + - @` (a cell
starting with `=` is a **formula**, and that is remote code in a spreadsheet),
and CRLF per RFC 4180.
