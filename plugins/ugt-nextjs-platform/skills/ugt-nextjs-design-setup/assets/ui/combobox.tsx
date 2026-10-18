// kit: ugt-nextjs-platform 4.83.3 · ugt-nextjs-design-setup/ui/combobox.tsx
// kit-hash: 47c93110b285
// source: ugt-hrms — installed by ugt-nextjs-design-setup (org UI kit)
'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Combobox as ComboboxPrimitive } from '@base-ui/react';

import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronDownIcon, XIcon, CheckIcon } from 'lucide-react';

/**
 * Combobox (Base UI) — **desktop**: ช่องพิมพ์ (`ComboboxInput`) อยู่ในหน้า รายการเป็น popup เกาะใต้ช่อง ·
 * **มือถือ (< 768px)**: bottom sheet เกือบเต็มจอ — ช่องค้นหาอยู่**บนสุด**ของ sheet รายการอยู่ใต้ช่อง
 * (มติ 2026-10-18 "B" · แทนข้อยกเว้น "ไม่เป็น sheet" ของรุ่น 4)
 *
 * - ทำไมช่องค้นหาต้องอยู่บนสุด: คีย์บอร์ดจอทับครึ่งล่างของจอ (`fixed bottom-0` อิง layout viewport ซึ่ง
 *   คีย์บอร์ดทับ — iOS Safari, Chrome Android ≥108) · ช่องพิมพ์ + ผลแรก ๆ อยู่ส่วนบนของ sheet ที่สูงเกือบเต็มจอ
 *   คีย์บอร์ดจึงทับแค่ท้ายรายการ ไม่ว่าช่องจะอยู่ตรงไหนของฟอร์ม (popup ใต้ช่องในหน้าแบบเดิม: ช่องที่อยู่ล่าง
 *   ของฟอร์มเหลือที่ให้รายการไม่กี่แถว) · **ห้ามย้ายช่องค้นหาไปไว้ล่าง sheet**
 * - ในหน้า ช่องเป็นปุ่มแสดงค่าปัจจุบัน (หรือ placeholder) · แตะ = เปิด sheet + โฟกัสช่องค้นหา (คีย์บอร์ด
 *   เปิดครั้งเดียว) · เลือก (single) = ปิด sheet โฟกัสกลับปุ่ม · `multiple` = sheet ค้างไว้ ✓ บอกตัวที่เลือก
 *   chip อยู่ในหน้า · ปิดด้วย ✕ / Esc / แตะพื้นหลัง · หัวข้อ sheet = prop `label` ของ `Combobox` →
 *   `aria-label` → `placeholder` ของช่อง
 * - กลไก: `Combobox.Root inline` ซ้อน `Sheet` (Dialog) ผูก open ตัวเดียวกัน (แบบที่เอกสาร Base UI แนะนำ) ·
 *   `ComboboxInput`/`ComboboxChipsInput` วาดปุ่มในหน้าแล้ว portal ช่องค้นหาจริงขึ้นหัว sheet ·
 *   `ComboboxContent` วาด sheet แทน popup · props/exports เดิมใช้ได้ครบ · แบบ "`ComboboxTrigger` + ช่องค้นหา
 *   ใน `ComboboxContent`" ก็ได้ (ช่องในเนื้อ sheet ไม่วาดปุ่มซ้ำ)
 * - ปุ่มในหน้ารับ `id` · `aria-invalid` · `aria-describedby` (+ ค่าที่เลือก) · `ref` ของช่อง (RHF
 *   `shouldFocusError` โฟกัสปุ่ม) · `disabled`/`readOnly` ที่ `Combobox` = แตะไม่เปิด (Field.Root ของ Base UI
 *   ไม่ถูกอ่านบนมือถือ — ส่ง `disabled` ที่ `Combobox`) · native `required` ของ Root: เบราว์เซอร์โฟกัสช่องให้
 *   ไม่ได้บนมือถือ (ช่องจริงมีเฉพาะตอน sheet เปิด) — ตรวจค่าว่างด้วย schema ของฟอร์ม
 * - ข้อจำกัดที่รู้ (ต้องลองบน iPhone จริง): iOS อาจไม่ยกคีย์บอร์ดเมื่อโฟกัสย้ายนอกจังหวะแตะ — ถ้าแตะครั้งแรก
 *   แล้วคีย์บอร์ดไม่ขึ้น ให้แตะช่องค้นหาอีกครั้ง (รายการยังเลือกได้เลยโดยไม่ต้องพิมพ์)
 * - paint แรก = แบบ desktop เสมอ (`useIsMobile` ตอบ `false` ทั้ง server และ render แรก) HTML จึงตรงกัน
 *   ไม่เกิด #418 · สลับเป็นปุ่ม+sheet ใน effect (เหมือน `ResponsivePopover`) · Root ไม่ remount ตอนข้ามจุดตัด
 * - **ใช้ใน Sheet/Dialog ได้** (เช่นใน `FilterPopover`): มือถือ = sheet ซ้อน sheet · desktop: ลูกศร/Enter/
 *   คลิกเลือกได้ · Esc แรกปิดรายการ · ครั้งถัดไปล้างค่าที่เลือก (พฤติกรรม Base UI) · ครั้งถัดไปจึงปิด dialog
 * - เลือกจากรายการสั้นที่ไม่ต้องพิมพ์ = `Select` ไม่ใช่ Combobox (conventions §Control selection ladder)
 */
interface ComboboxSheetState {
  label: string | undefined;
  /** `disabled`/`readOnly` ของ Root — ปุ่มในหน้าต้องไม่เปิด sheet */
  disabled: boolean;
  /** หัว sheet ที่ช่องค้นหา portal เข้าไป — `null` = sheet ปิดอยู่ */
  slot: HTMLDivElement | null;
  setSlot: (el: HTMLDivElement | null) => void;
}

/** ไม่ใช่ `null` = มือถือ (Root เป็น `inline` ซ้อน Sheet) */
const ComboboxSheetContext = React.createContext<ComboboxSheetState | null>(null);
/** `true` = อยู่ในเนื้อ sheet แล้ว (ช่องค้นหาวางใน `ComboboxContent`) — ห้ามวาดปุ่มในหน้าซ้ำในนั้น */
const ComboboxInSheetContext = React.createContext(false);

function Combobox<Value, Multiple extends boolean | undefined = false, Item = Value>({
  label,
  ...props
}: Readonly<
  ComboboxPrimitive.Root.Props<Value, Multiple, Item> & {
    /** ชื่อช่อง = หัวข้อ bottom sheet บนมือถือ · ไม่ส่ง = `aria-label` → `placeholder` ของช่อง · ผู้เรียกแปลเอง */
    label?: string;
  }
>) {
  const { open: openProp, defaultOpen, onOpenChange, children, ...rest } = props;
  const isMobile = useIsMobile();
  // ลูก (ปุ่ม/ช่อง/sheet) สลับแบบช้ากว่า `inline` หนึ่ง commit — Base UI อ่าน `inline` ของ store ตอนช่องพิมพ์
  // mount เพื่อตัดสินว่าช่องอยู่ "ใน popup" ไหม · สลับพร้อมกันแล้วช่อง desktop ที่ mount หลังหมุนจอกลับ
  // จะติดโหมด "ใน popup" (เลือกแล้วช่องว่าง) — effect ของ Root (ลูก) รันก่อน effect นี้เสมอ
  const [sheetMode, setSheetMode] = React.useState(false);
  React.useEffect(() => setSheetMode(isMobile), [isMobile]);
  const [openState, setOpenState] = React.useState(defaultOpen ?? false);
  const [slot, setSlot] = React.useState<HTMLDivElement | null>(null);
  const disabled = !!(rest.disabled || rest.readOnly);
  const sheet = React.useMemo(
    () => ({ label, disabled, slot, setSlot }),
    [label, disabled, slot]
  );

  const open = openProp ?? openState;
  function setOpen(next: boolean, details: ComboboxPrimitive.Root.OpenChangeEventDetails) {
    if (next && disabled && isMobile) return; // desktop: Base UI ตัดสินเอง
    if (openProp === undefined) setOpenState(next);
    onOpenChange?.(next, details);
  }

  // รูปต้นไม้เดียวกันทุกขนาดจอ (Provider > Root) — ข้ามจุดตัด 768px แล้ว Root ไม่ remount ค่า uncontrolled
  // (`defaultValue`) จึงไม่หายตอนหมุนจอ · `open` controlled ทั้งสองแบบ (ไม่งั้น Base UI เตือน uncontrolled →
  // controlled ทุกครั้งที่มือถือสลับหลัง paint แรก) — desktop ทำตัวเหมือนส่งผ่านตรง ๆ
  return (
    <ComboboxSheetContext.Provider value={sheetMode ? sheet : null}>
      <ComboboxPrimitive.Root
        {...rest}
        inline={isMobile || rest.inline}
        open={open}
        onOpenChange={setOpen}
      >
        {sheetMode ? (
          <Sheet
            open={open}
            // ปิดจาก ✕ / พื้นหลัง / Esc ของ dialog — รายละเอียด event ของ Dialog รูปเดียวกับของ Combobox
            onOpenChange={(next, details) =>
              setOpen(next, details as unknown as ComboboxPrimitive.Root.OpenChangeEventDetails)
            }
          >
            {children}
          </Sheet>
        ) : (
          children
        )}
      </ComboboxPrimitive.Root>
    </ComboboxSheetContext.Provider>
  );
}

/**
 * มือถือ: หัวข้อ + ช่องค้นหาจริง portal ขึ้นหัว sheet (slot ที่ `ComboboxContent` วาด) — ทั้งจากปุ่มในหน้า
 * และจากช่องที่ผู้เรียกวางไว้ใน `ComboboxContent` (แบบ "ปุ่ม + ช่องค้นหาใน popup")
 */
function ComboboxSheetSearch({
  sheet,
  title,
  children,
}: Readonly<{ sheet: ComboboxSheetState; title: React.ReactNode; children: React.ReactNode }>) {
  if (!sheet.slot) return null;
  return createPortal(
    <>
      <SheetTitle className="pr-10 text-sm">{title}</SheetTitle>
      <InputGroup className="h-11">{children}</InputGroup>
    </>,
    sheet.slot
  );
}

/** id ใน `aria-describedby` ของผู้เรียก + id ของค่าที่เลือก (ป้าย `<label>` ทับชื่อปุ่ม — ค่าต้องอ่านเป็นคำอธิบาย) */
function joinIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(' ') || undefined;
}

function ComboboxValue({ ...props }: Readonly<ComboboxPrimitive.Value.Props>) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: Readonly<ComboboxPrimitive.Trigger.Props>) {
  const sheet = React.useContext(ComboboxSheetContext);
  const inSheet = React.useContext(ComboboxInSheetContext);
  if (sheet && !inSheet) {
    // มือถือ (แบบปุ่ม + ช่องค้นหาใน `ComboboxContent`): ปุ่มนี้เปิด sheet — trigger ของ Base UI ไม่เปิด
    // เมื่อ Root เป็น `inline`
    const { render, disabled, id, ref } = props as typeof props & {
      ref?: React.Ref<HTMLButtonElement>;
    };
    return (
      <SheetTrigger
        ref={ref}
        id={id}
        disabled={disabled || sheet.disabled}
        data-slot="combobox-trigger"
        render={React.isValidElement(render) ? render : undefined}
        className={cn(
          "[&_svg:not([class*='size-'])]:size-3.5",
          typeof className === 'string' ? className : undefined
        )}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-3.5 text-muted-foreground" />
      </SheetTrigger>
    );
  }
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-3.5", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-3.5 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  );
}

function ComboboxClear({ className, ...props }: Readonly<ComboboxPrimitive.Clear.Props>) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: Readonly<
  ComboboxPrimitive.Input.Props & {
    showTrigger?: boolean;
    showClear?: boolean;
  }
>) {
  const sheet = React.useContext(ComboboxSheetContext);
  const inSheet = React.useContext(ComboboxInSheetContext);
  const valueId = React.useId();
  if (sheet) {
    // มือถือ: ปุ่มแสดงค่าในหน้า (รับ id/aria-*/ref ของช่อง — `<label htmlFor>` ชี้ปุ่ม · RHF `shouldFocusError`
    // โฟกัสปุ่ม) · ช่องพิมพ์จริงอยู่หัว sheet (มีเฉพาะตอนเปิด)
    const {
      ref,
      id,
      placeholder,
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...inputProps
    } = props as typeof props & { ref?: React.Ref<HTMLButtonElement> };
    const title = sheet.label ?? ariaLabel ?? placeholder;
    const search = (
      <ComboboxSheetSearch sheet={sheet} title={title}>
        <ComboboxPrimitive.Input
          render={<InputGroupInput disabled={disabled} />}
          placeholder={placeholder}
          aria-label={title}
          {...inputProps}
        />
        {showClear && (
          <InputGroupAddon align="inline-end">
            <ComboboxClear disabled={disabled} />
          </InputGroupAddon>
        )}
        {children}
      </ComboboxSheetSearch>
    );
    // ช่องที่ผู้เรียกวางใน `ComboboxContent` (เปิดด้วย `ComboboxTrigger`) — มีแค่ช่องค้นหา ไม่มีปุ่มในหน้า
    if (inSheet) return search;
    return (
      <>
        <SheetTrigger
          ref={ref}
          id={id}
          disabled={disabled || sheet.disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={joinIds(ariaDescribedBy, valueId)}
          data-slot="combobox-trigger"
          render={
            <Button
              variant="field"
              className={cn('w-full justify-between font-normal', className)}
            />
          }
        >
          {ariaLabel && <span className="sr-only">{ariaLabel}</span>}
          <span id={valueId} className="truncate">
            <ComboboxValue
              placeholder={<span className="text-muted-foreground">{placeholder}</span>}
            />
          </span>
          <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
        </SheetTrigger>
        {search}
      </>
    );
  }

  return (
    <InputGroup className={cn('w-auto', className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <ComboboxTrigger
            render={
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                data-slot="input-group-button"
                className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
                disabled={disabled}
              />
            }
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

function ComboboxContent({
  className,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  anchor,
  ...props
}: Readonly<
  ComboboxPrimitive.Popup.Props &
    Pick<
      ComboboxPrimitive.Positioner.Props,
      'side' | 'align' | 'sideOffset' | 'alignOffset' | 'anchor'
    >
>) {
  const sheet = React.useContext(ComboboxSheetContext);
  const slotRef = React.useRef<HTMLDivElement | null>(null);
  const setSlot = sheet?.setSlot;
  const attachSlot = React.useCallback(
    (el: HTMLDivElement | null) => {
      slotRef.current = el;
      setSlot?.(el);
    },
    [setSlot]
  );

  if (sheet) {
    // มือถือ: sheet สูงเกือบเต็มจอ · หัว = slot ของหัวข้อ+ช่องค้นหา · รายการเลื่อนในพื้นที่ที่เหลือ ·
    // แถว 44px (นิ้วกดได้) · คีย์บอร์ดทับได้แค่ท้ายรายการ · props ของ popup ที่ sheet ไม่มีความหมาย
    // (ตำแหน่ง · `render` · style ตาม state) ไม่ส่งต่อ
    const { children, initialFocus, finalFocus, id, 'aria-label': ariaLabel } = props;
    return (
      <SheetContent
        side="bottom"
        id={id}
        initialFocus={initialFocus ?? (() => slotRef.current?.querySelector('input') ?? true)}
        finalFocus={finalFocus}
        className="gap-0 data-[side=bottom]:h-[calc(100dvh-2.5rem)]"
      >
        <div ref={attachSlot} className="flex flex-col gap-3 border-b px-4 pt-4 pb-3" />
        <div
          data-slot="combobox-content"
          aria-label={ariaLabel}
          className={cn(
            'group/combobox-content flex min-h-0 flex-1 flex-col *:data-[slot=combobox-list]:max-h-none *:data-[slot=combobox-list]:min-h-0 *:data-[slot=combobox-list]:flex-1 *:data-[slot=combobox-list]:p-2 **:data-[slot=combobox-item]:min-h-11 **:data-[slot=combobox-item]:text-sm',
            typeof className === 'string' ? className : undefined
          )}
        >
          <ComboboxInSheetContext.Provider value={true}>{children}</ComboboxInSheetContext.Provider>
        </div>
      </SheetContent>
    );
  }

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            'group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-border duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-7 *:data-[slot=input-group]:border-none *:data-[slot=input-group]:bg-input/20 *:data-[slot=input-group]:shadow-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 dark:bg-popover',
            className
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: Readonly<ComboboxPrimitive.List.Props>) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        'no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0',
        className
      )}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }: Readonly<ComboboxPrimitive.Item.Props>) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

function ComboboxGroup({ className, ...props }: Readonly<ComboboxPrimitive.Group.Props>) {
  return (
    <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props} />
  );
}

function ComboboxLabel({ className, ...props }: Readonly<ComboboxPrimitive.GroupLabel.Props>) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn('px-2 py-1.5 text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: Readonly<ComboboxPrimitive.Collection.Props>) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

function ComboboxEmpty({ className, ...props }: Readonly<ComboboxPrimitive.Empty.Props>) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        'flex w-full justify-center py-2 text-center text-xs/relaxed text-muted-foreground empty:hidden',
        className
      )}
      {...props}
    />
  );
}

function ComboboxSeparator({ className, ...props }: Readonly<ComboboxPrimitive.Separator.Props>) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn('-mx-1 my-1 h-px bg-border/50', className)}
      {...props}
    />
  );
}

function ComboboxChips({
  className,
  ...props
}: Readonly<
  React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props
>) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        'flex min-h-7 flex-wrap items-center gap-1 rounded-md border border-input bg-input/20 bg-clip-padding px-2 py-0.5 text-xs/relaxed transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-aria-invalid:border-destructive has-aria-invalid:ring-2 has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40',
        className
      )}
      {...props}
    />
  );
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: Readonly<
  ComboboxPrimitive.Chip.Props & {
    showRemove?: boolean;
  }
>) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        'flex h-[calc(--spacing(4.75))] w-fit items-center justify-center gap-1 rounded-[calc(var(--radius-sm)-2px)] bg-muted-foreground/10 px-1.5 text-xs/relaxed font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0',
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

function ComboboxChipsInput({ className, ...props }: Readonly<ComboboxPrimitive.Input.Props>) {
  const sheet = React.useContext(ComboboxSheetContext);
  const inSheet = React.useContext(ComboboxInSheetContext);
  if (sheet) {
    // มือถือ: chip อยู่ในหน้า · ปุ่มท้าย chip เปิด sheet (รับ id/aria-*/ref ของช่อง) · ช่องพิมพ์จริงอยู่หัว sheet
    // (sheet ค้างระหว่างเลือกหลายตัว)
    const {
      ref,
      id,
      placeholder,
      disabled,
      'aria-label': ariaLabel,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
      ...inputProps
    } = props as typeof props & { ref?: React.Ref<HTMLButtonElement> };
    const title = sheet.label ?? ariaLabel ?? placeholder;
    const search = (
      <ComboboxSheetSearch sheet={sheet} title={title}>
        <ComboboxPrimitive.Input
          render={<InputGroupInput disabled={disabled} />}
          placeholder={placeholder}
          aria-label={title}
          {...inputProps}
        />
      </ComboboxSheetSearch>
    );
    if (inSheet) return search;
    return (
      <>
        <SheetTrigger
          ref={ref}
          id={id}
          disabled={disabled || sheet.disabled}
          aria-label={title}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          data-slot="combobox-chip-input"
          className={cn(
            'min-h-7 min-w-16 flex-1 text-left text-muted-foreground outline-none',
            className
          )}
        >
          {placeholder}
        </SheetTrigger>
        {search}
      </>
    );
  }

  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn('min-w-16 flex-1 outline-none', className)}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};
