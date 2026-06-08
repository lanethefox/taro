import { Fragment } from "react";

/**
 * Minimal TipTap-JSON renderer for authored domain content (doc / paragraph /
 * heading / bulletList / listItem / text with bold·italic marks). Read-only.
 */
type Mark = { type: string };
type Node = {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: { level?: number; title?: string };
  content?: Node[];
};

function Inline({ nodes }: { nodes: Node[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.type === "text") {
          let el: React.ReactNode = n.text ?? "";
          for (const m of n.marks ?? []) {
            if (m.type === "bold") el = <strong>{el}</strong>;
            else if (m.type === "italic") el = <em>{el}</em>;
          }
          return <Fragment key={i}>{el}</Fragment>;
        }
        if (n.type === "wikilink") return <strong key={i}>{n.attrs?.title}</strong>;
        return null;
      })}
    </>
  );
}

function Block({ node, k }: { node: Node; k: number }) {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={k} className="text-sm leading-relaxed text-foreground/90">
          <Inline nodes={node.content ?? []} />
        </p>
      );
    case "heading":
      return (
        <h3 key={k} className="mt-4 text-sm font-semibold tracking-tight">
          <Inline nodes={node.content ?? []} />
        </h3>
      );
    case "bulletList":
      return (
        <ul key={k} className="ml-4 list-disc space-y-1 text-sm text-foreground/90">
          {(node.content ?? []).map((li, i) => (
            <li key={i}>
              {(li.content ?? []).map((p, j) => (
                <Inline key={j} nodes={p.content ?? []} />
              ))}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export function DocRender({ doc }: { doc: unknown }) {
  const d = doc as Node | null;
  if (!d || !Array.isArray(d.content)) return null;
  return (
    <div className="space-y-3">
      {d.content.map((node, i) => (
        <Block key={i} node={node} k={i} />
      ))}
    </div>
  );
}
