/**
 * Helpers for working with TipTap/ProseMirror document JSON on the server.
 *
 * Content is stored as `jsonb` (SPEC §4.1) so it stays queryable and linkable.
 * These pure walkers power link-graph sync and plain-text previews without
 * pulling the editor into server code.
 */

export type JSONContent = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

/** The node type our wikilink extension emits. */
export const WIKILINK_NODE = "wikilink";

function walk(node: JSONContent | undefined, visit: (n: JSONContent) => void) {
  if (!node) return;
  visit(node);
  node.content?.forEach((child) => walk(child, visit));
}

/** Flatten a doc to plain text (for previews / fallbacks). */
export function extractText(doc: JSONContent | null | undefined): string {
  if (!doc) return "";
  const parts: string[] = [];
  walk(doc, (n) => {
    if (n.type === "text" && n.text) parts.push(n.text);
    if (n.type === WIKILINK_NODE && typeof n.attrs?.title === "string") {
      parts.push(n.attrs.title as string);
    }
  });
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** A short single-line excerpt. */
export function excerpt(doc: JSONContent | null | undefined, max = 200): string {
  const text = extractText(doc);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Distinct wikilink titles referenced in a doc, in document order. */
export function extractWikilinkTitles(
  doc: JSONContent | null | undefined,
): string[] {
  if (!doc) return [];
  const seen = new Set<string>();
  const titles: string[] = [];
  walk(doc, (n) => {
    if (n.type === WIKILINK_NODE && typeof n.attrs?.title === "string") {
      const title = (n.attrs.title as string).trim();
      const key = title.toLowerCase();
      if (title && !seen.has(key)) {
        seen.add(key);
        titles.push(title);
      }
    }
  });
  return titles;
}

/** An empty TipTap document. */
export function emptyDoc(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}
