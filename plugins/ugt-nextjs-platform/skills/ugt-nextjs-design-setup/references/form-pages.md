# Form pages — which container, and the full-page form pattern

Decided 2026-10-16 (maintainer, backlog §14 A11 + D4 — from ugt-hrms DESIGN.md §10
2026-09-29/30). Contract: `ugt-core/contracts/design.md` §Layout (form page · form
container ladder). DESIGN.md §4 carries the agreement; this file carries the how.

## The ladder — chosen by the job, not by field count alone

Walk it top to bottom; the first row that fits wins.

| Job | Container | Kit pieces |
| --- | --- | --- |
| Core work with several steps, or anything that needs a calendar to pick dates | **Full page** (pattern below) | `PageShell` · `PageBackLink` · `Card` + `CardHeading` per section · `PageFormActions` |
| Editing **one** master/settings record with ≥ 4 fields | **Sheet**, right side, **two widths only** | `SettingsSheetContent size="xl"` (576px, plain form) · `size="5xl"` (1024px, holds a sub-table) · `SettingsSheetBody` · `SettingsSection` · `SettingsNumberField` / `SettingsSwitchField` · `SettingsRuleSummary` (`ui/settings-sheet`) |
| ≤ 3 fields finished in one go | **Dialog** | a reason prompt (reject/cancel) = `ReasonDialog` (`ui/reason-dialog`) · anything else = `FormDialog` (never a raw `Dialog` as a form) |
| Confirm only, no fields | **AlertDialog** | `ConfirmActionDialog` — button carries text, not an icon |

Edge rows (same ladder, `conventions.md` §Dialog ladder):

- **A list or checklist that grows with data counts as long, always** — even if
  it is short today. A dialog has a fixed height; data does not. → Sheet (its body
  scrolls) or a full page. Lesson of 4.25.0: a "3-field" role form plus a
  permission checklist was put in a Dialog and overflowed the screen.
- A panel kept open beside the content (big filter set, preview) → Sheet.
- Read-only detail → `detail-dialog-shell` (no footer).
- Never a dialog over a dialog — the one exception is a single AlertDialog
  confirm on top of a form (e.g. "discard changes?").

Why by job: field count alone sent multi-step requests into dialogs (no room for
a calendar, lost on a misclick outside) and simple master edits onto full pages
(navigate away from the list for four fields).

## Full-page form (D4)

Replaces the old "centred `max-w-3xl` container, no wrapping card": with white
cards on a gray page (DESIGN.md §1 Elevation) an uncarded form floats on the
background and matches no other page.

- **One column**, as wide as the page cap (`PageShell` = 96rem) — no centred
  narrow container, no side rail.
- **One `Card` per section**, each opened by `CardHeading` (primary icon + section
  name; `badge`/`action` slots for a running total or a toggle). Cards stack with
  `gap-4`.
- **Fields flow side by side when wide** — a grid *inside* the card
  (`grid grid-cols-1 gap-4 sm:grid-cols-2`, a long field takes `sm:col-span-2`);
  every control is `w-full` of its grid cell (DESIGN.md §4 — width differences are
  `col-span`, never `w-*` per field).
- **Back-link above the title**: `PageBackLink href="/parent"` — the parent page's
  name, fixed route (never `history.back()`), then `PageTitle` + `PageDescription`.
  Submit/cancel live in the bar at the end, never in `PageActions` at the top.
- **Action bar at the end**: `PageFormActions` — secondary (`outline`, back/cancel)
  first, then the primary submit (`default`), both `size="cta"`. ≥ sm: a plain
  right-aligned row. Phones: pinned to the bottom edge, full width, grid
  `[1fr_2fr]` (secondary │ primary) so submit never scrolls out of reach. Buttons
  only — no summary text in the bar.
- **Errors**: field errors under the field (`ui/field` + zod + react-hook-form);
  a server rejection is a `Callout tone="danger"` at the top of the form that
  stays in the form — never only a toast (it disappears before it is read).

```tsx
// app/(app)/requests/new/page.tsx renders <NewRequestForm /> — a Client Component
export function NewRequestForm() {
  const t = useTranslations('requests.new');
  const form = useForm<RequestInput>({ resolver: zodResolver(requestSchema) });

  return (
    <PageShell>
      <PageHeader>
        <PageHeaderText>
          <PageBackLink href="/requests">{t('parentTitle')}</PageBackLink>
          <PageTitle>{t('title')}</PageTitle>
          <PageDescription>{t('description')}</PageDescription>
        </PageHeaderText>
      </PageHeader>

      <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        {serverError && <Callout tone="danger">{serverError}</Callout>}

        <Card>
          <CardHeading icon={ClipboardList} title={t('sectionType')} />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>{/* type Select */}</Field>
            <Field>{/* approver Combobox */}</Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeading icon={CalendarDays} title={t('sectionPeriod')} />
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>{/* DatePicker from */}</Field>
            <Field>{/* DatePicker to */}</Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeading icon={FileText} title={t('sectionDetails')} />
          <CardContent>
            <Field>{/* Textarea reason — full width */}</Field>
          </CardContent>
        </Card>

        <PageFormActions>
          <Button variant="outline" size="cta" nativeButton={false} render={<Link href="/requests" />}>
            {t('back')}
          </Button>
          <Button type="submit" size="cta" disabled={form.formState.isSubmitting}>
            {t('submit')}
          </Button>
        </PageFormActions>
      </form>
    </PageShell>
  );
}
```

Notes on the example:

- `PageFormActions` sits **inside** the `<form>` so the submit button needs no
  `form=` attribute; it is the form's last child, after the last card.
- The back button is a link (`nativeButton={false} render={<Link />}` — Base UI, never `asChild`; without
  `nativeButton={false}` Base UI logs a dev error for a non-`<button>` render).
- A section whose content is a table (line items) keeps the `Card` +
  `CardHeading` and puts the table inside `CardContent` with `card={false}` on
  `DataTable` — never a shadowed card inside a shadowed card.

## Do / don't

| Do | Don't |
| --- | --- |
| One card per section, `CardHeading` on each | One big card for the whole form · uncarded fields on the gray page |
| Grid inside the card for side-by-side fields | Two page-level columns (form left, summary right) |
| `PageBackLink` to the fixed parent route | A "ย้อนกลับ" link that calls `history.back()` |
| `PageFormActions` at the end, `cta` size | Submit in `PageActions` at the top · a floating save button |
| Sheet via `SettingsSheetContent` (`xl`/`5xl`) | `SheetContent className="sm:max-w-md"` — any other width, and a bare `sm:max-w-*` loses to the primitive's `data-[side=right]:sm:max-w-sm` anyway |
