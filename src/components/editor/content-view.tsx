"use client";

import type { JSONContent } from "@/lib/content";
import { RichTextEditor } from "./rich-text-editor";

/** Read-only render of stored TipTap content, with navigable wikilinks. */
export function ContentView({
  content,
  linkMap,
}: {
  content: JSONContent | null;
  linkMap?: Record<string, string>;
}) {
  return (
    <RichTextEditor content={content} editable={false} linkMap={linkMap} />
  );
}
