'use client';
// kit: ugt-nextjs-platform 4.46.0 · ugt-nextjs-design-setup/ui/tiptap-editor.tsx
// kit-hash: f1b1156f8f69

// source: ugt-hrms components/ui/tiptap-editor.tsx — installed by ugt-nextjs-design-setup (org UI kit)
// editor rich text ตัวเดียวของทั้งแอป (ห้ามใช้ editor อื่น) — ติดตั้งเฉพาะโปรเจคที่มี rich text
// deps (ทั้งชุด major ^3 เดียวกัน): @tiptap/react @tiptap/starter-kit @tiptap/pm
//   @tiptap/extension-{text-align,text-style,color,highlight,link,underline}
// `insert()` ผ่าน ref มีไว้แทรก HTML ที่ server สร้าง (เช่น {{token}} ของ mail template)
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useEditor, EditorContent, useEditorState, type Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { TextAlign } from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link2,
  Minus,
  Undo2,
  Redo2,
  RemoveFormatting,
  Code2,
  Heading2,
  Pilcrow,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { IconAction } from '@/components/ui/icon-action';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface TiptapEditorHandle {
  /** Insert raw HTML (e.g. a `{{token}}`) at the caret. */
  insert: (html: string) => void;
}

interface TiptapEditorProps {
  /** Loaded once on mount. Remount via React `key` to reload. */
  readonly initialValue: string;
  readonly onChange: (html: string) => void;
  readonly disabled?: boolean;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

interface ToolbarProps {
  editor: Editor;
  sourceMode: boolean;
  onSourceToggle: () => void;
  disabled: boolean;
}

const ToolbarSep = () => <Separator orientation="vertical" className="mx-0.5 h-5 shrink-0" />;

// ปุ่ม toolbar ทุกตัวเป็นไอคอนล้วน → ผ่าน IconAction ตัวกลาง: ได้ size="icon"
// ของ preset (size-7 พอดีกับที่ไฟล์นี้เคย hardcode `size-7 p-0` ทับไว้ ก่อน 4.38.0)
// + aria-label + Tooltip ของ kit แทน native `title` ซึ่งไม่ theme และช้า
// สถานะ toggle สื่อด้วย `aria-pressed` แล้วปล่อยให้สีวิ่งตาม attribute นั้น —
// ปุ่มที่ไม่ใช่ toggle ไม่ส่ง `active` มา attribute จึงหายไปทั้งอันและไม่ติดสี
const TOGGLE_ACTIVE =
  'aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:hover:bg-primary/15 aria-pressed:hover:text-primary';

function ToolbarButton({
  children,
  active,
  onClick,
  label,
  disabled,
}: Readonly<{
  children: React.ReactNode;
  /** ส่งเฉพาะปุ่ม toggle — undefined = ปุ่มสั่งงานธรรมดา (ไม่มี aria-pressed) */
  active?: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}>) {
  return (
    <IconAction
      variant="ghost"
      label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={TOGGLE_ACTIVE}
    >
      {children}
    </IconAction>
  );
}

function EditorToolbar({ editor, sourceMode, onSourceToggle, disabled }: Readonly<ToolbarProps>) {
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState('');
  const t = useTranslations('kit.tiptap');

  // url ว่าง (หรือกด "ลบลิงก์") = เอาลิงก์ออก — พฤติกรรมเดิมของ prompt
  const applyLink = (url = linkUrl) => {
    if (url === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    setLinkOpen(false);
  };

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h2: e.isActive('heading', { level: 2 }),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      alignLeft: e.isActive({ textAlign: 'left' }),
      alignCenter: e.isActive({ textAlign: 'center' }),
      alignRight: e.isActive({ textAlign: 'right' }),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        label="Undo"
        disabled={!s.canUndo || disabled}
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        label="Redo"
        disabled={!s.canRedo || disabled}
      >
        <Redo2 />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={!s.h2}
        label="Normal text"
        disabled={disabled}
      >
        <Pilcrow />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={s.h2}
        label="Heading"
        disabled={disabled}
      >
        <Heading2 />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={s.bold}
        label="Bold"
        disabled={disabled}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={s.italic}
        label="Italic"
        disabled={disabled}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={s.underline}
        label="Underline"
        disabled={disabled}
      >
        <Underline />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={s.strike}
        label="Strikethrough"
        disabled={disabled}
      >
        <Strikethrough />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={s.alignLeft}
        label="Align left"
        disabled={disabled}
      >
        <AlignLeft />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={s.alignCenter}
        label="Align center"
        disabled={disabled}
      >
        <AlignCenter />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={s.alignRight}
        label="Align right"
        disabled={disabled}
      >
        <AlignRight />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={s.bulletList}
        label="Bullet list"
        disabled={disabled}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={s.orderedList}
        label="Numbered list"
        disabled={disabled}
      >
        <ListOrdered />
      </ToolbarButton>

      <ToolbarSep />

      {/* ลิงก์ผ่าน Popover ของ kit — native window.prompt ต้องห้าม (ไม่ theme,
          บล็อกทั้ง thread และ lint-kit-assets ตรวจจับ) */}
      <Popover
        open={linkOpen}
        onOpenChange={(open) => {
          setLinkOpen(open);
          if (open) setLinkUrl((editor.getAttributes('link').href as string) ?? '');
        }}
      >
        {/* ปุ่มนี้เป็นทั้ง trigger ของ Popover และ trigger ของ Tooltip —
            Base UI ซ้อน render prop ได้ (children ตกไปที่ชั้นในสุด) จึงไม่ต้อง
            มี wrapper เพิ่ม และไม่ต้องกลับไปใช้ native title */}
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-pressed={s.link}
                    aria-label="Link"
                    disabled={disabled}
                    className={TOGGLE_ACTIVE}
                  >
                    <Link2 />
                  </Button>
                }
              />
            }
          />
          <TooltipContent>Link</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-72 space-y-2 p-3">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            aria-label="URL"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <div className="flex justify-end gap-2">
            {s.link && (
              <Button type="button" variant="outline" size="sm" onClick={() => applyLink('')}>
                {t('removeLink')}
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => applyLink()}>
              {t('save')}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Horizontal rule"
        disabled={disabled}
      >
        <Minus />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        label="Clear formatting"
        disabled={disabled}
      >
        <RemoveFormatting />
      </ToolbarButton>

      <ToolbarSep />

      {/* HTML source toggle */}
      <ToolbarButton onClick={onSourceToggle} active={sourceMode} title="HTML source view">
        <Code2 />
      </ToolbarButton>
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

export const TiptapEditor = React.forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  function TiptapEditor({ initialValue, onChange, disabled = false }, ref) {
    const [sourceMode, setSourceMode] = React.useState(false);
    const [sourceHtml, setSourceHtml] = React.useState(initialValue);
    const onChangeRef = React.useRef(onChange);
    React.useEffect(() => {
      onChangeRef.current = onChange;
    });

    const editor = useEditor({
      extensions: [
        StarterKit.configure({ codeBlock: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        TextStyle,
        Color,
        Highlight.configure({ multicolor: true }),
      ],
      content: initialValue,
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        const html = e.getHTML();
        setSourceHtml(html);
        onChangeRef.current(html);
      },
      editorProps: {
        attributes: { class: 'tiptap-editor-content' },
      },
    });

    React.useImperativeHandle(ref, () => ({
      insert: (html: string) => {
        editor?.chain().focus().insertContent(html).run();
      },
    }));

    React.useEffect(() => {
      editor?.setEditable(!disabled);
    }, [editor, disabled]);

    const toggleSource = React.useCallback(() => {
      if (!editor) return;
      if (sourceMode) {
        editor.commands.setContent(sourceHtml);
        onChangeRef.current(sourceHtml);
      } else {
        setSourceHtml(editor.getHTML());
      }
      setSourceMode((prev) => !prev);
    }, [editor, sourceMode, sourceHtml]);

    return (
      <div
        className={cn(
          'overflow-hidden rounded-md border',
          disabled && 'pointer-events-none opacity-60'
        )}
      >
        {editor && (
          <EditorToolbar
            editor={editor}
            sourceMode={sourceMode}
            onSourceToggle={toggleSource}
            disabled={disabled}
          />
        )}
        {sourceMode ? (
          <textarea
            value={sourceHtml}
            onChange={(e) => {
              const val = e.target.value;
              setSourceHtml(val);
              onChangeRef.current(val);
            }}
            disabled={disabled}
            spellCheck={false}
            className="min-h-60 w-full resize-y border-0 bg-muted/20 p-4 font-mono text-xs focus:outline-none"
          />
        ) : (
          <EditorContent className="min-h-60 p-4" editor={editor} />
        )}
      </div>
    );
  }
);
