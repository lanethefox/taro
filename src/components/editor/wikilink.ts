import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { WikilinkView } from "./wikilink-view";

export interface WikilinkOptions {
  /** Resolve a title to a page slug, or null if no page exists yet. */
  resolve: (title: string) => string | null;
  /** Whether the host editor is editable (controls click behavior). */
  editable: boolean;
}

/**
 * Inline `[[Title]]` wikilink node (SPEC §4.1). Typing `[[Title]]` converts to
 * an atom carrying the referenced title; the server reads these out of the saved
 * doc JSON to write `links` rows (see `@/lib/links`).
 */
export const Wikilink = Node.create<WikilinkOptions>({
  name: "wikilink",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addOptions() {
    return { resolve: () => null, editable: true };
  },

  addAttributes() {
    return {
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") ?? el.textContent ?? "",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-wikilink]" }, { tag: "span[data-wikilink]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { "data-wikilink": "", class: "wikilink" }),
      String(node.attrs.title ?? ""),
    ];
  },

  renderText({ node }) {
    return `[[${node.attrs.title}]]`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(WikilinkView, { as: "span" });
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\[\[([^\]]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => ({ title: match[1]?.trim() ?? "" }),
      }),
    ];
  },
});
