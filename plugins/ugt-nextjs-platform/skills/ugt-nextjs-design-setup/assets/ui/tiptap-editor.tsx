'use client';

// source: ugt-hrms components/ui/tiptap-editor.tsx — installed by ugt-nextjs-design-setup (org UI kit)
// editor rich text ตัวเดียวของทั้งแอป (ห้ามใช้ editor อื่น) — ติดตั้งเฉพาะโปรเจคที่มี rich text
// deps (ทั้งชุด major ^3 เดียวกัน): @tiptap/react @tiptap/starter-kit @tiptap/pm
//   @tiptap/extension-{text-align,text-style,color,highlight,link,underline}
// `insert()` ผ่าน ref มีไว้แทรก HTML ที่ server สร้าง (เช่น {{token}} ของ mail template)
import * as React from 'react';
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

function ToolbarToggle({
  children,
  active,
  onClick,
  title,
  disabled,
}: Readonly<{
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        'size-7 p-0',
        active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'
      )}
    >
      {children}
    </Button>
  );
}

function ToolbarAction({
  children,
  onClick,
  title,
  disabled,
}: Readonly<{
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="size-7 p-0"
    >
      {children}
    </Button>
  );
}

function EditorToolbar({ editor, sourceMode, onSourceToggle, disabled }: Readonly<ToolbarProps>) {
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
      <ToolbarAction
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
        disabled={!s.canUndo || disabled}
      >
        <Undo2 className="size-3.5" />
      </ToolbarAction>
      <ToolbarAction
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
        disabled={!s.canRedo || disabled}
      >
        <Redo2 className="size-3.5" />
      </ToolbarAction>

      <ToolbarSep />

      <ToolbarToggle
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={!s.h2}
        title="Normal text"
        disabled={disabled}
      >
        <Pilcrow className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={s.h2}
        title="Heading"
        disabled={disabled}
      >
        <Heading2 className="size-3.5" />
      </ToolbarToggle>

      <ToolbarSep />

      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={s.bold}
        title="Bold"
        disabled={disabled}
      >
        <Bold className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={s.italic}
        title="Italic"
        disabled={disabled}
      >
        <Italic className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={s.underline}
        title="Underline"
        disabled={disabled}
      >
        <Underline className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={s.strike}
        title="Strikethrough"
        disabled={disabled}
      >
        <Strikethrough className="size-3.5" />
      </ToolbarToggle>

      <ToolbarSep />

      <ToolbarToggle
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        active={s.alignLeft}
        title="Align left"
        disabled={disabled}
      >
        <AlignLeft className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        active={s.alignCenter}
        title="Align center"
        disabled={disabled}
      >
        <AlignCenter className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        active={s.alignRight}
        title="Align right"
        disabled={disabled}
      >
        <AlignRight className="size-3.5" />
      </ToolbarToggle>

      <ToolbarSep />

      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={s.bulletList}
        title="Bullet list"
        disabled={disabled}
      >
        <List className="size-3.5" />
      </ToolbarToggle>
      <ToolbarToggle
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={s.orderedList}
        title="Numbered list"
        disabled={disabled}
      >
        <ListOrdered className="size-3.5" />
      </ToolbarToggle>

      <ToolbarSep />

      <ToolbarToggle
        onClick={() => {
          if (globalThis.window === undefined) return;
          const prev = (editor.getAttributes('link').href as string) ?? '';
          const url = globalThis.window.prompt('URL:', prev);
          if (url === null) return;
          if (url === '') editor.chain().focus().unsetLink().run();
          else editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
        }}
        active={s.link}
        title="Link"
        disabled={disabled}
      >
        <Link2 className="size-3.5" />
      </ToolbarToggle>
      <ToolbarAction
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
        disabled={disabled}
      >
        <Minus className="size-3.5" />
      </ToolbarAction>

      <ToolbarSep />

      <ToolbarAction
        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
        title="Clear formatting"
        disabled={disabled}
      >
        <RemoveFormatting className="size-3.5" />
      </ToolbarAction>

      <ToolbarSep />

      {/* HTML source toggle */}
      <ToolbarToggle onClick={onSourceToggle} active={sourceMode} title="HTML source view">
        <Code2 className="size-3.5" />
      </ToolbarToggle>
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
