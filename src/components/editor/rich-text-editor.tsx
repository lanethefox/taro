"use client";

import { useImperativeHandle, type Ref } from "react";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import type { JSONContent } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Wikilink } from "./wikilink";

export type EditorHandle = {
  getJSON: () => JSONContent;
};

export function RichTextEditor({
  content,
  editable = true,
  linkMap = {},
  onUpdate,
  handleRef,
  className,
  renderToolbar,
}: {
  content: JSONContent | null;
  editable?: boolean;
  /** Lowercased title → slug, for resolving wikilinks. */
  linkMap?: Record<string, string>;
  onUpdate?: (json: JSONContent) => void;
  handleRef?: Ref<EditorHandle>;
  className?: string;
  /** Optional render-prop for a toolbar above the editor. */
  renderToolbar?: (editor: Editor) => React.ReactNode;
}) {
  const editor = useEditor({
    editable,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Wikilink.configure({
        editable,
        resolve: (title) => linkMap[title.toLowerCase()] ?? null,
      }),
    ],
    content: content ?? undefined,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap prose prose-neutral dark:prose-invert max-w-none focus:outline-none",
          className,
        ),
      },
    },
    onUpdate: ({ editor }) => onUpdate?.(editor.getJSON() as JSONContent),
  });

  useImperativeHandle(
    handleRef,
    () => ({ getJSON: () => (editor?.getJSON() as JSONContent) ?? { type: "doc" } }),
    [editor],
  );

  return (
    <div>
      {editable && editor && renderToolbar ? renderToolbar(editor) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
