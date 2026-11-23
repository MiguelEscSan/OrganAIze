"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { richTextExtensions } from "./rich-text-extensions";
import { useIsMounted } from "./use-is-mounted";

type RichTextViewProps = {
  html: string;
  className?: string;
};

const RichTextViewer = ({ html, className }: RichTextViewProps) => {
  const editor = useEditor({
    extensions: richTextExtensions,
    content: html,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: `rich-text-content ${className ?? ""}` },
    },
  });

  return <EditorContent editor={editor} />;
};

export const RichTextView = (props: RichTextViewProps) => {
  const isMounted = useIsMounted();
  return isMounted ? <RichTextViewer {...props} /> : null;
};
