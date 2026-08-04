// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import * as React from 'react';
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
  type Row,
  type RowData,
  type SortingState,
  type Table as TanstackTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Inbox,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  }
}

function mobileLabel<TData>(column: Column<TData, unknown>): string {
  const { header, meta } = column.columnDef;
  if (meta?.mobileLabel) return meta.mobileLabel;
  if (typeof header === 'string') return header;
  return column.id;
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

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
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
    onChange: (next: { pageIndex: number; pageSize: number }) => void;
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
   * Let the table scroll sideways instead of clipping. Off by default (narrow
   * CRUD tables look better clipped); turn it on for wide monitoring tables,
   * whose later columns are otherwise unreachable between `sm` and `lg`.
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
}

/**
 * ตัวเลือก "แถวต่อหน้า" ชุดเดียวของทั้งแอป (doc แม่ ส่วน 3: rows/page 10–50).
 * ตารางที่ทำ pagination เองฝั่ง server ต้อง import ชุดนี้ ห้ามประกาศชุดของตัวเอง
 * — ก่อนหน้านี้มี 4 ชุดต่างกันบน UI หน้าตาเดียวกัน (รวมค่า 100 ที่เกินกรอบ doc).
 *
 * **ค่าเริ่มต้น** ต่างกันตามชนิดตาราง: config/CRUD = 10 (default ของ DataTable
 * ตัวนี้) · ตารางเฝ้าดู/ตรวจสอบที่ผู้ใช้กวาดตาหาความผิดปกติ = 20 (ตั้งที่ call site).
 */
export const ROWS_PER_PAGE_OPTIONS = [10, 20, 30, 40, 50] as const;

export function DataTable<TData>({
  columns,
  data,
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
  searchable,
  emptyTitle,
  emptyDescription,
  scrollX = false,
  rowClassName,
  onRowClick,
  toolbarExtra,
}: Readonly<DataTableProps<TData>>) {
  'use no memo';
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
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
    },
    enableRowSelection: enableRowSelection ?? true,
    getRowId,
    manualPagination: !!serverPagination,
    rowCount: serverPagination?.totalItems,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, value) => rowIncludesQuery(row.original, value),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      if (!serverPagination) {
        setPagination(updater);
        return;
      }
      serverPagination.onChange(
        typeof updater === 'function' ? updater(serverPaginationState!) : updater
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex flex-col gap-4">
      {/* ไม่ render แถว toolbar เปล่า — ตารางที่ไม่มีทั้ง search และ toolbarExtra
          (เช่น รายการผลลัพธ์ใน dialog) จะได้ไม่กินระยะ gap-4 ฟรีข้างบน */}
      {(filterColumn || globalSearch || toolbarExtra) && (
        <div className="flex items-center justify-between">
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

          {toolbarExtra}
        </div>
      )}

      <div
        className={cn(
          'hidden overflow-clip rounded-lg border sm:block',
          // default: no sideways scroll · scrollX: let the inner container scroll
          !scrollX && '[&_[data-slot=table-container]]:overflow-x-clip'
        )}
      >
        <Table className={cn(fixedLayout && 'table-fixed')}>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta;
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={meta?.headerClassName}
                      style={meta?.width ? { width: meta.width } : undefined}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
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
                <TableCell colSpan={columns.length} className="py-8 text-center">
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
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">ไปหน้าแรก</span>
                <ChevronsLeft strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">ไปหน้าก่อน</span>
                <ChevronLeft strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">ไปหน้าถัดไป</span>
                <ChevronRight strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
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
