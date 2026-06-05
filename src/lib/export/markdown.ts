import type { JSONContent } from "@/lib/content";

/**
 * Serialize TipTap document JSON to clean Markdown for LinkedIn copy-paste
 * (SPEC §4.2). Front-matter is never included; images render as Markdown links;
 * `[[wikilinks]]` flatten to their title text (no internal URLs leak out).
 */
export function docToMarkdown(doc: JSONContent | null | undefined): string {
  if (!doc?.content) return "";
  const blocks = doc.content.map((node) => renderBlock(node)).filter((s) => s !== null);
  return (blocks.join("\n\n") as string).replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function renderBlock(node: JSONContent, depth = 0): string | null {
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      return `${"#".repeat(Math.min(Math.max(level, 1), 6))} ${inline(node)}`;
    }
    case "paragraph":
      return inline(node);
    case "blockquote":
      return (node.content ?? [])
        .map((c) => renderBlock(c, depth))
        .filter(Boolean)
        .join("\n\n")
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "bulletList":
      return renderList(node, depth, false);
    case "orderedList":
      return renderList(node, depth, true);
    case "codeBlock": {
      const lang = (node.attrs?.language as string) ?? "";
      return `\`\`\`${lang}\n${textOf(node)}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      return src ? `![${alt}](${src})` : null;
    }
    default:
      // Unknown block: fall back to its inline text if any.
      return node.content ? inline(node) : null;
  }
}

function renderList(node: JSONContent, depth: number, ordered: boolean): string {
  const items = node.content ?? [];
  return items
    .map((item, i) => {
      const marker = ordered ? `${i + 1}.` : "-";
      const indent = "  ".repeat(depth);
      const inner = (item.content ?? [])
        .map((child) =>
          child.type === "bulletList" || child.type === "orderedList"
            ? renderBlock(child, depth + 1)
            : inline(child),
        )
        .filter(Boolean);
      const [first, ...rest] = inner;
      const head = `${indent}${marker} ${first ?? ""}`;
      return rest.length ? `${head}\n${rest.join("\n")}` : head;
    })
    .join("\n");
}

/** Render inline content of a node (text + marks + wikilinks). */
function inline(node: JSONContent): string {
  if (!node.content) return node.text ?? "";
  return node.content
    .map((child) => {
      if (child.type === "text") return applyMarks(child);
      if (child.type === "wikilink") return String(child.attrs?.title ?? "");
      if (child.type === "hardBreak") return "\n";
      return inline(child);
    })
    .join("");
}

function applyMarks(node: JSONContent): string {
  let text = node.text ?? "";
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        text = `**${text}**`;
        break;
      case "italic":
        text = `*${text}*`;
        break;
      case "strike":
        text = `~~${text}~~`;
        break;
      case "code":
        text = `\`${text}\``;
        break;
      case "link": {
        const href = (mark.attrs?.href as string) ?? "";
        text = href ? `[${text}](${href})` : text;
        break;
      }
    }
  }
  return text;
}

function textOf(node: JSONContent): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join("");
}
