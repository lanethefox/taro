import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { links, pages, posts, type NodeType } from "@/db/schema";
import { extractWikilinkTitles, type JSONContent } from "@/lib/content";
import { resolveOrCreatePageByTitle } from "@/db/queries/pages";

export type Backlink = {
  sourceType: NodeType;
  sourceId: string;
  title: string;
  href: string;
  context: string | null;
};

/** Route to a node's reader view. */
export function nodeHref(
  type: NodeType,
  slug: string,
  kind?: string | null,
): string {
  switch (type) {
    case "page":
      return `/wiki/${slug}`;
    case "post":
      return kind === "decision" ? `/decisions/${slug}` : `/blog/${slug}`;
    default:
      return "#";
  }
}

/**
 * Reconcile a node's outgoing `[[wikilinks]]` with the `links` table.
 *
 * Works for any source (page or post). Wikilink titles resolve to pages
 * (creating a stub for unresolved "red" links so the graph stays connected),
 * then the source's outgoing page-links are replaced in one transaction.
 * Returns the resolved target page ids.
 */
export async function syncLinks(
  sourceType: NodeType,
  sourceId: string,
  doc: JSONContent | null,
): Promise<string[]> {
  const titles = extractWikilinkTitles(doc);

  const targetIds: string[] = [];
  for (const title of titles) {
    const targetId = await resolveOrCreatePageByTitle(title);
    const isSelf = sourceType === "page" && targetId === sourceId;
    if (!isSelf && !targetIds.includes(targetId)) targetIds.push(targetId);
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(links)
      .where(
        and(
          eq(links.sourceType, sourceType),
          eq(links.sourceId, sourceId),
          eq(links.targetType, "page"),
        ),
      );
    if (targetIds.length > 0) {
      await tx
        .insert(links)
        .values(
          targetIds.map((targetId) => ({
            sourceType,
            sourceId,
            targetType: "page" as const,
            targetId,
          })),
        )
        .onConflictDoNothing();
    }
  });

  return targetIds;
}

/** Remove every link touching a node (either endpoint) — call before deleting. */
export async function removeAllLinksFor(
  nodeType: NodeType,
  nodeId: string,
): Promise<void> {
  await db
    .delete(links)
    .where(
      or(
        and(eq(links.sourceType, nodeType), eq(links.sourceId, nodeId)),
        and(eq(links.targetType, nodeType), eq(links.targetId, nodeId)),
      ),
    );
}

/**
 * Nodes that link *to* the given node ("referenced by"). Resolves source pages
 * and posts to titles + reader hrefs. Private sources are omitted unless
 * `includePrivate` (owner view).
 */
export async function getBacklinks(
  nodeType: NodeType,
  nodeId: string,
  { includePrivate = false }: { includePrivate?: boolean } = {},
): Promise<Backlink[]> {
  const rows = await db
    .select({
      sourceType: links.sourceType,
      sourceId: links.sourceId,
      context: links.context,
    })
    .from(links)
    .where(and(eq(links.targetType, nodeType), eq(links.targetId, nodeId)));

  if (rows.length === 0) return [];

  const pageIds = rows.filter((r) => r.sourceType === "page").map((r) => r.sourceId);
  const postIds = rows.filter((r) => r.sourceType === "post").map((r) => r.sourceId);

  const [pageRows, postRows] = await Promise.all([
    pageIds.length
      ? db
          .select({
            id: pages.id,
            title: pages.title,
            slug: pages.slug,
            visibility: pages.visibility,
          })
          .from(pages)
          .where(inArray(pages.id, pageIds))
      : Promise.resolve([]),
    postIds.length
      ? db
          .select({
            id: posts.id,
            title: posts.title,
            slug: posts.slug,
            kind: posts.kind,
            visibility: posts.visibility,
          })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : Promise.resolve([]),
  ]);

  const out: Backlink[] = [];

  for (const r of rows) {
    if (r.sourceType === "page") {
      const p = pageRows.find((x) => x.id === r.sourceId);
      if (!p) continue;
      if (!includePrivate && p.visibility === "private") continue;
      out.push({
        sourceType: "page",
        sourceId: r.sourceId,
        title: p.title,
        href: nodeHref("page", p.slug),
        context: r.context,
      });
    } else if (r.sourceType === "post") {
      const p = postRows.find((x) => x.id === r.sourceId);
      if (!p) continue;
      if (!includePrivate && p.visibility === "private") continue;
      out.push({
        sourceType: "post",
        sourceId: r.sourceId,
        title: p.title,
        href: nodeHref("post", p.slug, p.kind),
        context: r.context,
      });
    }
  }

  return out.sort((a, b) => a.title.localeCompare(b.title));
}
