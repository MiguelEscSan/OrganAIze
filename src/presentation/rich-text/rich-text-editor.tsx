"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { richTextExtensions } from "./rich-text-extensions";
import { useIsMounted } from "./use-is-mounted";

type RichTextEditorProps = {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

type ToolbarAction = {
  label: string;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

const toolbarActions: readonly ToolbarAction[] = [
  {
    label: "Bold",
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    label: "Italic",
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    label: "Heading",
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Bullet list",
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Code",
    isActive: (editor) => editor.isActive("code"),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    label: "Quote",
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Link",
    isActive: (editor) => editor.isActive("link"),
    run: (editor) => {
      const previous = editor.getAttributes("link").href as string | undefined;
      const url = window.prompt("Link address", previous ?? "https://");
      if (url === null) {
        return;
      }
      if (url.trim() === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
    },
  },
];

const RichTextEditorField = ({ id, label, value, onChange, placeholder }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-labelledby": `${id}-label`,
        "data-placeholder": placeholder ?? "",
        class: "rich-text-content min-h-40 px-4 py-3 outline-none",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const activeStates =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        current ? toolbarActions.map((action) => action.isActive(current)) : [],
    }) ?? [];

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-semibold">
        {label}
      </span>
      <div className="overflow-hidden rounded-lg border border-line bg-cream focus-within:border-terracotta">
        <div role="toolbar" aria-label="Text formatting" className="flex flex-wrap gap-1 border-b border-line p-1.5">
          {toolbarActions.map((action, index) => (
            <button
              key={action.label}
              type="button"
              aria-pressed={activeStates[index] ?? false}
              disabled={!editor}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor && action.run(editor)}
              className={`rounded-md px-2 py-1 text-xs font-bold transition-colors disabled:opacity-40 ${
                activeStates[index] ? "bg-paper text-ink shadow-sm" : "text-muted hover:bg-paper hover:text-ink"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export const RichTextEditor = (props: RichTextEditorProps) => {
  const isMounted = useIsMounted();
  return isMounted ? <RichTextEditorField {...props} /> : null;
};
