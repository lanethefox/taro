"use client";

import Link from "next/link";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";

import { cn } from "@/lib/utils";

/**
 * Renders a `[[wikilink]]` token. In read-only mode a resolved link navigates
 * to its page; unresolved ("red") links are styled distinctly. In the editor it
 * renders as a non-editable inline chip.
 */
export function WikilinkView({ node, extension }: NodeViewProps) {
  const title = String(node.attrs.title ?? "");
  const resolve = extension.options.resolve as (t: string) => string | null;
  const editable = extension.options.editable as boolean;
  const slug = resolve?.(title) ?? null;

  const className = cn(
    "wikilink",
    !slug && "wikilink--unresolved",
  );

  if (slug && !editable) {
    return (
      <NodeViewWrapper as="span" className="inline">
        <Link href={`/wiki/${slug}`} className={className} data-wikilink>
          {title}
        </Link>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="inline">
      <span className={className} data-wikilink contentEditable={false}>
        {title}
      </span>
    </NodeViewWrapper>
  );
}
