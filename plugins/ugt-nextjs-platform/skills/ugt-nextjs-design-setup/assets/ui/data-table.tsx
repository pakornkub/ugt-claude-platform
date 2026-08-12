// kit: ugt-nextjs-platform 4.14.0 · ugt-nextjs-design-setup/ui/data-table.tsx
// kit-hash: 5bbf4107cc5f
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit, full option set)
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  type Row,
  type RowData,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  GripVertical,
  Inbox,
  RotateCcw,
  Search,
  Settings2,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { ROWS_PER_PAGE_OPTIONS } from '@/lib/pagination';
import { withTableQuery, type TableFields, type TableQuery } from '@/lib/table-query';
import { moveKey, normalizeOrder, useTablePrefs } from '@/lib/table-prefs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Per-column layout hints. Set `width` (e.g. `'18%'` or `120`) together with the
 * `fixedLayout` prop to give a table stable, content-fit columns that don't
 * reflow as data changes. `headerClassName` / `cellClassName` style the th / td.
 */
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    width?: string | number;
    headerClassName?: string;
    cellClassName?: string;
    /** Label for the auto mobile card row (needed when `header` is not a string). */
    mobileLabel?: string;
    /**
     * กรองรายคอลัมน์: default = คอลัมน์มี `accessorKey` + header เป็น string +
     * ไม่ได้ระบุ `numeric` · ตั้ง `false` เพื่อปิดรายคอลัมน์ / `true` เพื่อเปิด
     * ทั้งที่ header ไม่ใช่ string (ใช้ `mobileLabel` เป็นป้าย)
     */
    filterable?: boolean;
    /** คอลัมน์ตัวเลข — ไม่เข้าเกณฑ์กรองรายคอลัมน์ (ช่อง contains ใช้กับตัวเลขไม่ได้) */
    numeric?: boolean;
  }
}

function mobileLabel<TData>(column: Column<TData, unknown>): string {
  const { header, meta } = column.columnDef;
  if (meta?.mobileLabel) return meta.mobileLabel;
  if (typeof header === 'string') return header;
  return column.id;
}

/** คีย์คอลัมน์แบบเดียวกับที่ TanStack สร้าง id อัตโนมัติ (accessorKey แทนจุดด้วย _) */
function columnKeyOf<TData>(def: ColumnDef<TData>): string {
  if (def.id) return def.id;
  const accessorKey =
    'accessorKey' in def && typeof def.accessorKey === 'string' ? def.accessorKey : undefined;
  if (accessorKey) return accessorKey.replaceAll('.', '_');
  return typeof def.header === 'string' ? def.header : '';
}

/** ป้ายคอลัมน์สำหรับ chip/เมนูคอลัมน์/aria — header string ก่อน แล้วค่อย mobileLabel */
function columnLabelOf<TData>(def: ColumnDef<TData>): string {
  if (typeof def.header === 'string') return def.header;
  if (def.meta?.mobileLabel) return def.meta.mobileLabel;
  return columnKeyOf(def);
}

/** คอลัมน์ select/actions อยู่หัว-ท้ายเสมอ: ลากไม่ได้ ซ่อนไม่ได้ กรองไม่ได้ */
function isPinnedKey(key: string): boolean {
  return key === 'select' || key === 'actions';
}

/** เกณฑ์ default ของกรองรายคอลัมน์ — override ได้ด้วย `meta.filterable` */
function isFilterableColumn<TData>(def: ColumnDef<TData>): boolean {
  const meta = def.meta;
  if (meta?.filterable !== undefined) return meta.filterable;
  return 'accessorKey' in def && typeof def.header === 'string' && !meta?.numeric;
}

/** จัดแนวเนื้อหา header ใน flex wrapper ให้ตามแนวข้อความเดิมของ `headerClassName` */
function headerJustify(headerClassName?: string): string | undefined {
  if (!headerClassName) return undefined;
  if (headerClassName.includes('text-right')) return 'justify-end';
  if (headerClassName.includes('text-center')) return 'justify-center';
  return undefined;
}

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

function SortIndicator({ sorted }: Readonly<{ sorted: false | 'asc' | 'desc' }>) {
  if (sorted === 'asc') return <ArrowUp className="size-3" strokeWidth={2} aria-hidden />;
  if (sorted === 'desc') return <ArrowDown className="size-3" strokeWidth={2} aria-hidden />;
  return <ArrowUpDown className="size-3 opacity-40" strokeWidth={2} aria-hidden />;
}

/**
 * `searchable` = ตารางนี้มีช่องค้นหาให้ปรับจริงไหม — ถ้าไม่มี (เช่นรายการผลลัพธ์
 * ใน dialog) ห้ามบอกให้ผู้ใช้ "ลองปรับ filter" เพราะไม่มีอะไรให้ปรับ และตารางว่าง
 * ในกรณีนั้นมักแปลว่า "ไม่มีรายการ" ซึ่งบางทีเป็นข่าวดี ไม่ใช่ "หาไม่เจอ".
 */
interface EmptyStateProps {
  searchable: boolean;
  /** Contextual override — use when "ยังไม่มีรายการ" would drop actionable guidance. */
  title?: string;
  description?: string;
}

function DataTableEmpty({ searchable, title, description }: Readonly<EmptyStateProps>) {
  return (
    <Empty className="border-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title ?? (searchable ? 'ไม่พบข้อมูล' : 'ยังไม่มีรายการ')}</EmptyTitle>
        {/* `description=""` = ตั้งใจไม่มีคำอธิบาย (หัวข้อบอกครบแล้ว) */}
        {description !== '' && (
          <EmptyDescription>
            {description ??
              (searchable ? 'ลองปรับ filter หรือค้นหาด้วยคำอื่น' : 'เมื่อมีข้อมูลจะแสดงที่นี่')}
          </EmptyDescription>
        )}
      </EmptyHeader>
    </Empty>
  );
}

/** Ignore clicks that land on an interactive control so nested buttons/links win. */
function isInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('button, a, input, select, textarea, [role="checkbox"], [role="button"]') !==
      null
  );
}

/** true ถ้า query (case-insensitive) อยู่ใน string value ของ field ใด ๆ ของ row.original */
export function rowIncludesQuery(original: unknown, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return Object.values(original as Record<string, unknown>).some(
    (v) => v != null && String(v).toLowerCase().includes(q)
  );
}

function DataTableMobileCards<TData>({
  table,
  rowClassName,
  onRowClick,
  ...empty
}: Readonly<
  EmptyStateProps & {
    table: TanstackTable<TData>;
    rowClassName?: (row: TData) => string | undefined;
    onRowClick?: (row: TData) => void;
  }
>) {
  'use no memo';
  const rows = table.getRowModel().rows;
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border">
        <DataTableEmpty {...empty} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const cells = row.getVisibleCells();
        const selectCell = cells.find((c) => c.column.id === 'select');
        const actionsCell = cells.find((c) => c.column.id === 'actions');
        const [headCell, ...restCells] = cells.filter(
          (c) => c.column.id !== 'select' && c.column.id !== 'actions'
        );
        return (
          <div
            key={row.id}
            data-slot="data-table-mobile-card"
            data-state={row.getIsSelected() && 'selected'}
            onClick={
              onRowClick
                ? (e) => {
                    if (!isInteractiveTarget(e.target)) onRowClick(row.original);
                  }
                : undefined
            }
            className={cn(
              'rounded-lg border bg-card p-3 text-xs/relaxed data-[state=selected]:border-ring',
              onRowClick && 'cursor-pointer',
              rowClassName?.(row.original)
            )}
          >
            <div className="flex items-start gap-2">
              {selectCell && flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
              <div className="min-w-0 flex-1 font-medium">
                {headCell && flexRender(headCell.column.columnDef.cell, headCell.getContext())}
              </div>
            </div>
            {restCells.length > 0 && (
              <dl className="mt-2 flex flex-col gap-1.5">
                {restCells.map((cell) => (
                  <div key={cell.id} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">{mobileLabel(cell.column)}</dt>
                    <dd className="min-w-0 text-right">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {/* `empty:hidden` — a permission-gated actions cell renders `null`, and the
                cell object still exists, so without it the card grows a stray divider. */}
            {actionsCell && (
              <div className="mt-2 flex justify-end border-t pt-2 empty:hidden">
                {flexRender(actionsCell.column.columnDef.cell, actionsCell.getContext())}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** ปุ่มกรวยกรองท้ายหัวคอลัมน์ → popover ช่องกรอก (Enter = กรอง · มีปุ่มล้าง) */
function DataTableFilterPopover({
  label,
  value,
  onApply,
}: Readonly<{ label: string; value: string; onApply: (value: string) => void }>) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const active = value !== '';
  const apply = (next: string) => {
    onApply(next);
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value); // เปิดใหม่ = เริ่มจากค่าที่กรองอยู่จริง ไม่ใช่ draft ค้าง
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={`กรอง ${label}`}
            className={cn(
              'shrink-0 rounded-sm p-0.5 opacity-50 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50',
              active && 'text-primary opacity-100'
            )}
          />
        }
      >
        <Filter className="size-3" strokeWidth={2} aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-56 flex-col gap-2 p-3">
        <Input
          value={draft}
          placeholder="ค่าที่ต้องการกรอง..."
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') apply(draft);
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setDraft('');
              apply('');
            }}
          >
            ล้าง
          </Button>
          <Button className="flex-1" onClick={() => apply(draft)}>
            กรอง
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ColumnSettingsEntry {
  key: string;
  label: string;
  visible: boolean;
}

/** เมนู Settings2: ติ๊กซ่อน/แสดง + ลาก (หรือลูกศรขึ้น/ลง) จัดลำดับ + คืนค่าเริ่มต้น */
function DataTableColumnSettings({
  entries,
  onToggle,
  onMove,
  onReset,
}: Readonly<{
  entries: ColumnSettingsEntry[];
  onToggle: (key: string) => void;
  onMove: (from: string, to: string) => void;
  onReset: () => void;
}>) {
  const idBase = React.useId();
  // แยกสถานะลากของเมนูคอลัมน์ออกจากหัวตาราง ไม่งั้นลากในเมนูแล้วหัวตารางกะพริบตาม
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="icon" aria-label="ตั้งค่าคอลัมน์" />}>
        <Settings2 strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-60 flex-col gap-1 p-2">
        <p className="px-1 py-0.5 text-xs font-medium text-muted-foreground">คอลัมน์</p>
        {entries.map((entry, i) => (
          <div
            key={entry.key}
            draggable
            onDragStart={() => setDragKey(entry.key)}
            onDragOver={(e) => {
              if (!dragKey || dragKey === entry.key) return;
              e.preventDefault();
              setOverKey(entry.key);
            }}
            onDrop={() => {
              if (dragKey) onMove(dragKey, entry.key);
              setDragKey(null);
              setOverKey(null);
            }}
            onDragEnd={() => {
              setDragKey(null);
              setOverKey(null);
            }}
            className={cn(
              'flex items-center gap-2 rounded-md px-1 py-0.5',
              dragKey === entry.key && 'opacity-40',
              overKey === entry.key && 'bg-accent'
            )}
          >
            {/* จับลากได้ และโฟกัสแล้วกดลูกศรขึ้น/ลงก็สลับได้ — การลากอย่างเดียว
                ใช้กับคีย์บอร์ดและ screen reader ไม่ได้ */}
            <button
              type="button"
              aria-label={`ลำดับของ ${entry.label} — ลากเพื่อสลับ หรือกดลูกศรขึ้น/ลง`}
              className="cursor-grab rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' && i > 0) {
                  e.preventDefault();
                  onMove(entry.key, entries[i - 1].key);
                }
                if (e.key === 'ArrowDown' && i < entries.length - 1) {
                  e.preventDefault();
                  onMove(entry.key, entries[i + 1].key);
                }
              }}
            >
              <GripVertical className="size-3.5" aria-hidden />
            </button>
            <Checkbox
              id={`${idBase}-${entry.key}`}
              checked={entry.visible}
              onCheckedChange={() => onToggle(entry.key)}
            />
            <Label htmlFor={`${idBase}-${entry.key}`} className="flex-1 text-xs font-normal">
              {entry.label}
            </Label>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="mt-1 justify-start gap-2" onClick={onReset}>
          <RotateCcw strokeWidth={2} />
          คืนค่าเริ่มต้น
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** หัวคอลัมน์หนึ่งช่อง: grip ลากจัดลำดับ + (server) ปุ่ม sort + ปุ่มกรองรายคอลัมน์ */
function DataTableHeaderCell<TData>({
  header,
  draggable,
  filterable,
  serverSortable,
  filterLabel,
  filterValue,
  dragKey,
  overKey,
  onDragKey,
  onOverKey,
  onMove,
  onApplyFilter,
}: Readonly<{
  header: Header<TData, unknown>;
  draggable: boolean;
  filterable: boolean;
  serverSortable: boolean;
  filterLabel: string;
  filterValue: string;
  dragKey: string | null;
  overKey: string | null;
  onDragKey: (key: string | null) => void;
  onOverKey: (key: string | null) => void;
  onMove: (from: string, to: string) => void;
  onApplyFilter: (value: string) => void;
}>) {
  'use no memo';
  const key = header.column.id;
  const meta = header.column.columnDef.meta;
  const sorted = header.column.getIsSorted();
  const content = header.isPlaceholder
    ? null
    : flexRender(header.column.columnDef.header, header.getContext());
  const plain = !draggable && !filterable && !serverSortable;
  return (
    <TableHead
      colSpan={header.colSpan}
      aria-sort={sorted ? ARIA_SORT[sorted] : undefined}
      draggable={draggable}
      onDragStart={draggable ? () => onDragKey(key) : undefined}
      onDragOver={(e) => {
        if (!dragKey || !draggable || dragKey === key) return;
        e.preventDefault();
        onOverKey(key);
      }}
      onDrop={() => {
        if (dragKey && draggable) onMove(dragKey, key);
        onDragKey(null);
        onOverKey(null);
      }}
      onDragEnd={() => {
        onDragKey(null);
        onOverKey(null);
      }}
      className={cn(
        meta?.headerClassName,
        dragKey === key && 'opacity-40',
        overKey === key && 'ring-2 ring-primary ring-inset'
      )}
      style={meta?.width ? { width: meta.width } : undefined}
    >
      {plain ? (
        content
      ) : (
        <div className={cn('flex items-center gap-1', headerJustify(meta?.headerClassName))}>
          {draggable && (
            <GripVertical className="size-3 shrink-0 cursor-grab opacity-40" aria-hidden />
          )}
          {serverSortable ? (
            <button
              type="button"
              className="flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              onClick={header.column.getToggleSortingHandler()}
            >
              {content}
              <SortIndicator sorted={sorted} />
            </button>
          ) : (
            content
          )}
          {filterable && (
            <DataTableFilterPopover
              label={filterLabel}
              value={filterValue}
              onApply={onApplyFilter}
            />
          )}
        </div>
      )}
    </TableHead>
  );
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  /**
   * เก็บลำดับคอลัมน์ + คอลัมน์ที่ซ่อนของผู้ใช้ลง localStorage (`table-prefs:<id>`
   * ผ่าน `lib/table-prefs.ts`) — ไม่ส่ง = ยังจัดลำดับ/ซ่อนได้ แต่ไม่จำข้ามการเปิดหน้า
   */
  id?: string;
  /** Use a fixed table layout so column `meta.width` values are honored and
   * widths stay stable regardless of cell content. */
  fixedLayout?: boolean;
  filterColumn?: string;
  filterPlaceholder?: string;
  /** ค้นทุกคอลัมน์ (global filter) แทน filterColumn เดี่ยว — ใช้ช่องค้นหาเดียวกัน */
  globalSearch?: boolean;
  initialColumnVisibility?: VisibilityState;
  /** Called with the current selected row originals whenever selection changes */
  onSelectionChange?: (selectedRows: TData[]) => void;
  /** Increment/change this value to clear the row selection */
  resetSelectionKey?: number | string;
  /** Stable row identity for selection. Without it TanStack keys selection by
   * row INDEX, so when `data` is swapped (e.g. react-query keepPreviousData
   * month switch) a checked index silently re-maps to a different row. */
  getRowId?: (row: TData) => string;
  /** Control which rows are selectable; defaults to true (all rows selectable) */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  /** Show every row on one page and hide the pagination footer. */
  disablePagination?: boolean;
  /**
   * แถวต่อหน้าเริ่มต้น — default 10 (ตาราง config/CRUD) · ส่ง 20 สำหรับตาราง
   * เฝ้าดู/ตรวจสอบที่ผู้ใช้กวาดตาหาความผิดปกติ ตามมติที่กำกับไว้ที่
   * `ROWS_PER_PAGE_OPTIONS` · ค่าที่ส่งต้องอยู่ในชุดนั้น ไม่งั้น Select จะว่าง
   */
  pageSize?: number;
  /**
   * Server-paginated mode: `data` is already the current page, so the table
   * stops slicing and reports page/size changes instead. `totalItems` drives
   * the range line and the page count. Mutually exclusive with
   * `disablePagination`; search must be server-side too (use `toolbarExtra`,
   * not `filterColumn`) or it would filter one page only.
   */
  serverPagination?: {
    /** 0-based, like TanStack's own `pageIndex`. */
    pageIndex: number;
    /** Authoritative page size in server mode — the `pageSize` prop is ignored. */
    pageSize: number;
    totalItems: number;
    /** ไม่ส่ง (และมี `serverQuery`) = DataTable push `page`/`pageSize` ลง URL ให้เอง */
    onChange?: (next: { pageIndex: number; pageSize: number }) => void;
  };
  /**
   * โหมด server เต็มรูป (ใช้คู่กับ `serverPagination`): sort + กรองรายคอลัมน์
   * กลายเป็น manual และอยู่ใน URL — DataTable push การเปลี่ยนแปลงเองผ่าน
   * `router.replace` ตามแบบ allowlist ของ `lib/table-query.ts` · หน้าแม่ parse
   * searchParams ด้วย `parseTableQuery` / `parsePageParams` แล้วส่ง query +
   * baseParams ลงมา · คีย์คอลัมน์ = `accessorKey` (ต้องตรงชื่อฟิลด์ Prisma)
   *
   * ถ้ามี `serverPagination` แต่ไม่มี prop นี้ (call site เดิม) จะไม่โชว์ปุ่ม
   * กรอง/sort รายคอลัมน์ — กรองฝั่ง client บนข้อมูลหน้าเดียวให้ผลลัพธ์ลวง
   */
  serverQuery?: {
    query: TableQuery;
    baseParams: string;
    /** allowlist เดียวกับที่ส่งให้ `parseTableQuery` — ถ้าส่งมา ปุ่ม sort/กรอง
     * จะโชว์เฉพาะคอลัมน์ในรายการ (กัน UI ชวนกดคอลัมน์ที่ server ไม่รับ) */
    fields?: TableFields;
  };
  /**
   * Does this table have a search/filter the user can actually adjust? Drives the
   * empty-state wording ("no match, try adjusting" vs "nothing here yet").
   * Defaults to `!!filterColumn` — set it explicitly when the search lives in
   * `toolbarExtra` because filtering happens server-side.
   */
  searchable?: boolean;
  /** Contextual empty-state copy — use when the generic "ยังไม่มีรายการ" would
   * drop actionable guidance (e.g. "add a time period on the other tab first"). */
  emptyTitle?: string;
  emptyDescription?: string;
  /**
   * Sideways scrolling. **On by default (มติ 2026-08-09)** — a table wider
   * than its container must stay reachable. Passing `false` CLIPS the overflow:
   * the columns past the edge are gone with no scrollbar and no other hint, so
   * only turn it off when the table genuinely cannot overflow, and say why in
   * a comment (`verify.mjs` requires the comment).
   */
  scrollX?: boolean;
  /** Optional per-row className, derived from the row's original data (e.g. to
   * highlight matching rows). */
  rowClassName?: (row: TData) => string | undefined;
  /**
   * Click anywhere on a row (or mobile card). Use for a whole-row affordance like
   * parking a reading-ruler highlight — NOT as the only way to reach an action
   * (keep an explicit button too, for keyboard/a11y). Clicks that originate on a
   * button/link/input/checkbox inside the row are ignored so nested controls win.
   */
  onRowClick?: (row: TData) => void;
  /** Extra controls rendered in the toolbar row, before the column toggle. */
  toolbarExtra?: React.ReactNode;
  /**
   * Page-level filters (period → org unit → status, กว้าง→แคบ) rendered in the
   * toolbar row RIGHT AFTER the search box (มติ 2026-08-11 — one toolbar row,
   * no separate filter row above; the old two-row layout left the search row
   * half empty). Filters that change which rows exist must still be part of
   * the server query — placement here is layout only.
   */
  toolbarFilters?: React.ReactNode;
}

/**
 * ตัวเลือก "แถวต่อหน้า" ชุดเดียวของทั้งแอป — นิยามจริงอยู่ `lib/pagination.ts`
 * (มติ full option set: 10/20/50) · re-export ไว้ให้ call site เดิม import จากที่นี่ได้
 *
 * **ค่าเริ่มต้น** ต่างกันตามชนิดตาราง: config/CRUD = 10 (default ของ DataTable
 * ตัวนี้) · ตารางเฝ้าดู/ตรวจสอบที่ผู้ใช้กวาดตาหาความผิดปกติ = 20 (ตั้งที่ call site).
 */
export { ROWS_PER_PAGE_OPTIONS };

export function DataTable<TData>({
  columns,
  data,
  id,
  fixedLayout = false,
  filterColumn,
  filterPlaceholder,
  globalSearch,
  initialColumnVisibility = {},
  onSelectionChange,
  resetSelectionKey,
  getRowId,
  enableRowSelection,
  disablePagination = false,
  pageSize = 10,
  serverPagination,
  serverQuery,
  searchable,
  emptyTitle,
  emptyDescription,
  scrollX = true,
  rowClassName,
  onRowClick,
  toolbarExtra,
  toolbarFilters,
}: Readonly<DataTableProps<TData>>) {
  'use no memo';
  const router = useRouter();
  const pathname = usePathname();
  const placeholder = filterPlaceholder ?? 'กรอกเพื่อกรอง...';
  const emptyProps = {
    searchable: searchable ?? (!!filterColumn || !!globalSearch),
    title: emptyTitle,
    description: emptyDescription,
  };
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize,
  });
  // สถานะลากหัวคอลัมน์ (ของตารางจริง — เมนูคอลัมน์มีสถานะของตัวเอง)
  const [dragKey, setDragKey] = React.useState<string | null>(null);
  const [overKey, setOverKey] = React.useState<string | null>(null);

  // ---- ลำดับคอลัมน์ + ซ่อน/แสดง -------------------------------------------
  const dataKeys = columns.map(columnKeyOf).filter((k) => k !== '' && !isPinnedKey(k));
  const initialHidden = Object.entries(initialColumnVisibility)
    .filter(([, visible]) => !visible)
    .map(([key]) => key);
  // hook ต้องถูกเรียกทุก render — เมื่อไม่มี `id` ใช้ state ภายในแทน และห้ามเขียน prefs
  const stored = useTablePrefs(id ?? '', dataKeys, initialHidden);
  const [localOrder, setLocalOrder] = React.useState<string[] | null>(null);
  const order = id ? stored.order : normalizeOrder(localOrder ?? dataKeys, dataKeys);

  const moveColumn = (from: string, to: string) => {
    if (id) stored.move(from, to);
    else setLocalOrder(moveKey(order, from, to));
  };
  const toggleColumn = (key: string) => {
    if (id) stored.toggle(key);
    else setColumnVisibility((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  };

  // มี id = prefs เป็นเจ้าของ visibility ของคอลัมน์ข้อมูล (seed จาก initialColumnVisibility)
  const effectiveVisibility: VisibilityState = id
    ? {
        ...columnVisibility,
        ...Object.fromEntries(dataKeys.map((k) => [k, !stored.hidden.includes(k)])),
      }
    : columnVisibility;
  const columnOrder = [
    ...(columns.some((c) => columnKeyOf(c) === 'select') ? ['select'] : []),
    ...order,
    ...(columns.some((c) => columnKeyOf(c) === 'actions') ? ['actions'] : []),
  ];

  // ---- server mode: sort + filter อยู่ใน URL --------------------------------
  const pushQuery = (next: TableQuery) => {
    if (!serverQuery) return;
    router.replace(`${pathname}?${withTableQuery(serverQuery.baseParams, next)}`, {
      scroll: false,
    });
  };
  const serverSorting: SortingState = serverQuery?.query.sort
    ? [{ id: serverQuery.query.sort, desc: serverQuery.query.dir === 'desc' }]
    : [];

  // ตารางที่ paginate ฝั่ง server แต่ยังไม่ย้าย sort/filter ลง URL (ไม่มี serverQuery)
  // ห้ามโชว์กรองรายคอลัมน์ — จะกลายเป็นกรอง client บนข้อมูลหน้าเดียว = ผลลัพธ์ลวง
  const columnFilterEnabled = !serverPagination || !!serverQuery;

  const applyColumnFilter = (key: string, raw: string) => {
    const value = raw.trim();
    if (serverQuery) {
      const filters = { ...serverQuery.query.filters };
      if (value) filters[key] = value;
      else delete filters[key];
      pushQuery({ ...serverQuery.query, filters });
      return;
    }
    table.getColumn(key)?.setFilterValue(value || undefined);
  };
  const clearAllColumnFilters = () => {
    if (serverQuery) {
      pushQuery({ ...serverQuery.query, filters: {} });
      return;
    }
    // คงตัวกรองของช่องค้นหาหลัก (filterColumn) ไว้ — ล้างเฉพาะกรองรายคอลัมน์
    setColumnFilters((prev) => prev.filter((f) => f.id === filterColumn));
  };
  const activeColumnFilters: Array<[string, string]> = serverQuery
    ? Object.entries(serverQuery.query.filters)
    : columnFilters
        .filter((f) => f.id !== filterColumn && typeof f.value === 'string' && f.value !== '')
        .map((f) => [f.id, f.value as string]);

  const labelByKey = new Map(columns.map((c) => [columnKeyOf(c), columnLabelOf(c)]));

  const resetTable = () => {
    if (id) stored.reset();
    setLocalOrder(null);
    setColumnVisibility(initialColumnVisibility);
    setSorting([]);
    setColumnFilters((prev) => prev.filter((f) => f.id === filterColumn));
    if (serverQuery) pushQuery({ sort: null, dir: 'asc', filters: {} });
  };

  // Notify parent when selection changes — also on `data` change, so after a
  // data swap the parent only keeps selections for rows still in the table.
  React.useEffect(() => {
    onSelectionChange?.(table.getSelectedRowModel().rows.map((r) => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection, data]);

  // Clear selection when resetSelectionKey changes
  React.useEffect(() => {
    if (resetSelectionKey !== undefined) setRowSelection({});
  }, [resetSelectionKey]);

  const serverPaginationState = serverPagination && {
    pageIndex: serverPagination.pageIndex,
    pageSize: serverPagination.pageSize,
  };
  const paginationState =
    serverPaginationState ??
    (disablePagination ? { pageIndex: 0, pageSize: Math.max(1, data.length) } : pagination);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: serverQuery ? serverSorting : sorting,
      columnFilters,
      globalFilter,
      columnVisibility: effectiveVisibility,
      columnOrder,
      rowSelection,
      pagination: paginationState,
    },
    enableRowSelection: enableRowSelection ?? true,
    getRowId,
    manualPagination: !!serverPagination,
    manualSorting: !!serverQuery,
    manualFiltering: !!serverQuery,
    rowCount: serverPagination?.totalItems,
    onRowSelectionChange: setRowSelection,
    onSortingChange: (updater) => {
      if (!serverQuery) {
        setSorting(updater);
        return;
      }
      const next = typeof updater === 'function' ? updater(serverSorting) : updater;
      const primary = next.at(0);
      pushQuery({
        ...serverQuery.query,
        sort: primary?.id ?? null,
        dir: primary?.desc ? 'desc' : 'asc',
      });
    },
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, value) => rowIncludesQuery(row.original, value),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (!serverPagination) {
        setPagination(updater);
        return;
      }
      const next = typeof updater === 'function' ? updater(serverPaginationState!) : updater;
      if (serverPagination.onChange) {
        serverPagination.onChange(next);
        return;
      }
      if (!serverQuery) return; // ไม่มีทั้ง onChange และ serverQuery = ไม่มีช่องทางรายงานการเปลี่ยนหน้า
      // เปลี่ยน pageSize = กลับหน้า 1 — เลขหน้าเดิมชี้ช่วงข้อมูลคนละชุดแล้ว
      const params = new URLSearchParams(serverQuery.baseParams);
      params.set(
        'page',
        String(next.pageSize === serverPagination.pageSize ? next.pageIndex + 1 : 1)
      );
      params.set('pageSize', String(next.pageSize));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const settingsEntries: ColumnSettingsEntry[] = order.map((key) => ({
    key,
    label: labelByKey.get(key) ?? key,
    visible: effectiveVisibility[key] ?? true,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* toolbar แถวเดียว (มติ 2026-08-11): ค้นหาซ้ายสุด → filter ระดับหน้า
          (toolbarFilters, กว้าง→แคบ) → ช่องว่าง → toolbarExtra + ปุ่มตั้งค่าคอลัมน์
          ชิดขวา · จอแคบ wrap ลงบรรทัดใหม่เอง */}
      <div className="flex flex-wrap items-center gap-2">
        {(filterColumn || globalSearch) && (
          <div className="relative">
            <Search
              className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              placeholder={placeholder}
              value={
                globalSearch
                  ? globalFilter
                  : ((table.getColumn(filterColumn!)?.getFilterValue() as string) ?? '')
              }
              onChange={(e) =>
                globalSearch
                  ? setGlobalFilter(e.target.value)
                  : table.getColumn(filterColumn!)?.setFilterValue(e.target.value)
              }
              className="max-w-sm pl-8"
            />
          </div>
        )}

        {toolbarFilters}

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{toolbarExtra}</div>

        <DataTableColumnSettings
          entries={settingsEntries}
          onToggle={toggleColumn}
          onMove={moveColumn}
          onReset={resetTable}
        />
      </div>

      {/* แถว chip ตัวกรองที่ใช้อยู่ — chip ละคอลัมน์ กด ✕ ล้างรายตัว หรือปุ่มล้างทั้งหมด */}
      {activeColumnFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeColumnFilters.map(([key, value]) => {
            const label = labelByKey.get(key) ?? key;
            return (
              // ป้ายตัวกรอง = `Badge` ตามข้อตกลง (ป้ายที่ไม่ใช่สถานะ) — ห้ามเขียน
              // ทรง pill เองอีกชุด ไม่งั้นสูง/ขนาดตัวอักษรไม่ตรงกับ Badge ที่อื่น
              <Badge key={key} variant="secondary" className="gap-1">
                <span className="text-muted-foreground">{label}:</span>
                {value}
                <button
                  type="button"
                  aria-label={`ล้างกรอง ${label}`}
                  className="rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                  onClick={() => applyColumnFilter(key, '')}
                >
                  <X className="size-3" strokeWidth={2} aria-hidden />
                </button>
              </Badge>
            );
          })}
          <Button variant="ghost" size="sm" onClick={clearAllColumnFilters}>
            ล้างตัวกรองทั้งหมด
          </Button>
        </div>
      )}

      <div
        className={cn(
          'hidden overflow-clip rounded-lg border sm:block',
          // default: the inner container scrolls sideways · scrollX={false}
          // CLIPS — columns past the edge become unreachable, so it is opt-in
          !scrollX && '[&_[data-slot=table-container]]:overflow-x-clip',
          // the sideways scrollbar uses the org's thin style, not the OS default
          scrollX && '[&_[data-slot=table-container]]:scroll-thin'
        )}
      >
        <Table className={cn(fixedLayout && 'table-fixed')}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const def = header.column.columnDef;
                  const key = header.column.id;
                  const pinned = isPinnedKey(key);
                  const draggable = !pinned && dataKeys.includes(key);
                  const filterable =
                    columnFilterEnabled &&
                    !pinned &&
                    key !== filterColumn &&
                    isFilterableColumn(def) &&
                    (!serverQuery?.fields || serverQuery.fields.filterable.includes(key));
                  const serverSortable =
                    !!serverQuery &&
                    !pinned &&
                    typeof def.header === 'string' &&
                    header.column.getCanSort() &&
                    (!serverQuery.fields || serverQuery.fields.sortable.includes(key));
                  const filterValue = serverQuery
                    ? (serverQuery.query.filters[key] ?? '')
                    : ((header.column.getFilterValue() as string | undefined) ?? '');
                  return (
                    <DataTableHeaderCell
                      key={header.id}
                      header={header}
                      draggable={draggable}
                      filterable={filterable}
                      serverSortable={serverSortable}
                      filterLabel={labelByKey.get(key) ?? key}
                      filterValue={filterValue}
                      dragKey={dragKey}
                      overKey={overKey}
                      onDragKey={setDragKey}
                      onOverKey={setOverKey}
                      onMove={moveColumn}
                      onApplyFilter={(value) => applyColumnFilter(key, value)}
                    />
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if (!isInteractiveTarget(e.target)) onRowClick(row.original);
                        }
                      : undefined
                  }
                  className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length || columns.length}
                  className="py-8 text-center"
                >
                  <DataTableEmpty {...emptyProps} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="sm:hidden">
        <DataTableMobileCards
          table={table}
          rowClassName={rowClassName}
          onRowClick={onRowClick}
          {...emptyProps}
        />
      </div>

      {!disablePagination && (
        <div className="flex items-center justify-between">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {(() => {
              // server mode: `data` is one page, so the row count must come from
              // `totalItems` — not from the filtered row model.
              const total = serverPagination?.totalItems ?? table.getFilteredRowModel().rows.length;
              const { pageIndex, pageSize: size } = table.getState().pagination;
              const start = pageIndex * size + 1;
              const end = Math.min((pageIndex + 1) * size, total);
              return total > 0 ? `${start}–${end} จาก ${total}` : '0 รายการ';
            })()}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                แถวต่อหน้า
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {ROWS_PER_PAGE_OPTIONS.map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {`หน้า ${table.getState().pagination.pageIndex + 1} จาก ${Math.max(1, table.getPageCount())}`}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              {/* ขนาดปุ่มไอคอน = `size="icon"` ตาม density กลาง (มติ 2026-08-09)
                  — ห้าม hardcode size-8/h-8 ทับ ไม่งั้นแถว pagination จะสูงไม่เท่า
                  ปุ่มตั้งค่าคอลัมน์ใน toolbar ของตารางเดียวกัน */}
              <Button
                variant="outline"
                className="hidden lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">ไปหน้าแรก</span>
                <ChevronsLeft strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">ไปหน้าก่อน</span>
                <ChevronLeft strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">ไปหน้าถัดไป</span>
                <ChevronRight strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="hidden lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">ไปหน้าสุดท้าย</span>
                <ChevronsRight strokeWidth={2} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
