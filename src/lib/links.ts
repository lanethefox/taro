import "server-only";

import { and, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { links, pages, type NodeType } from "@/db/schema";
import { extractWikilinkTitles, type JSONContent } from "@/lib/content";
import { resolveOrCreatePageByTitle } from "@/db/queries/pages";

export type Backlink = {
  sourceType: NodeType;
  sourceId: string;
  title: string;
  slug: string;
  context: string | null;
};

/**
 * Reconcile a page's outgoing `[[wikilinks]]` with the `links` table.
 *
 * Extracts wikilink titles from the saved doc, resolves each to a page
 * (creating a stub for "red links" so the graph stays connected), then replaces
 * the page's outgoing links in one pass. Returns the resolved target page ids.
 */
export async function syncPageLinks(
  pageId: string,
  doc: JSONContent | null,
): Promise<string[]> {
  const titles = extractWikilinkTitles(doc);

  // Resolve titles → target page ids (skip self-links).
  const targetIds: string[] = [];
  for (const title of titles) {
    const targetId = await resolveOrCreatePageByTitle(title);
    if (targetId !== pageId && !targetIds.includes(targetId)) {
      targetIds.push(targetId);
    }
  }

  // Replace the page's outgoing page→page links atomically.
  await db.transaction(async (tx) => {
    await tx
      .delete(links)
      .where(
        and(
          eq(links.sourceType, "page"),
          eq(links.sourceId, pageId),
          eq(links.targetType, "page"),
        ),
      );
    if (targetIds.length > 0) {
      await tx
        .insert(links)
        .values(
          targetIds.map((targetId) => ({
            sourceType: "page" as const,
            sourceId: pageId,
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

/** Pages that link *to* the given node ("referenced by"). */
export async function getBacklinks(
  nodeType: NodeType,
  nodeId: string,
): Promise<Backlink[]> {
  return db
    .select({
      sourceType: links.sourceType,
      sourceId: links.sourceId,
      title: pages.title,
      slug: pages.slug,
      context: links.context,
    })
    .from(links)
    .innerJoin(
      pages,
      and(eq(links.sourceType, "page"), eq(pages.id, links.sourceId)),
    )
    .where(and(eq(links.targetType, nodeType), eq(links.targetId, nodeId)));
}

/** Target pages this page links *out* to. */
export async function getOutgoingPageLinks(
  pageId: string,
): Promise<{ id: string; title: string; slug: string }[]> {
  const rows = await db
    .select({ targetId: links.targetId })
    .from(links)
    .where(
      and(
        eq(links.sourceType, "page"),
        eq(links.sourceId, pageId),
        eq(links.targetType, "page"),
      ),
    );
  const ids = rows.map((r) => r.targetId);
  if (ids.length === 0) return [];
  return db
    .select({ id: pages.id, title: pages.title, slug: pages.slug })
    .from(pages)
    .where(inArray(pages.id, ids));
}
